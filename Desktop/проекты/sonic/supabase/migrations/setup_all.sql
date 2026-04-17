-- ══════════════════════════════════════════════════════════
-- PS Club — полный сетап (безопасно запускать повторно)
-- Supabase Dashboard → SQL Editor → вставить → Run
-- Синхронизирован с миграциями 0001–0017
-- ══════════════════════════════════════════════════════════


-- ── 1. Расширения ───────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;


-- ── 2. Схема ────────────────────────────────────────────

create table if not exists clubs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  hourly_rate numeric(10,2) not null default 500,
  created_at  timestamptz default now()
);

create table if not exists users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('owner', 'admin')),
  club_id    uuid references clubs(id),
  created_at timestamptz default now()
);

create table if not exists rooms (
  id              uuid primary key default uuid_generate_v4(),
  club_id         uuid not null references clubs(id) on delete cascade,
  name            text not null,
  type            text not null default 'standard' check (type in ('standard', 'vip')),
  status          text not null default 'free' check (status in ('free', 'busy', 'booked')),
  hourly_rate     numeric(10,2),
  first_hour_rate numeric(10,2),
  subsequent_rate numeric(10,2),
  created_at      timestamptz default now()
);

create table if not exists sessions (
  id                 uuid primary key default uuid_generate_v4(),
  room_id            uuid not null references rooms(id) on delete restrict,
  club_id            uuid not null references clubs(id) on delete restrict,
  client_name        text,
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  paused_at          timestamptz,
  paused_duration_ms bigint not null default 0,
  total_minutes      int,
  total_amount       numeric(10,2),
  scheduled_end_at   timestamptz,
  status             text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  created_at         timestamptz default now()
);

create table if not exists orders (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  club_id    uuid not null references clubs(id),
  item_name  text not null,
  price      numeric(10,2) not null,
  quantity   int not null default 1,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id          uuid primary key default uuid_generate_v4(),
  club_id     uuid not null references clubs(id) on delete cascade,
  room_id     uuid not null references rooms(id) on delete cascade,
  client_name text,
  phone       text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  notes       text,
  status      text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at  timestamptz default now()
);

