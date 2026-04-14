# PS Club Admin — Phase 0 + Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build foundation (auth, DB, Supabase RLS) + admin dashboard (room grid, live timers, session start/pause/end with auto-billing) for a PlayStation game club.

**Architecture:** Next.js 14 App Router — Server Components fetch initial data, Client Components handle timers + modals, Server Actions mutate data. Supabase Realtime pushes room/session changes to all connected clients. RLS scopes every query to the user's `club_id` automatically.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `@supabase/supabase-js` v2, `@supabase/ssr`, Vitest, `@testing-library/react`

---

## File Map

```
src/
├── app/
│   ├── globals.css                     — dark theme CSS variables
│   ├── layout.tsx                      — root layout
│   ├── page.tsx                        — redirects to /login
│   ├── login/page.tsx                  — login form (client)
│   ├── dashboard/
│   │   ├── layout.tsx                  — sidebar + header
│   │   ├── page.tsx                    — redirects to /dashboard/rooms
│   │   └── rooms/
│   │       ├── page.tsx                — server component: fetches rooms+sessions
│   │       └── actions.ts              — server actions: start/end/pause/resume
│   └── owner/page.tsx                  — placeholder
├── components/
│   ├── RoomGrid.tsx                    — client, manages realtime state
│   ├── RoomCard.tsx                    — single room card
│   ├── SessionTimer.tsx                — live elapsed timer
│   ├── StartSessionModal.tsx           — modal: enter client name
│   ├── EndSessionModal.tsx             — modal: invoice + confirm
│   └── UndoToast.tsx                   — 10s undo after session end
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   — browser client
│   │   └── server.ts                   — server client (cookies)
│   ├── types.ts                        — all TypeScript types
│   └── session.ts                      — billing calculation utilities
├── middleware.ts                       — auth guard + role redirect
└── supabase/
    └── migrations/
        ├── 0001_schema.sql             — tables
        ├── 0002_rls.sql                — row level security
        └── 0003_seed.sql              — test clubs, rooms, users
tests/
└── session.test.ts
```

---

## Task 1: Init Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`

- [ ] **Step 1: Bootstrap project**

Run inside `/Users/a1/Desktop/проекты/sonic`:
```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-eslint
```
When prompted — answer Yes to App Router.

- [ ] **Step 2: Install Supabase and test dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
```

Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json` add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: init Next.js 14 + Supabase + Vitest"
```

---

## Task 2: Dark theme + global styles

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#352F73',
          light: '#4a43a0',
          hover: '#3d3680',
        },
        surface: {
          DEFAULT: '#1a1a2e',
          2: '#22223b',
          3: '#2a2a42',
        },
        bg: '#0f0f1a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 2: Replace globals.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0f0f1a;
  --surface: #1a1a2e;
  --surface-2: #22223b;
  --accent: #352F73;
  --accent-light: #4a43a0;
  --text: #e8e8f0;
  --text-muted: #8888aa;
}

* { box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--surface); }
::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }
```

- [ ] **Step 3: Update root layout src/app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PS Club Admin',
  description: 'Система управления игровым клубом',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: dark theme and global styles"
```

---

## Task 3: TypeScript types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write all types**

```typescript
// src/lib/types.ts

export type UserRole = 'owner' | 'admin'
export type RoomStatus = 'free' | 'busy' | 'booked'
export type RoomType = 'standard' | 'vip'
export type SessionStatus = 'active' | 'paused' | 'completed'
export type BookingStatus = 'active' | 'completed' | 'cancelled'

export interface Club {
  id: string
  name: string
  address: string | null
  hourly_rate: number
  created_at: string
}

export interface Room {
  id: string
  club_id: string
  name: string
  type: RoomType
  status: RoomStatus
  hourly_rate: number | null
  created_at: string
}

export interface Session {
  id: string
  room_id: string
  club_id: string
  client_name: string
  started_at: string
  ended_at: string | null
  paused_at: string | null
  paused_duration_ms: number
  total_minutes: number | null
  total_amount: number | null
  status: SessionStatus
  created_at: string
}

export interface Order {
  id: string
  session_id: string
  club_id: string
  item_name: string
  price: number
  quantity: number
  created_at: string
}

export interface Booking {
  id: string
  club_id: string
  room_id: string
  client_name: string
  phone: string | null
  starts_at: string
  ends_at: string
  notes: string | null
  status: BookingStatus
  created_at: string
}

export interface AppUser {
  id: string
  email: string
  role: UserRole
  club_id: string | null
  created_at: string
}

