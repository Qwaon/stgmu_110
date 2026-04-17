create extension if not exists btree_gist;

-- Prevent multiple active/paused sessions for the same room.
create unique index if not exists sessions_one_live_session_per_room_idx
  on sessions (room_id)
  where status in ('active', 'paused');

-- Prevent overlapping active bookings for the same room, including open-ended ones.
alter table bookings
  add constraint bookings_no_overlap_per_room
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, coalesce(ends_at, '2099-12-31T23:59:59.999Z'::timestamptz), '[)') with &&
  )
  where (status = 'active');

-- Basic numeric guards for operational data.
alter table orders
  add constraint orders_quantity_positive check (quantity > 0),
  add constraint orders_price_nonnegative check (price >= 0);

alter table rooms
  add constraint rooms_hourly_rate_nonnegative check (hourly_rate is null or hourly_rate >= 0),
  add constraint rooms_first_hour_rate_nonnegative check (first_hour_rate is null or first_hour_rate >= 0),
  add constraint rooms_subsequent_rate_nonnegative check (subsequent_rate is null or subsequent_rate >= 0);

alter table sessions
  add constraint sessions_paused_duration_nonnegative check (paused_duration_ms >= 0),
  add constraint sessions_total_minutes_nonnegative check (total_minutes is null or total_minutes >= 0),
  add constraint sessions_total_amount_nonnegative check (total_amount is null or total_amount >= 0);

-- SECURITY DEFINER functions should use a fixed search_path.
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
