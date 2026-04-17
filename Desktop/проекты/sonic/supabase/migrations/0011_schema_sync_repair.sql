-- Repair migration for environments created from early schema/setup scripts.
-- Safe to run on an existing Supabase project to align DB shape with current code.

create extension if not exists btree_gist;

-- Nullable fields introduced later in the project.
alter table sessions alter column client_name drop not null;
alter table bookings alter column client_name drop not null;
alter table bookings alter column ends_at drop not null;

-- Columns added after the initial schema.
alter table sessions
  add column if not exists scheduled_end_at timestamptz;

alter table rooms
  add column if not exists first_hour_rate numeric(10,2),
  add column if not exists subsequent_rate numeric(10,2);

update rooms
set
  first_hour_rate = coalesce(first_hour_rate, case when type = 'vip' then 350 else 250 end),
  subsequent_rate = coalesce(subsequent_rate, case when type = 'vip' then 300 else 200 end)
where first_hour_rate is null or subsequent_rate is null;

-- Integrity and performance hardening expected by the current app code.
create unique index if not exists sessions_one_live_session_per_room_idx
  on sessions (room_id)
  where status in ('active', 'paused');

do $$
begin
  alter table bookings
    add constraint bookings_no_overlap_per_room
    exclude using gist (
      room_id with =,
      tstzrange(starts_at, coalesce(ends_at, '2099-12-31T23:59:59.999Z'::timestamptz), '[)') with &&
    )
    where (status = 'active');
exception
  when duplicate_object then null;
end $$;

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

create index if not exists rooms_club_id_name_idx
  on rooms (club_id, name);

create index if not exists sessions_club_status_room_idx
  on sessions (club_id, status, room_id);

create index if not exists sessions_room_status_idx
  on sessions (room_id, status);

create index if not exists bookings_club_status_starts_at_idx
  on bookings (club_id, status, starts_at);

create index if not exists bookings_room_status_starts_at_idx
  on bookings (room_id, status, starts_at);

create index if not exists orders_session_id_idx
  on orders (session_id);

create index if not exists menu_items_club_pin_popularity_idx
  on menu_items (club_id, is_pinned desc, order_count desc);

-- Recreate functions in their current secure form.
create or replace function get_my_club_id()
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$ select club_id from users where id = auth.uid() $$;

create or replace function get_my_role()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$ select role from users where id = auth.uid() $$;

create or replace function increment_order_count(item_id uuid, amount int)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update menu_items
  set order_count = order_count + amount
  where id = item_id and amount > 0;
$$;

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

create or replace function end_session_atomic(
  p_session_id uuid,
  p_room_id uuid,
  p_minutes int,
  p_total numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_session_status text;
  v_session_room_id uuid;
  v_has_active_booking boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id, status into v_session_room_id, v_session_status
  from sessions
  where id = p_session_id and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_session_room_id <> p_room_id then
    raise exception 'Session does not belong to the specified room';
  end if;

  if v_session_status not in ('active', 'paused') then
    raise exception 'Session is already completed';
  end if;

  perform 1
  from rooms
  where id = p_room_id and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  update sessions
  set ended_at = now(),
      status = 'completed',
      total_minutes = p_minutes,
      total_amount = p_total
  where id = p_session_id and club_id = v_club_id;

  select exists (
    select 1
    from bookings
    where room_id = p_room_id
      and club_id = v_club_id
      and status = 'active'
      and (ends_at is null or ends_at >= now())
  ) into v_has_active_booking;

  update rooms
  set status = case when v_has_active_booking then 'booked' else 'free' end
  where id = p_room_id and club_id = v_club_id;
end;
$$;

create or replace function undo_end_session_atomic(p_session_id uuid, p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_session_status text;
  v_session_room_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id, status into v_session_room_id, v_session_status
  from sessions
  where id = p_session_id and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_session_room_id <> p_room_id then
    raise exception 'Session does not belong to the specified room';
  end if;

  if v_session_status <> 'completed' then
    raise exception 'Only completed sessions can be restored';
  end if;

  perform 1
  from rooms
  where id = p_room_id and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  update sessions
  set ended_at = null,
      status = 'active',
      total_minutes = null,
      total_amount = null
  where id = p_session_id and club_id = v_club_id;

  update rooms
  set status = 'busy'
  where id = p_room_id and club_id = v_club_id;
end;
$$;

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