// Active session joined to a room
export interface ActiveSession extends Session {
  orders: Order[]
}

// Room with its current active session (if any)
export interface RoomWithSession extends Room {
  active_session: ActiveSession | null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts && git commit -m "feat: add TypeScript types"
```

---

## Task 4: Session calculation utilities + tests (TDD)

**Files:**
- Create: `src/lib/session.ts`
- Create: `tests/session.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `tests/session.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateElapsedMs,
  calculateSessionMinutes,
  calculateSessionAmount,
  formatDuration,
} from '@/lib/session'

describe('calculateElapsedMs', () => {
  it('returns elapsed time minus paused duration', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const now = new Date('2026-04-15T11:00:00.000Z').getTime()
    const result = calculateElapsedMs(startedAt, null, 0, now)
    expect(result).toBe(60 * 60 * 1000) // 1 hour
  })

  it('subtracts accumulated paused duration', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const now = new Date('2026-04-15T11:00:00.000Z').getTime()
    const pausedDurationMs = 10 * 60 * 1000 // 10 min paused
    const result = calculateElapsedMs(startedAt, null, pausedDurationMs, now)
    expect(result).toBe(50 * 60 * 1000)
  })

  it('subtracts current pause if paused_at is set', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const pausedAt = '2026-04-15T10:50:00.000Z' // paused 10 min ago
    const now = new Date('2026-04-15T11:00:00.000Z').getTime()
    const result = calculateElapsedMs(startedAt, pausedAt, 0, now)
    expect(result).toBe(50 * 60 * 1000)
  })

  it('never returns negative value', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const now = new Date('2026-04-15T10:00:00.000Z').getTime()
    expect(calculateElapsedMs(startedAt, null, 0, now)).toBe(0)
  })
})

describe('calculateSessionMinutes', () => {
  it('rounds up partial minutes', () => {
    expect(calculateSessionMinutes(30 * 1000)).toBe(1) // 30 seconds → 1 min
  })

  it('returns exact minutes', () => {
    expect(calculateSessionMinutes(60 * 60 * 1000)).toBe(60)
  })

  it('returns 90 for 1.5 hours', () => {
    expect(calculateSessionMinutes(90 * 60 * 1000)).toBe(90)
  })
})

describe('calculateSessionAmount', () => {
  it('charges 500 for exactly 60 minutes at 500/hr', () => {
    expect(calculateSessionAmount(60, 500)).toBe(500)
  })

  it('charges 750 for 90 minutes at 500/hr', () => {
    expect(calculateSessionAmount(90, 500)).toBe(750)
  })

  it('rounds to 2 decimal places', () => {
    expect(calculateSessionAmount(10, 500)).toBeCloseTo(83.33, 2)
  })
})

describe('formatDuration', () => {
  it('formats under 1 hour as MM:SS', () => {
    expect(formatDuration(5 * 60 * 1000 + 30 * 1000)).toBe('05:30')
  })

  it('formats over 1 hour as H:MM:SS', () => {
    expect(formatDuration(65 * 60 * 1000 + 5 * 1000)).toBe('1:05:05')
  })

  it('formats zero as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run
```
Expected: `FAIL` — `Cannot find module '@/lib/session'`

- [ ] **Step 3: Implement session.ts**

Create `src/lib/session.ts`:
```typescript
/**
 * Calculate active elapsed time in milliseconds.
 * Subtracts accumulated paused duration and current pause if active.
 */
export function calculateElapsedMs(
  startedAt: string,
  pausedAt: string | null,
  pausedDurationMs: number,
  now: number = Date.now()
): number {
  const start = new Date(startedAt).getTime()
  let elapsed = now - start - pausedDurationMs

  if (pausedAt) {
    const pauseStart = new Date(pausedAt).getTime()
    elapsed -= now - pauseStart
  }

  return Math.max(0, elapsed)
}

/**
 * Convert elapsed milliseconds to billable minutes (rounded up).
 */
export function calculateSessionMinutes(elapsedMs: number): number {
  return Math.ceil(elapsedMs / (1000 * 60))
}

/**
 * Calculate session cost: minutes × hourly_rate / 60, rounded to 2dp.
 */
export function calculateSessionAmount(minutes: number, hourlyRate: number): number {
  return Math.round((minutes / 60) * hourlyRate * 100) / 100
}

/**
 * Format milliseconds as MM:SS or H:MM:SS string.
 */
export function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run
```
Expected: `PASS` — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts tests/ && git commit -m "feat: session calculation utilities with tests"
```

---

## Task 5: Supabase clients

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `.env.local`

- [ ] **Step 1: Create .env.local**

```bash
# .env.local  (fill in from Supabase dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**How to get values:** Supabase dashboard → your project → Settings → API → Project URL + anon public key.

- [ ] **Step 2: Browser client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Server client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore: called from Server Component where cookies are read-only
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Add .env.local to .gitignore**

Append to `.gitignore`:
```
.env.local
.env.*.local
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/ .gitignore && git commit -m "feat: Supabase client utilities"
```

---

## Task 6: Middleware — auth guard + role routing

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write middleware**

Create `src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Unauthenticated → login
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated on login page → redirect by role
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const dest = profile?.role === 'owner' ? '/owner' : '/dashboard/rooms'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Admin trying to access /owner → block
  if (user && pathname.startsWith('/owner')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'owner') {
      return NextResponse.redirect(new URL('/dashboard/rooms', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Root page redirect**

Replace `src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/login')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/app/page.tsx && git commit -m "feat: auth middleware with role-based routing"
```

---

## Task 7: Database schema migrations

**Files:**
- Create: `supabase/migrations/0001_schema.sql`
- Create: `supabase/migrations/0002_rls.sql`
- Create: `supabase/migrations/0003_seed.sql`

- [ ] **Step 1: Write schema migration**

Create `supabase/migrations/0001_schema.sql`:
```sql
create extension if not exists "uuid-ossp";

create table clubs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  hourly_rate numeric(10,2) not null default 500,
  created_at  timestamptz default now()
);

