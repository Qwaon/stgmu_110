create extension if not exists "uuid-ossp";

-- Clubs (each physical location)
create table clubs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  hourly_rate numeric(10,2) not null default 500,
  created_at  timestamptz default now()
);

-- Users (linked to Supabase Auth)
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('owner', 'admin')),
  club_id    uuid references clubs(id),
  created_at timestamptz default now()
);

-- Rooms / booths inside a club
create table rooms (
  id          uuid primary key default uuid_generate_v4(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  type        text not null default 'standard' check (type in ('standard', 'vip')),
  status      text not null default 'free' check (status in ('free', 'busy', 'booked')),
  hourly_rate numeric(10,2),        -- overrides club default when set
  created_at  timestamptz default now()
);

-- Sessions (active play time)
create table sessions (
  id                 uuid primary key default uuid_generate_v4(),
  room_id            uuid not null references rooms(id) on delete restrict,
  club_id            uuid not null references clubs(id) on delete restrict,
  client_name        text not null,
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  paused_at          timestamptz,              -- when current pause started
  paused_duration_ms bigint not null default 0, -- total accumulated pause time (ms)
  total_minutes      int,
  total_amount       numeric(10,2),
  status             text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  created_at         timestamptz default now()
);

-- Orders (food/drinks added to a session)
create table orders (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  club_id    uuid not null references clubs(id),
  item_name  text not null,
  price      numeric(10,2) not null,
  quantity   int not null default 1,
  created_at timestamptz default now()
);

-- Bookings (advance reservations)
create table bookings (
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
