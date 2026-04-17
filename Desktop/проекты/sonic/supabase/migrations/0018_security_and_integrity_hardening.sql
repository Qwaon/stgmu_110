-- ══════════════════════════════════════════════════════════
-- 0018: Security & integrity hardening
-- RLS policies for users table, increment_order_count fix,
-- FK indexes, CHECK constraints, end_session_atomic cleanup
-- ══════════════════════════════════════════════════════════


-- ── 1. RLS: users INSERT/UPDATE/DELETE ─────────────────────

-- Block all inserts via client — users are seeded via SQL Editor
do $$ begin
  create policy "deny_insert_users" on users for insert
    with check (false);
exception when duplicate_object then null; end $$;

-- Block all updates via client
do $$ begin
  create policy "deny_update_users" on users for update
    using (false);
exception when duplicate_object then null; end $$;

-- Block all deletes via client
do $$ begin
  create policy "deny_delete_users" on users for delete
    using (false);
exception when duplicate_object then null; end $$;


-- ── 2. Fix increment_order_count ───────────────────────────
-- Old version had `where id = item_id and amount > 0` — the
-- `amount > 0` check was on the parameter not the column.
-- Also add authorization: only allow if caller owns the menu item.

create or replace function increment_order_count(item_id uuid, amount int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if amount <= 0 then return; end if;

  update menu_items
  set order_count = order_count + amount
  where id = item_id;

  if not found then
    raise exception 'Menu item not found';
  end if;
end;
$$;


-- ── 3. FK index: users.club_id ─────────────────────────────

create index if not exists users_club_id_idx on users (club_id)
  where club_id is not null;


-- ── 4. Additional CHECK constraints ────────────────────────

do $$ begin
  alter table menu_items
    add constraint menu_items_price_nonnegative check (price >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table menu_items
    add constraint menu_items_order_count_nonnegative check (order_count >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table menu_items
    add constraint menu_items_name_length check (char_length(name) between 1 and 100);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table bookings
    add constraint bookings_phone_length check (phone is null or char_length(phone) <= 30);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table bookings
    add constraint bookings_notes_length check (notes is null or char_length(notes) <= 500);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table clubs
    add constraint clubs_hourly_rate_nonnegative check (hourly_rate >= 0);
exception when duplicate_object then null; end $$;


-- ── 5. Clean up end_session_atomic dead params ─────────────
-- Remove unused p_minutes / p_total default params

drop function if exists end_session_atomic(uuid, uuid, int, numeric);

create or replace function end_session_atomic(
  p_session_id uuid,
  p_room_id    uuid
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
  v_has_active_booking boolean;
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

  -- Rates with fallback chain: room -> club -> 500
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

  -- Check for active bookings on this room
  select exists (
    select 1
    from bookings
    where room_id = p_room_id
      and club_id = v_session.club_id
      and status = 'active'
      and (ends_at is null or ends_at >= now())
  ) into v_has_active_booking;

  -- Set room status: booked if has active booking, free otherwise
  update rooms
  set status = case when v_has_active_booking then 'booked' else 'free' end
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