create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('owner', 'admin')),
  club_id    uuid references clubs(id),
  created_at timestamptz default now()
);

create table rooms (
  id          uuid primary key default uuid_generate_v4(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  type        text not null default 'standard' check (type in ('standard', 'vip')),
  status      text not null default 'free' check (status in ('free', 'busy', 'booked')),
  hourly_rate numeric(10,2),
  created_at  timestamptz default now()
);

create table sessions (
  id                  uuid primary key default uuid_generate_v4(),
  room_id             uuid not null references rooms(id) on delete restrict,
  club_id             uuid not null references clubs(id) on delete restrict,
  client_name         text not null,
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  paused_at           timestamptz,
  paused_duration_ms  bigint not null default 0,
  total_minutes       int,
  total_amount        numeric(10,2),
  status              text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at          timestamptz default now()
);

create table orders (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  club_id    uuid not null references clubs(id),
  item_name  text not null,
  price      numeric(10,2) not null,
  quantity   int not null default 1,
  created_at timestamptz default now()
);

create table bookings (
  id           uuid primary key default uuid_generate_v4(),
  club_id      uuid not null references clubs(id) on delete cascade,
  room_id      uuid not null references rooms(id) on delete cascade,
  client_name  text not null,
  phone        text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  notes        text,
  status       text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at   timestamptz default now()
);
```

- [ ] **Step 2: Write RLS migration**

Create `supabase/migrations/0002_rls.sql`:
```sql
alter table clubs    enable row level security;
alter table users    enable row level security;
alter table rooms    enable row level security;
alter table sessions enable row level security;
alter table orders   enable row level security;
alter table bookings enable row level security;

-- Helper functions (security definer = run as table owner, bypass RLS internally)
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

-- rooms
create policy "owner_select_all_rooms" on rooms for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_rooms" on rooms for all
  using (club_id = get_my_club_id());

-- sessions
create policy "owner_select_all_sessions" on sessions for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_sessions" on sessions for all
  using (club_id = get_my_club_id());

-- orders
create policy "owner_select_all_orders" on orders for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_orders" on orders for all
  using (club_id = get_my_club_id());

-- bookings
create policy "owner_select_all_bookings" on bookings for select
  using (get_my_role() = 'owner');
create policy "admin_all_own_bookings" on bookings for all
  using (club_id = get_my_club_id());
```

- [ ] **Step 3: Write seed migration**

Create `supabase/migrations/0003_seed.sql`:
```sql
-- Clubs
insert into clubs (id, name, address, hourly_rate) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Sonic Club — Центр',  'ул. Ленина, 1',    500),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Sonic Club — Север',  'ул. Гагарина, 15', 500);

-- Rooms — Club 1
insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'VIP',    'vip'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard');

-- Rooms — Club 2
insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP',    'vip'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 4', 'standard');

