-- ══════════════════════════════════════════════════════════
-- Fix: ensure tiered rate columns exist and have values;
--       fix undo_end_session_atomic to clear paused_at;
--       fix resume_session to be atomic (FOR UPDATE);
--       change STABLE → VOLATILE on auth-dependent functions;
--       add past-date check for bookings
-- ══════════════════════════════════════════════════════════

-- 1. Ensure tiered rate columns exist
alter table rooms
  add column if not exists first_hour_rate numeric(10,2),
  add column if not exists subsequent_rate numeric(10,2);

-- Populate null rates with defaults based on room type
update rooms set
  first_hour_rate = coalesce(first_hour_rate, case when type = 'vip' then 350 else 250 end),
  subsequent_rate = coalesce(subsequent_rate, case when type = 'vip' then 300 else 200 end)
where first_hour_rate is null or subsequent_rate is null;


-- 2. Fix undo_end_session_atomic — clear paused_at on restore
create or replace function undo_end_session_atomic(
  p_session_id uuid,
  p_room_id    uuid
)
returns void
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid;
begin
  select club_id into v_club_id
  from sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  update sessions
  set ended_at      = null,
      status        = 'active',
      total_minutes = null,
      total_amount  = null,
      paused_at     = null
  where id = p_session_id
    and status = 'completed';

  if not found then
    raise exception 'Session is not completed';
  end if;

  update rooms set status = 'busy'
  where id = p_room_id
    and club_id = v_club_id;
end;
$$;


-- 3. Atomic resume_session — prevents race condition with FOR UPDATE
create or replace function resume_session_atomic(p_session_id uuid)
returns void
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_paused_at          timestamptz;
  v_paused_duration_ms bigint;
  v_additional_ms      bigint;
begin
  select paused_at, paused_duration_ms
  into v_paused_at, v_paused_duration_ms
  from sessions
  where id = p_session_id
    and status = 'paused'
  for update;

  if not found then
    raise exception 'Session is not paused';
  end if;

  v_additional_ms := extract(epoch from (now() - v_paused_at)) * 1000;

  update sessions
  set status            = 'active',
      paused_at         = null,
      paused_duration_ms = v_paused_duration_ms + v_additional_ms
  where id = p_session_id;
end;
$$;


-- 4. Atomic pause_session — returns error if session not active
create or replace function pause_session_atomic(p_session_id uuid)
returns void
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
begin
  update sessions
  set status    = 'paused',
      paused_at = now()
  where id = p_session_id
    and status = 'active';

  if not found then
    raise exception 'Session is not active (may have been ended concurrently)';
  end if;
end;
$$;