create table if not exists menu_items (
  id          uuid primary key default uuid_generate_v4(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  price       numeric(10,2) not null,
  is_pinned   boolean not null default false,
  order_count int not null default 0,
  created_at  timestamptz default now()
);


-- ── 3. CHECK constraints ────────────────────────────────

do $$ begin
  alter table orders
    add constraint orders_quantity_positive check (quantity > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table orders
    add constraint orders_price_nonnegative check (price >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table rooms
    add constraint rooms_hourly_rate_nonnegative check (hourly_rate is null or hourly_rate >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table rooms
    add constraint rooms_first_hour_rate_nonnegative check (first_hour_rate is null or first_hour_rate >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table rooms
    add constraint rooms_subsequent_rate_nonnegative check (subsequent_rate is null or subsequent_rate >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table sessions
    add constraint sessions_paused_duration_nonnegative check (paused_duration_ms >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table sessions
    add constraint sessions_total_minutes_nonnegative check (total_minutes is null or total_minutes >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table sessions
    add constraint sessions_total_amount_nonnegative check (total_amount is null or total_amount >= 0);
exception when duplicate_object then null; end $$;

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


-- ── 4. Unique / Exclusion constraints ───────────────────

-- One live session per room
create unique index if not exists sessions_one_live_session_per_room_idx
  on sessions (room_id)
  where status in ('active', 'paused');

-- No overlapping active bookings per room
do $$ begin
  alter table bookings
    add constraint bookings_no_overlap_per_room
    exclude using gist (
      room_id with =,
      tstzrange(starts_at, coalesce(ends_at, '2099-12-31T23:59:59.999Z'::timestamptz), '[)') with &&
    )
    where (status = 'active');
exception when duplicate_object then null; end $$;


-- ── 5. Performance indexes ──────────────────────────────

create index if not exists rooms_club_id_name_idx
  on rooms (club_id, name);

create index if not exists sessions_club_status_room_idx
  on sessions (club_id, status, room_id);

create index if not exists sessions_room_status_idx
  on sessions (room_id, status);

create index if not exists idx_sessions_ended_at
  on sessions (ended_at) where ended_at is not null;

create index if not exists bookings_club_status_starts_at_idx
  on bookings (club_id, status, starts_at);

create index if not exists bookings_room_status_starts_at_idx
  on bookings (room_id, status, starts_at);

create index if not exists orders_session_id_idx
  on orders (session_id);

create index if not exists orders_club_id_idx
  on orders (club_id);

create index if not exists menu_items_club_pin_popularity_idx
  on menu_items (club_id, is_pinned desc, order_count desc);

create index if not exists users_club_id_idx
  on users (club_id) where club_id is not null;


-- ── 6. RLS ──────────────────────────────────────────────

alter table clubs      enable row level security;
alter table users      enable row level security;
alter table rooms      enable row level security;
alter table sessions   enable row level security;
alter table orders     enable row level security;
alter table bookings   enable row level security;
alter table menu_items enable row level security;

-- Helper functions (VOLATILE — зависят от auth.uid())
create or replace function get_my_club_id()
returns uuid language sql security definer volatile
set search_path = public, pg_temp
as $$ select club_id from users where id = auth.uid() $$;

create or replace function get_my_role()
returns text language sql security definer volatile
set search_path = public, pg_temp
as $$ select role from users where id = auth.uid() $$;

-- clubs
do $$ begin
  create policy "owner_select_all_clubs" on clubs for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_select_own_club" on clubs for select using (id = get_my_club_id());
exception when duplicate_object then null; end $$;

-- users
do $$ begin
  create policy "select_own_profile" on users for select using (id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "owner_select_all_users" on users for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "deny_insert_users" on users for insert with check (false);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "deny_update_users" on users for update using (false);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "deny_delete_users" on users for delete using (false);
exception when duplicate_object then null; end $$;

-- rooms
do $$ begin
  create policy "owner_select_all_rooms" on rooms for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_all_own_rooms" on rooms for all using (club_id = get_my_club_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "owner_all_rooms" on rooms for all
    using (get_my_role() = 'owner')
    with check (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;

-- sessions
do $$ begin
  create policy "owner_select_all_sessions" on sessions for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_all_own_sessions" on sessions for all using (club_id = get_my_club_id());
exception when duplicate_object then null; end $$;

-- orders
do $$ begin
  create policy "owner_select_all_orders" on orders for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_all_own_orders" on orders for all using (club_id = get_my_club_id());
exception when duplicate_object then null; end $$;

-- bookings
do $$ begin
  create policy "owner_select_all_bookings" on bookings for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_all_own_bookings" on bookings for all using (club_id = get_my_club_id());
exception when duplicate_object then null; end $$;

-- menu_items
do $$ begin
  create policy "admin_own_club_menu" on menu_items for all
    using (club_id = get_my_club_id()) with check (club_id = get_my_club_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "owner_all_menu" on menu_items for all
    using (get_my_role() = 'owner')
    with check (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;


-- ── 7. RPC functions ────────────────────────────────────

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

-- Start session
create or replace function start_session_atomic(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_room_status text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select status into v_room_status
  from rooms
  where id = p_room_id and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  if v_room_status = 'busy' then
    raise exception 'Room already has an active session';
  end if;

  insert into sessions (room_id, club_id, client_name, status)
  values (p_room_id, v_club_id, null, 'active');

  update rooms
  set status = 'busy'
  where id = p_room_id and club_id = v_club_id;
end;
$$;

-- End session (returns billing breakdown as jsonb)
drop function if exists end_session_atomic(uuid, uuid, integer, numeric);
drop function if exists end_session_atomic(uuid, uuid);

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

-- Undo end session
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

-- Pause session
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

-- Resume session
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

-- Cancel booking
create or replace function cancel_booking_atomic(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_room_id uuid;
  v_has_active_booking boolean;
  v_has_live_session boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id into v_room_id
  from bookings
  where id = p_booking_id and club_id = v_club_id and status = 'active'
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  perform 1
  from rooms
  where id = v_room_id and club_id = v_club_id
  for update;

  update bookings
  set status = 'cancelled'
  where id = p_booking_id and club_id = v_club_id;

  select exists (
    select 1
    from bookings
    where room_id = v_room_id
      and club_id = v_club_id
      and status = 'active'
      and (ends_at is null or ends_at >= now())
  ) into v_has_active_booking;

  select exists (
    select 1
    from sessions
    where room_id = v_room_id
      and club_id = v_club_id
      and status in ('active', 'paused')
  ) into v_has_live_session;

  update rooms
  set status = case
    when v_has_live_session then 'busy'
    when v_has_active_booking then 'booked'
    else 'free'
  end
  where id = v_room_id and club_id = v_club_id;

  return v_room_id;
end;
$$;

-- Check-in booking
create or replace function check_in_booking_atomic(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_room_id uuid;
  v_ends_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id, ends_at into v_room_id, v_ends_at
  from bookings
  where id = p_booking_id and club_id = v_club_id and status = 'active'
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  perform 1
  from rooms
  where id = v_room_id and club_id = v_club_id
  for update;

  insert into sessions (room_id, club_id, client_name, status, scheduled_end_at)
  values (v_room_id, v_club_id, null, 'active', v_ends_at);

  update bookings
  set status = 'completed'
  where id = p_booking_id and club_id = v_club_id;

  update rooms
  set status = 'busy'
  where id = v_room_id and club_id = v_club_id;

  return v_room_id;
end;
$$;

-- Dashboard payload (rooms + sessions + orders + bookings + menu)
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

-- Shift summary
create or replace function get_shift_summary_payload(p_club_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_role text := get_my_role();
  v_my_club_id uuid := get_my_club_id();
  v_start timestamptz;
  v_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if v_role <> 'owner' and v_my_club_id <> p_club_id then
    raise exception 'Forbidden';
  end if;

  v_start := date_trunc('day', now());
  v_end := v_start + interval '1 day' - interval '1 millisecond';

  return (
    with session_rows as (
      select
        s.id,
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
      where s.club_id = p_club_id
        and s.status = 'completed'
        and s.ended_at >= v_start
        and s.ended_at <= v_end
      order by s.ended_at
    )
    select jsonb_build_object(
      'sessions',
      coalesce((
        select jsonb_agg(to_jsonb(session_rows))
        from session_rows
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- Clubs overview (owner)
create or replace function get_clubs_overview()
returns jsonb
language sql
security definer
volatile
set search_path = public, pg_temp
as $$
  with
    day_start  as (select (current_date at time zone 'UTC') as ts),
    week_start as (select ((current_date - 6) at time zone 'UTC') as ts),
    month_start as (select (date_trunc('month', current_date) at time zone 'UTC') as ts),

    room_counts as (
      select club_id,
        count(*) filter (where status = 'free')   as free,
        count(*) filter (where status = 'busy')   as busy,
        count(*) filter (where status = 'booked') as booked
      from rooms
      group by club_id
    ),

    active_counts as (
      select club_id, count(*) as cnt
      from sessions
      where status in ('active', 'paused')
      group by club_id
    ),

    revenue as (
      select
        s.club_id,
        coalesce(sum(s.total_amount) filter (
          where s.ended_at >= (select ts from day_start)
        ), 0) as revenue_today,
        coalesce(sum(s.total_amount) filter (
          where s.ended_at >= (select ts from week_start)
        ), 0) as revenue_week,
        coalesce(sum(s.total_amount), 0) as revenue_month,
        count(*) filter (
          where s.ended_at >= (select ts from day_start)
        ) as sessions_today,
        avg(s.total_minutes) filter (
          where s.ended_at >= (select ts from day_start) and s.total_minutes is not null
        ) as avg_duration_today
      from sessions s
      where s.status = 'completed'
        and s.ended_at >= (select ts from month_start)
      group by s.club_id
    )

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'club', to_jsonb(c),
      'rooms', jsonb_build_object(
        'free',   coalesce(rc.free, 0),
        'busy',   coalesce(rc.busy, 0),
        'booked', coalesce(rc.booked, 0)
      ),
      'activeSessions',      coalesce(ac.cnt, 0),
      'revenueToday',        coalesce(rev.revenue_today, 0),
      'revenueWeek',         coalesce(rev.revenue_week, 0),
      'revenueMonth',        coalesce(rev.revenue_month, 0),
      'sessionsToday',       coalesce(rev.sessions_today, 0),
      'averageDurationToday', case
        when rev.avg_duration_today is not null then round(rev.avg_duration_today)
        else null
      end
    )
    order by c.name
  ), '[]'::jsonb)
  from clubs c
  left join room_counts rc on rc.club_id = c.id
  left join active_counts ac on ac.club_id = c.id
  left join revenue rev on rev.club_id = c.id;
$$;

-- Owner analytics
create or replace function get_owner_analytics(p_days int default 30)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_since timestamptz;
  v_result jsonb;
begin
  v_since := (current_date - p_days) at time zone 'UTC';

  select jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object('club_id', sub.club_id, 'day', sub.day, 'revenue', sub.revenue)
        order by sub.day, sub.club_id
      )
      from (
        select
          s.club_id,
          to_char(s.ended_at at time zone 'UTC', 'DD.MM') as day,
          coalesce(sum(s.total_amount), 0) as revenue
        from sessions s
        where s.status = 'completed'
          and s.ended_at >= v_since
        group by s.club_id, to_char(s.ended_at at time zone 'UTC', 'DD.MM')
      ) sub
    ), '[]'::jsonb),

    'heatmap', coalesce((
      select jsonb_agg(
        jsonb_build_object('dow', sub.dow, 'hour', sub.hr, 'count', sub.cnt)
        order by sub.dow, sub.hr
      )
      from (
        select
          extract(dow from s.started_at at time zone 'UTC')::int as dow,
          extract(hour from s.started_at at time zone 'UTC')::int as hr,
          count(*) as cnt
        from sessions s
        where s.status = 'completed'
          and s.ended_at >= v_since
        group by 1, 2
      ) sub
    ), '[]'::jsonb),

    'summary', (
      select jsonb_build_object(
        'sessionCount', count(*),
        'totalRevenue', coalesce(sum(s.total_amount), 0),
        'averageCheck', case when count(*) > 0
          then round(sum(s.total_amount) / count(*), 2) else null end,
        'averageDuration', case when count(*) filter (where s.total_minutes is not null) > 0
          then round(avg(s.total_minutes) filter (where s.total_minutes is not null))
          else null end
      )
      from sessions s
      where s.status = 'completed'
        and s.ended_at >= v_since
    ),

    'sessions_for_export', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'club_id', s.club_id,
          'ended_at', s.ended_at,
          'total_minutes', s.total_minutes,
          'total_amount', s.total_amount
        )
        order by s.ended_at
      )
      from sessions s
      where s.status = 'completed'
        and s.ended_at >= v_since
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;


-- ── 8. Triggers ─────────────────────────────────────────

-- Prevent bookings in the past
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


-- ── 9. Realtime ─────────────────────────────────────────

alter table rooms    replica identity full;
alter table sessions replica identity full;
alter table orders   replica identity full;
alter table bookings replica identity full;

do $$ begin
  alter publication supabase_realtime add table rooms, sessions, orders, bookings;
exception when duplicate_object then null; end $$;


-- ── 10. Seed data ───────────────────────────────────────

insert into clubs (id, name, address, hourly_rate) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Sonic — Морозова', 'ул. Морозова', 500),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Sonic — Толстого', 'ул. Толстого', 500)
on conflict (id) do update set name = excluded.name, address = excluded.address;

insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 4', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 6', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 7', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 8', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 4', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 6', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 7', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 8', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 1', 'vip'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 2', 'vip'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 3', 'vip')
on conflict do nothing;

-- Seed default tiered rates for rooms that lack them
update rooms set
  first_hour_rate = case when type = 'vip' then 350 else 250 end,
  subsequent_rate = case when type = 'vip' then 300 else 200 end
where first_hour_rate is null or subsequent_rate is null;


-- ── 11. Пользователи ────────────────────────────────────
-- Запускать ПОСЛЕ создания юзеров в Authentication → Users
-- Заменить <uid-*> на реальные UUID из Auth

-- insert into users (id, email, role, club_id) values
--   ('<uid-owner>',    'owner@sonic.stv',    'owner', null),
--   ('<uid-morozova>', 'morozova@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000001'),
--   ('<uid-tolstogo>', 'tolstogo@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000002')
-- on conflict (id) do update set role = excluded.role, club_id = excluded.club_id;