-- NOTE: Users must be created via Supabase Auth UI first, then insert profiles:
-- insert into users (id, email, role, club_id) values
--   ('<owner-uid>',  'owner@psclub.kz',  'owner', null),
--   ('<admin1-uid>', 'admin1@psclub.kz', 'admin', 'aaaabbbb-0000-0000-0000-000000000001'),
--   ('<admin2-uid>', 'admin2@psclub.kz', 'admin', 'aaaabbbb-0000-0000-0000-000000000002');
```

- [ ] **Step 4: Apply migrations in Supabase**

Go to Supabase Dashboard → SQL Editor:
1. Run `0001_schema.sql`
2. Run `0002_rls.sql`
3. Run `0003_seed.sql` (users section stays commented for now)

Also enable Realtime for `rooms` and `sessions` tables:
Supabase Dashboard → Database → Replication → enable for `rooms`, `sessions`.

- [ ] **Step 5: Create test users manually**

Supabase Dashboard → Authentication → Users → Add user:
- `owner@psclub.kz` / `Test1234!`
- `admin1@psclub.kz` / `Test1234!`
- `admin2@psclub.kz` / `Test1234!`

After creating, go to SQL Editor and run the users insert from `0003_seed.sql` with the real UUIDs from the Auth page.

- [ ] **Step 6: Commit**

```bash
git add supabase/ && git commit -m "feat: database schema, RLS policies, seed data"
```

---

## Task 8: Login page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Write login page**

Create `src/app/login/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    // Middleware will handle role-based redirect
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-4">
            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">PS Club Admin</h1>
          <p className="text-text-muted text-sm mt-1">Войдите в систему</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface rounded-2xl p-6 space-y-4 border border-accent/20">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-surface-2 border border-accent/30 rounded-lg px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-accent-light transition-colors"
              placeholder="admin@psclub.kz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-surface-2 border border-accent/30 rounded-lg px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-accent-light transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and test login manually**

```bash
npm run dev
```

Open `http://localhost:3000` → should redirect to `/login`.
Enter `admin1@psclub.kz` / `Test1234!` → should redirect to `/dashboard/rooms` (404 is fine for now, confirms routing works).

- [ ] **Step 3: Commit**

```bash
git add src/app/login/ && git commit -m "feat: login page with Supabase auth"
```

---

## Task 9: Dashboard layout

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Write dashboard layout**

Create `src/app/dashboard/layout.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, clubs(name)')
    .eq('id', user.id)
    .single()

  const clubName = (profile?.clubs as { name: string } | null)?.name ?? 'Клуб'

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-accent/20 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-none">{clubName}</h1>
            <p className="text-text-muted text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-text-muted text-xs hidden sm:block">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="text-text-muted hover:text-white text-xs transition-colors">
              Выйти
            </button>
          </form>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-surface border-b border-accent/10 px-6">
        <div className="flex gap-1">
          <a href="/dashboard/rooms" className="px-4 py-3 text-sm font-medium text-white border-b-2 border-accent-light">
            Комнаты
          </a>
          <a href="/dashboard/bookings" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-white transition-colors border-b-2 border-transparent">
            Бронирования
          </a>
        </div>
      </nav>

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
```

Create `src/app/dashboard/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function DashboardPage() {
  redirect('/dashboard/rooms')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/ && git commit -m "feat: dashboard layout with header and nav"
```

---

## Task 10: Rooms page — server data fetch

**Files:**
- Create: `src/app/dashboard/rooms/page.tsx`

- [ ] **Step 1: Write rooms page**

Create `src/app/dashboard/rooms/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RoomWithSession } from '@/lib/types'
import RoomGrid from '@/components/RoomGrid'

export const dynamic = 'force-dynamic'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) {
    return <p className="text-text-muted">Клуб не назначен. Обратитесь к владельцу.</p>
  }

  // Fetch rooms with their active session + orders
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select(`
      *,
      active_session:sessions(
        id, client_name, started_at, ended_at, paused_at,
        paused_duration_ms, total_minutes, total_amount, status,
        orders(id, item_name, price, quantity)
      )
    `)
    .eq('club_id', profile.club_id)
    .in('sessions.status', ['active', 'paused'])
    .order('name')

  if (error) {
    console.error('Rooms fetch error:', error)
    return <p className="text-red-400">Ошибка загрузки комнат.</p>
  }

  // Flatten: sessions returns array, we want the single active one
  const roomsWithSession: RoomWithSession[] = (rooms ?? []).map(room => ({
    ...room,
    active_session: room.active_session?.[0] ?? null,
  }))

  return (
    <RoomGrid
      initialRooms={roomsWithSession}
      clubId={profile.club_id}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/rooms/page.tsx && git commit -m "feat: rooms page with server-side data fetch"
```

