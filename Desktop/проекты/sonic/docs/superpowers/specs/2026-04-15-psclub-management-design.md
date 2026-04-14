# PS Club Management System — Design Spec
**Date:** 2026-04-15  
**Stack:** Next.js 14 (App Router) · Supabase (PostgreSQL + Realtime + Auth) · Vercel  
**Theme:** Dark (#1a1a2e base, #352F73 accent)

---

## 1. Overview

Web-based admin tool for managing a PlayStation gaming club network. Two independent club locations under one owner. Each club has one admin who sees only their club. The owner sees both clubs and overall analytics.

---

## 2. Roles & Access

| Role    | Access                                      |
|---------|---------------------------------------------|
| `owner` | All clubs — overview, analytics, settings   |
| `admin` | Single club (`club_id`) — rooms, sessions, bookings, orders |

Auth: Supabase Auth (email + password). Row-Level Security (RLS) on all tables — admin queries automatically scoped to their `club_id`.

---

## 3. Architecture

```
Next.js 14 App Router (Vercel)
├── /login                        — shared login page
├── /dashboard                    — admin view (scoped to club)
│   ├── /rooms                    — room cards grid + live timers
│   ├── /bookings                 — booking list + create booking
│   └── /orders                   — add/view orders per session
└── /owner                        — owner-only panel
    ├── /clubs                    — live overview of both clubs
    └── /analytics                — revenue, sessions, popular hours
```

**Realtime:** Supabase Realtime subscriptions on `rooms` and `sessions` tables — any change by one admin is instantly reflected without page reload.

---

## 4. Database Schema

```sql
-- Clubs
clubs (
  id uuid PK,
  name text,
  address text,
  hourly_rate numeric,        -- default tariff, overridable per room
  created_at timestamptz
)

-- Rooms / Booths
rooms (
  id uuid PK,
  club_id uuid FK → clubs,
  name text,                  -- "Room 1", "VIP", etc.
  type text,                  -- standard | vip
  status text,                -- free | busy | booked
  hourly_rate numeric,        -- overrides club default if set
  created_at timestamptz
)

-- Sessions (active playtime)
sessions (
  id uuid PK,
  room_id uuid FK → rooms,
  club_id uuid FK → clubs,    -- denormalized for fast RLS
  client_name text,
  started_at timestamptz,
  ended_at timestamptz,       -- null while active
  paused_at timestamptz,      -- null if not paused
  paused_duration interval,   -- total accumulated pause time
  total_minutes int,          -- calculated on end
  total_amount numeric,       -- calculated on end
  status text,                -- active | paused | completed
  created_at timestamptz
)

-- Orders (food/drinks per session)
orders (
  id uuid PK,
  session_id uuid FK → sessions,
  club_id uuid FK → clubs,
  item_name text,
  price numeric,
  quantity int,
  created_at timestamptz
)

-- Bookings
bookings (
  id uuid PK,
  club_id uuid FK → clubs,
  room_id uuid FK → rooms,
  client_name text,
  phone text,
  starts_at timestamptz,
  ends_at timestamptz,
  notes text,
  status text,                -- active | completed | cancelled
  created_at timestamptz
)

-- Users (linked to Supabase Auth)
users (
  id uuid PK = auth.uid(),
  email text,
  role text,                  -- owner | admin
  club_id uuid FK → clubs,    -- null for owner
  created_at timestamptz
)
```

---

## 5. Key Features

### Dashboard (Admin)
- Grid of room cards — status color-coded (green/red/yellow)
- Each card: room name, client name, live timer, quick actions
- One-click: Start Session, End Session, Add Order, View Details
- Booking badge on card if room is booked next

### Session Management
- Start: enter client name → timer begins
- Pause/Resume: stops billing clock
- End: auto-calculates time × tariff + orders total → show invoice
- Auto-end: optional countdown timer (e.g., booked for 2h → auto-alert)

### Booking
- Calendar + time picker
- Room selector (shows conflicts)
- Auto-converts booking → session when admin clicks "Check In"

### Owner Panel
- Side-by-side club cards with live room statuses
- Revenue today / this week / this month per club
- Session count, avg duration, peak hours chart

### Non-obvious Admin UX wins
- **Quick-start modal**: tap room card → modal with client name field → one tap starts session (2 clicks total)
- **Countdown alert**: 15 min before session time runs out (if booked), card pulses
- **Order shortcuts**: most-used items pinned at top of order list
- **Shift summary**: end-of-day button generates printable/shareable daily report
- **Undo last action**: 10-second undo toast after ending a session

---

## 6. Scaling Ideas (post-MVP)
- Multi-club expansion: just add rows to `clubs`, assign new admin
- Loyalty system: `clients` table, visit count, discounts
- Analytics: revenue heatmaps, room utilization %, staff performance
- Mobile app: same Supabase backend, React Native frontend

---

## 7. Out of Scope (MVP)
- Payment processing (cash-only at counter)
- SMS/email notifications to clients
- Hardware integrations (door locks, displays)
