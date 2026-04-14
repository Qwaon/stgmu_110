-- ══════════════════════════════════════════════════════════
-- PS Club — полный сетап (безопасно запускать повторно)
-- Supabase Dashboard → SQL Editor → вставить → Run
-- ══════════════════════════════════════════════════════════


-- ── 1. Схема ─────────────────────────────────────────────

create extension if not exists "uuid-ossp";

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
  id          uuid primary key default uuid_generate_v4(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  type        text not null default 'standard' check (type in ('standard', 'vip')),
  status      text not null default 'free' check (status in ('free', 'busy', 'booked')),
  hourly_rate numeric(10,2),
  created_at  timestamptz default now()
);

create table if not exists sessions (
  id                 uuid primary key default uuid_generate_v4(),
  room_id            uuid not null references rooms(id) on delete restrict,
  club_id            uuid not null references clubs(id) on delete restrict,
  client_name        text not null,
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  paused_at          timestamptz,
  paused_duration_ms bigint not null default 0,
  total_minutes      int,
  total_amount       numeric(10,2),
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
  client_name text not null,
  phone       text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
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


-- ── 2. RLS ───────────────────────────────────────────────

alter table clubs      enable row level security;
alter table users      enable row level security;
alter table rooms      enable row level security;
alter table sessions   enable row level security;
alter table orders     enable row level security;
alter table bookings   enable row level security;
alter table menu_items enable row level security;

create or replace function get_my_club_id()
returns uuid language sql security definer stable
as $$ select club_id from users where id = auth.uid() $$;

create or replace function get_my_role()
returns text language sql security definer stable
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

-- rooms
do $$ begin
  create policy "owner_select_all_rooms" on rooms for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_all_own_rooms" on rooms for all using (club_id = get_my_club_id());
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
  create policy "owner_all_menu" on menu_items for select using (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;


-- ── 3. RPC ───────────────────────────────────────────────

create or replace function increment_order_count(item_id uuid, amount int)
returns void language sql security definer as $$
  update menu_items set order_count = order_count + amount where id = item_id;
$$;


-- ── 4. Данные ────────────────────────────────────────────

insert into clubs (id, name, address, hourly_rate) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Sonic — Морозова', 'ул. Морозова', 500),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Sonic — Толстого', 'ул. Толстого', 500)
on conflict (id) do update set name = excluded.name, address = excluded.address;

insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'VIP',    'vip'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP',    'vip'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 4', 'standard')
on conflict do nothing;


-- ── 5. Пользователи ──────────────────────────────────────
-- Запускать ПОСЛЕ создания юзеров в Authentication → Users
-- Заменить <uid-*> на реальные UUID из Auth

-- insert into users (id, email, role, club_id) values
--   ('<uid-owner>',    'owner@sonic.stv',    'owner', null),
--   ('<uid-morozova>', 'morozova@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000001'),
--   ('<uid-tolstogo>', 'tolstogo@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000002')
-- on conflict (id) do update set role = excluded.role, club_id = excluded.club_id;


-- ── 6. Realtime ──────────────────────────────────────────

alter table rooms    replica identity full;
alter table sessions replica identity full;
alter table orders   replica identity full;

do $$ begin
  alter publication supabase_realtime add table rooms, sessions, orders;
exception when duplicate_object then null; end $$;