---

## Task 11: SessionTimer component

**Files:**
- Create: `src/components/SessionTimer.tsx`

- [ ] **Step 1: Write SessionTimer**

Create `src/components/SessionTimer.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { calculateElapsedMs, formatDuration } from '@/lib/session'
import type { SessionStatus } from '@/lib/types'

interface Props {
  startedAt: string
  pausedAt: string | null
  pausedDurationMs: number
  status: SessionStatus
}

export default function SessionTimer({ startedAt, pausedAt, pausedDurationMs, status }: Props) {
  const [elapsedMs, setElapsedMs] = useState(() =>
    calculateElapsedMs(startedAt, pausedAt, pausedDurationMs)
  )

  useEffect(() => {
    setElapsedMs(calculateElapsedMs(startedAt, pausedAt, pausedDurationMs))

    if (status !== 'active') return

    const interval = setInterval(() => {
      setElapsedMs(calculateElapsedMs(startedAt, pausedAt, pausedDurationMs))
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, pausedAt, pausedDurationMs, status])

  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-2xl font-black text-accent-light tabular-nums">
        {formatDuration(elapsedMs)}
      </span>
      {status === 'paused' && (
        <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
          пауза
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionTimer.tsx && git commit -m "feat: live session timer component"
```

---

## Task 12: RoomCard component

**Files:**
- Create: `src/components/RoomCard.tsx`

- [ ] **Step 1: Write RoomCard**

Create `src/components/RoomCard.tsx`:
```typescript
'use client'
import { useState } from 'react'
import type { RoomWithSession } from '@/lib/types'
import SessionTimer from './SessionTimer'
import StartSessionModal from './StartSessionModal'
import EndSessionModal from './EndSessionModal'

const STATUS_COLORS = {
  free: 'border-green-500',
  busy: 'border-red-500',
  booked: 'border-yellow-500',
} as const

const STATUS_LABELS = {
  free: 'Свободна',
  busy: 'Занята',
  booked: 'Забронирована',
} as const

const STATUS_TEXT = {
  free: 'text-green-400',
  busy: 'text-red-400',
  booked: 'text-yellow-400',
} as const

interface Props {
  room: RoomWithSession
  clubHourlyRate: number
}

export default function RoomCard({ room, clubHourlyRate }: Props) {
  const [showStart, setShowStart] = useState(false)
  const [showEnd, setShowEnd] = useState(false)

  const session = room.active_session
  const hourlyRate = room.hourly_rate ?? clubHourlyRate

  return (
    <div className={`
      bg-surface rounded-2xl p-5 border-l-4 ${STATUS_COLORS[room.status]}
      flex flex-col gap-3 transition-all hover:bg-surface-2
    `}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-base">{room.name}</h3>
            {room.type === 'vip' && (
              <span className="text-[10px] font-bold tracking-widest text-accent-light bg-accent/20 px-2 py-0.5 rounded-full uppercase">
                VIP
              </span>
            )}
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${STATUS_TEXT[room.status]}`}>
            {STATUS_LABELS[room.status]}
          </span>
        </div>
        <span className="text-text-muted text-xs">{hourlyRate} ₸/ч</span>
      </div>

      {/* Active session info */}
      {session && (
        <div className="space-y-1">
          <p className="text-white font-medium text-sm">{session.client_name}</p>
          <SessionTimer
            startedAt={session.started_at}
            pausedAt={session.paused_at}
            pausedDurationMs={session.paused_duration_ms}
            status={session.status}
          />
        </div>
      )}

      {/* Empty state */}
      {room.status === 'free' && (
        <p className="text-text-muted text-xs">Нет активных сессий</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto pt-1">
        {room.status === 'free' && (
          <button
            onClick={() => setShowStart(true)}
            className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
          >
            ▶ Начать
          </button>
        )}
        {room.status === 'busy' && session && (
          <button
            onClick={() => setShowEnd(true)}
            className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
          >
            ■ Завершить
          </button>
        )}
      </div>

      {/* Modals */}
      {showStart && (
        <StartSessionModal room={room} onClose={() => setShowStart(false)} />
      )}
      {showEnd && session && (
        <EndSessionModal
          room={room}
          session={session}
          hourlyRate={hourlyRate}
          onClose={() => setShowEnd(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoomCard.tsx && git commit -m "feat: RoomCard component with session display"
```

---

## Task 13: Server actions — start/end/pause/resume session

**Files:**
- Create: `src/app/dashboard/rooms/actions.ts`

- [ ] **Step 1: Write all session actions**

Create `src/app/dashboard/rooms/actions.ts`:
```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calculateElapsedMs, calculateSessionMinutes, calculateSessionAmount } from '@/lib/session'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) throw new Error('No club assigned')
  return { supabase, clubId: profile.club_id }
}

export async function startSession(roomId: string, clientName: string) {
  const { supabase, clubId } = await getAuthContext()

  const { error: sessionErr } = await supabase
    .from('sessions')
    .insert({ room_id: roomId, club_id: clubId, client_name: clientName.trim(), status: 'active' })

  if (sessionErr) throw new Error(sessionErr.message)

  const { error: roomErr } = await supabase
    .from('rooms')
    .update({ status: 'busy' })
    .eq('id', roomId)
    .eq('club_id', clubId)

  if (roomErr) throw new Error(roomErr.message)
  revalidatePath('/dashboard/rooms')
}

export async function endSession(
  sessionId: string,
  roomId: string,
  hourlyRate: number
): Promise<{ minutes: number; sessionAmount: number; ordersTotal: number; total: number }> {
  const { supabase, clubId } = await getAuthContext()

  const { data: session } = await supabase
    .from('sessions')
    .select('*, orders(*)')
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .single()

  if (!session) throw new Error('Session not found')

  const now = new Date().toISOString()
  const elapsedMs = calculateElapsedMs(
    session.started_at,
    session.paused_at,
    session.paused_duration_ms
  )
  const minutes = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, hourlyRate)
  const ordersTotal = (session.orders ?? []).reduce(
    (sum: number, o: { price: number; quantity: number }) => sum + o.price * o.quantity, 0
  )
  const total = Math.round((sessionAmount + ordersTotal) * 100) / 100

  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: now, status: 'completed', total_minutes: minutes, total_amount: total })
    .eq('id', sessionId)

  if (error) throw new Error(error.message)

  await supabase.from('rooms').update({ status: 'free' }).eq('id', roomId).eq('club_id', clubId)

  revalidatePath('/dashboard/rooms')
  return { minutes, sessionAmount, ordersTotal, total }
}

