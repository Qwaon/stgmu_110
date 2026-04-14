-- Enable Row Level Security on all tables
alter table clubs    enable row level security;
alter table users    enable row level security;
alter table rooms    enable row level security;
alter table sessions enable row level security;
alter table orders   enable row level security;
alter table bookings enable row level security;

-- Helper functions (security definer = run as table owner, bypasses RLS internally)
create or replace function get_my_club_id()
returns uuid language sql security definer stable
as $$ select club_id from users where id = auth.uid() $$;

create or replace function get_my_role()
returns text language sql security definer stable
as $$ select role from users where id = auth.uid() $$;

-- clubs
create policy "owner_select_all_clubs" on clubs for select
  using (get_my_role() = 'owner');
create policy "admin_select_own_club" on clubs for select
  using (id = get_my_club_id());

-- users
create policy "select_own_profile" on users for select
  using (id = auth.uid());
create policy "owner_select_all_users" on users for select
  using (get_my_role() = 'owner');

-- rooms: owner reads all, admin has full access to their club
create policy "owner_select_all_rooms" on rooms for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_rooms" on rooms for all
  using (club_id = get_my_club_id());

-- sessions: owner reads all, admin has full access to their club
create policy "owner_select_all_sessions" on sessions for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_sessions" on sessions for all
  using (club_id = get_my_club_id());

-- orders: owner reads all, admin has full access to their club
create policy "owner_select_all_orders" on orders for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_orders" on orders for all
  using (club_id = get_my_club_id());

-- bookings: owner reads all, admin has full access to their club
create policy "owner_select_all_bookings" on bookings for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_bookings" on bookings for all
  using (club_id = get_my_club_id());