-- 5. Fix end_session_atomic — compute billing inside DB with FOR UPDATE
-- Must drop first: return type changed from void → jsonb
drop function if exists end_session_atomic(uuid, uuid, integer, numeric);
drop function if exists end_session_atomic(uuid, uuid);
create or replace function end_session_atomic(
  p_session_id uuid,
  p_room_id    uuid,
  p_minutes    int default null,
  p_total      numeric default null
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_session        record;
  v_room           record;
  v_club           record;
  v_elapsed_ms     bigint;
  v_minutes        int;
  v_first_rate     numeric;
  v_sub_rate       numeric;
  v_session_amount numeric;
  v_orders_total   numeric;
  v_total          numeric;
begin
  -- Lock session row
  select * into v_session
  from sessions
  where id = p_session_id
    and status in ('active', 'paused')
  for update;

  if not found then
    raise exception 'Session not found or already completed';
  end if;

  -- Get room rates
  select first_hour_rate, subsequent_rate, hourly_rate, club_id
  into v_room
  from rooms
  where id = p_room_id;

  -- Get club fallback rate
  select hourly_rate into v_club
  from clubs
  where id = v_session.club_id;

  -- Compute elapsed time in ms
  v_elapsed_ms := extract(epoch from (now() - v_session.started_at)) * 1000
                  - v_session.paused_duration_ms;

  -- If currently paused, subtract current pause duration
  if v_session.paused_at is not null then
    v_elapsed_ms := v_elapsed_ms - (extract(epoch from (now() - v_session.paused_at)) * 1000);
  end if;

  if v_elapsed_ms < 0 then v_elapsed_ms := 0; end if;

  -- Minutes rounded up
  v_minutes := ceil(v_elapsed_ms / 60000.0);
  if v_minutes < 0 then v_minutes := 0; end if;

  -- Rates with fallback chain: room → club → 500
  v_first_rate := coalesce(v_room.first_hour_rate, v_club.hourly_rate, 500);
  v_sub_rate   := coalesce(v_room.subsequent_rate, v_club.hourly_rate, 500);

  -- Tiered pricing
  if v_minutes <= 0 then
    v_session_amount := 0;
  elsif v_minutes <= 60 then
    v_session_amount := round((v_minutes / 60.0) * v_first_rate, 2);
  else
    v_session_amount := round(v_first_rate + ((v_minutes - 60) / 60.0) * v_sub_rate, 2);
  end if;

  -- Orders total
  select coalesce(sum(price * quantity), 0)
  into v_orders_total
  from orders
  where session_id = p_session_id;

  v_total := round(v_session_amount + v_orders_total, 2);

  -- Update session
  update sessions
  set status        = 'completed',
      ended_at      = now(),
      total_minutes = v_minutes,
      total_amount  = v_total
  where id = p_session_id;

  -- Free the room
  update rooms set status = 'free'
  where id = p_room_id
    and club_id = v_session.club_id;

  return jsonb_build_object(
    'minutes', v_minutes,
    'sessionAmount', v_session_amount,
    'ordersTotal', v_orders_total,
    'total', v_total
  );
end;
$$;


-- 6. Change STABLE → VOLATILE on auth-dependent helper functions
create or replace function get_my_club_id()
returns uuid language sql security definer volatile
as $$ select club_id from users where id = auth.uid() $$;

create or replace function get_my_role()
returns text language sql security definer volatile
as $$ select role from users where id = auth.uid() $$;

-- Recreate dashboard payload as VOLATILE
create or replace function get_rooms_dashboard_payload()
returns jsonb
language sql
security definer
volatile
set search_path = public, pg_temp
as $$
  with auth_ctx as (
    select get_my_club_id() as club_id
  )
  select jsonb_build_object(
    'club_id', auth_ctx.club_id,
    'club_hourly_rate', (
      select c.hourly_rate
      from clubs c
      where c.id = auth_ctx.club_id
    ),
    'rooms', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.name)
      from rooms r
      where r.club_id = auth_ctx.club_id
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'room_id', s.room_id,
          'club_id', s.club_id,
          'client_name', s.client_name,
          'started_at', s.started_at,
          'ended_at', s.ended_at,
          'paused_at', s.paused_at,
          'paused_duration_ms', s.paused_duration_ms,
          'total_minutes', s.total_minutes,
          'total_amount', s.total_amount,
          'status', s.status,
          'scheduled_end_at', s.scheduled_end_at,
          'created_at', s.created_at,
          'orders', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', o.id,
                'session_id', o.session_id,
                'club_id', o.club_id,
                'item_name', o.item_name,
                'price', o.price,
                'quantity', o.quantity,
                'created_at', o.created_at
              )
              order by o.created_at
            )
            from orders o
            where o.session_id = s.id
          ), '[]'::jsonb)
        )
        order by s.started_at desc
      )
      from sessions s
      where s.club_id = auth_ctx.club_id
        and s.status in ('active', 'paused')
    ), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.starts_at)
      from bookings b
      where b.club_id = auth_ctx.club_id
        and b.status = 'active'
        and (b.ends_at is null or b.ends_at >= now())
    ), '[]'::jsonb),
    'menu_items', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.is_pinned desc, m.order_count desc)
      from menu_items m
      where m.club_id = auth_ctx.club_id
    ), '[]'::jsonb)
  )
  from auth_ctx;
$$;

-- Recreate shift summary as VOLATILE
create or replace function get_shift_summary_payload(p_club_id uuid)
returns jsonb
language sql
security definer
volatile
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'room_name',    s.room_name,
        'client_name',  s.client_name,
        'started_at',   s.started_at,
        'ended_at',     s.ended_at,
        'total_minutes', s.total_minutes,
        'total_amount', s.total_amount,
        'orders_total', s.orders_total
      )
      order by s.ended_at desc
    ),
    '[]'::jsonb
  )
  from (
    select
      r.name as room_name,
      s.client_name,
      s.started_at,
      s.ended_at,
      s.total_minutes,
      s.total_amount,
      coalesce((
        select sum(o.price * o.quantity)
        from orders o
        where o.session_id = s.id
      ), 0) as orders_total
    from sessions s
    join rooms r on r.id = s.room_id
    where s.club_id = p_club_id
      and s.status = 'completed'
      and s.ended_at >= (current_date at time zone 'UTC')
  ) s;
$$;


-- 7. Validate bookings not in the past — trigger on INSERT only
--    (CHECK constraint fails on existing rows; trigger skips them)
create or replace function check_booking_not_in_past()
returns trigger
language plpgsql
as $$
begin
  if NEW.starts_at < now() - interval '5 minutes' then
    raise exception 'Cannot create a booking in the past';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_booking_not_in_past on bookings;
create trigger trg_booking_not_in_past
  before insert on bookings
  for each row
  execute function check_booking_not_in_past();