export async function undoEndSession(sessionId: string, roomId: string) {
  const { supabase, clubId } = await getAuthContext()

  await supabase
    .from('sessions')
    .update({ ended_at: null, status: 'active', total_minutes: null, total_amount: null })
    .eq('id', sessionId)
    .eq('club_id', clubId)

  await supabase.from('rooms').update({ status: 'busy' }).eq('id', roomId).eq('club_id', clubId)
  revalidatePath('/dashboard/rooms')
}

export async function pauseSession(sessionId: string) {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .eq('status', 'active')

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rooms')
}

export async function resumeSession(sessionId: string) {
  const { supabase, clubId } = await getAuthContext()

  const { data: session } = await supabase
    .from('sessions')
    .select('paused_at, paused_duration_ms')
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .single()

  if (!session?.paused_at) throw new Error('Session is not paused')

  const additionalPauseMs = Date.now() - new Date(session.paused_at).getTime()
  const newPausedDurationMs = session.paused_duration_ms + additionalPauseMs

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'active', paused_at: null, paused_duration_ms: newPausedDurationMs })
    .eq('id', sessionId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rooms')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/rooms/actions.ts && git commit -m "feat: session server actions (start/end/pause/resume)"
```

---

## Task 14: StartSessionModal component

**Files:**
- Create: `src/components/StartSessionModal.tsx`

- [ ] **Step 1: Write StartSessionModal**

Create `src/components/StartSessionModal.tsx`:
```typescript
'use client'
import { useState, useRef, useEffect } from 'react'
import { startSession } from '@/app/dashboard/rooms/actions'
import type { Room } from '@/lib/types'

interface Props {
  room: Room
  onClose: () => void
}

export default function StartSessionModal({ room, onClose }: Props) {
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim()) return

    setLoading(true)
    setError(null)
    try {
      await startSession(room.id, clientName)
      onClose()
    } catch (err) {
      setError('Не удалось начать сессию. Попробуйте снова.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-accent/30">
        <h2 className="text-white font-bold text-lg mb-1">Начать сессию</h2>
        <p className="text-text-muted text-sm mb-5">{room.name}</p>

        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Имя клиента
            </label>
            <input
              ref={inputRef}
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              required
              maxLength={60}
              className="w-full bg-surface-2 border border-accent/30 rounded-lg px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-accent-light transition-colors"
              placeholder="Например: Азамат"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-2 hover:bg-surface-3 text-text-muted text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !clientName.trim()}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Запуск...' : '▶ Начать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StartSessionModal.tsx && git commit -m "feat: StartSessionModal component"
```

---

## Task 15: EndSessionModal + UndoToast

**Files:**
- Create: `src/components/EndSessionModal.tsx`
- Create: `src/components/UndoToast.tsx`

- [ ] **Step 1: Write EndSessionModal**

Create `src/components/EndSessionModal.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { endSession } from '@/app/dashboard/rooms/actions'
import { calculateElapsedMs, calculateSessionMinutes, calculateSessionAmount, formatDuration } from '@/lib/session'
import type { Room, ActiveSession } from '@/lib/types'

interface Props {
  room: Room
  session: ActiveSession
  hourlyRate: number
  onClose: () => void
}

export default function EndSessionModal({ room, session, hourlyRate, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  // Preview calculation
  const elapsedMs = calculateElapsedMs(
    session.started_at,
    session.paused_at,
    session.paused_duration_ms
  )
  const minutes = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, hourlyRate)
  const ordersTotal = (session.orders ?? []).reduce(
    (sum, o) => sum + o.price * o.quantity, 0
  )
  const total = Math.round((sessionAmount + ordersTotal) * 100) / 100

  async function handleEnd() {
    setLoading(true)
    try {
      await endSession(session.id, room.id, hourlyRate)
      onClose()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-accent/30">
        <h2 className="text-white font-bold text-lg mb-1">Завершить сессию</h2>
        <p className="text-text-muted text-sm mb-5">{room.name} · {session.client_name}</p>

        {/* Invoice */}
        <div className="bg-surface-2 rounded-xl p-4 space-y-2 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Время</span>
            <span className="text-white font-medium">{formatDuration(elapsedMs)} ({minutes} мин)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Тариф</span>
            <span className="text-white font-medium">{hourlyRate} ₸/час → {sessionAmount} ₸</span>
          </div>

          {(session.orders ?? []).map(order => (
            <div key={order.id} className="flex justify-between text-sm">
              <span className="text-text-muted">{order.item_name} ×{order.quantity}</span>
              <span className="text-white font-medium">{order.price * order.quantity} ₸</span>
            </div>
          ))}

          <div className="border-t border-accent/20 pt-2 flex justify-between">
            <span className="text-white font-bold">Итого</span>
            <span className="text-accent-light font-black text-lg">{total} ₸</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-surface-2 hover:bg-surface-3 text-text-muted text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleEnd}
            disabled={loading}
            className="flex-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Завершение...' : '■ Завершить'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write UndoToast** (used by RoomGrid after session end)

Create `src/components/UndoToast.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'

interface Props {
  onUndo: () => void
  onExpire: () => void
  durationMs?: number
}

export default function UndoToast({ onUndo, onExpire, durationMs = 10000 }: Props) {
  const [remaining, setRemaining] = useState(Math.ceil(durationMs / 1000))

  useEffect(() => {
    const expireTimer = setTimeout(onExpire, durationMs)
    const countTimer = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => { clearTimeout(expireTimer); clearInterval(countTimer) }
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-surface-2 border border-accent/40 rounded-xl px-5 py-3 shadow-lg">
      <span className="text-text-muted text-sm">Сессия завершена</span>
      <button
        onClick={onUndo}
        className="text-accent-light font-semibold text-sm hover:text-white transition-colors"
      >
        Отменить ({remaining}с)
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ && git commit -m "feat: EndSessionModal with invoice preview and UndoToast"
```

---

## Task 16: RoomGrid with Realtime

**Files:**
- Create: `src/components/RoomGrid.tsx`

- [ ] **Step 1: Write RoomGrid**

Create `src/components/RoomGrid.tsx`:
```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { undoEndSession } from '@/app/dashboard/rooms/actions'
import type { RoomWithSession } from '@/lib/types'
import RoomCard from './RoomCard'
import UndoToast from './UndoToast'

interface Props {
  initialRooms: RoomWithSession[]
  clubId: string
}

interface UndoPending {
  sessionId: string
  roomId: string
}

export default function RoomGrid({ initialRooms, clubId }: Props) {
  const [rooms, setRooms] = useState(initialRooms)
  const [undoPending, setUndoPending] = useState<UndoPending | null>(null)
  const supabase = createClient()

  // Fetch fresh rooms data for this club
  const refetchRooms = useCallback(async () => {
    const { data } = await supabase
      .from('rooms')
      .select(`
        *,
        active_session:sessions(
          id, client_name, started_at, ended_at, paused_at,
          paused_duration_ms, total_minutes, total_amount, status,
          orders(id, item_name, price, quantity)
        )
      `)
      .eq('club_id', clubId)
      .in('sessions.status', ['active', 'paused'])
      .order('name')

    if (data) {
      setRooms(data.map(room => ({
        ...room,
        active_session: room.active_session?.[0] ?? null,
      })))
    }
  }, [clubId])

  useEffect(() => {
    const channel = supabase
      .channel(`club-${clubId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `club_id=eq.${clubId}`,
      }, () => refetchRooms())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `club_id=eq.${clubId}`,
      }, () => refetchRooms())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId, refetchRooms])

  async function handleUndo() {
    if (!undoPending) return
    await undoEndSession(undoPending.sessionId, undoPending.roomId)
    setUndoPending(null)
    refetchRooms()
  }

  // Get club hourly_rate from first room's club (fallback 500)
  const clubHourlyRate = 500

  // Fetch club rate on mount
  useEffect(() => {
    supabase.from('clubs').select('hourly_rate').eq('id', clubId).single()
      .then(({ data }) => {
        if (data) {
          // Store in ref or state — here simplified with local state
        }
      })
  }, [clubId])

  if (rooms.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Комнаты не найдены. Проверьте настройки клуба.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            clubHourlyRate={clubHourlyRate}
          />
        ))}
      </div>

      {undoPending && (
        <UndoToast
          onUndo={handleUndo}
          onExpire={() => setUndoPending(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Also fetch club hourly_rate in RoomGrid properly**

In `RoomGrid.tsx`, replace the simplified club rate section with a proper state:
```typescript
// Add at top of component body:
const [clubHourlyRate, setClubHourlyRate] = useState(500)

// Replace the useEffect:
useEffect(() => {
  supabase
    .from('clubs')
    .select('hourly_rate')
    .eq('id', clubId)
    .single()
    .then(({ data }) => {
      if (data?.hourly_rate) setClubHourlyRate(data.hourly_rate)
    })
}, [clubId])
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RoomGrid.tsx && git commit -m "feat: RoomGrid with Supabase Realtime subscription"
```

---

## Task 17: Owner placeholder page

**Files:**
- Create: `src/app/owner/page.tsx`

- [ ] **Step 1: Write placeholder**

Create `src/app/owner/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">📊</div>
        <h1 className="text-white text-2xl font-bold mb-2">Owner Panel</h1>
        <p className="text-text-muted">Аналитика и обзор клубов — Phase 4</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/owner/ && git commit -m "feat: owner placeholder page"
```

---

## Task 18: End-to-end smoke test

- [ ] **Step 1: Run all unit tests**

```bash
npm run test:run
```
Expected: all tests in `tests/session.test.ts` pass.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test login flow**

1. Open `http://localhost:3000` → should redirect to `/login`
2. Log in as `admin1@psclub.kz` → should redirect to `/dashboard/rooms`
3. Log in as `owner@psclub.kz` → should redirect to `/owner`

- [ ] **Step 4: Test session flow**

1. Click "Начать" on a free room → modal opens
2. Enter client name → click "Начать" → room turns red, timer starts
3. Open the same app in another tab — room should show busy (Realtime)
4. Click "Завершить" → invoice modal shows with correct amount
5. Confirm → room turns green, UndoToast appears for 10 seconds

- [ ] **Step 5: Deploy to Vercel**

```bash
# Install Vercel CLI if needed
npm i -g vercel
vercel
```
Add env vars in Vercel dashboard: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "feat: Phase 0+1 complete — foundation + admin dashboard"
```

---

## Self-review checklist

| Requirement | Task |
|---|---|
| Auth with roles (owner/admin) | Tasks 5, 6, 8 |
| RLS scoping by club_id | Task 7 |
| Room cards grid with status | Tasks 10–12 |
| Live timer | Task 11 |
| Start session (2 clicks) | Tasks 13, 14 |
| End session + invoice | Tasks 13, 15 |
| Pause/Resume | Task 13 |
| Undo toast (10s) | Task 15, 16 |
| Realtime sync | Task 16 |
| 2 clubs, 2 admins, 1 owner | Tasks 7, 9 |
| Dark theme #352F73 | Task 2 |
| Deploy on Vercel | Task 18 |
