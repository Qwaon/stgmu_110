# Club Config & UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update club seed data, replace logo placeholder with real SVG, restrict Menu/Tariffs to owner role, remove client name from sessions and bookings, and make booking end time optional.

**Architecture:** Schema migration makes `client_name` and `ends_at` nullable; TypeScript types follow; each UI component and server action is updated in dependency order (schema → types → actions → components).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/0007_nullable_fields.sql` | Create | DROP NOT NULL on sessions.client_name, bookings.client_name, bookings.ends_at |
| `supabase/migrations/0003_seed.sql` | Modify | Rename clubs, set correct room counts |
| `public/sonic.svg` | Create | Static logo asset |
| `src/components/icons.tsx` | Modify | Replace LogoPlaceholder with real img |
| `src/lib/types.ts` | Modify | client_name/ends_at nullable on relevant types |
| `src/app/dashboard/layout.tsx` | Modify | Fetch role, conditionally render Menu/Tariffs tabs |
| `src/app/dashboard/menu/page.tsx` | Modify | Owner-only guard |
| `src/app/dashboard/tariffs/page.tsx` | Modify | Owner-only guard |
| `src/components/StartSessionModal.tsx` | Modify | Confirmation only, no name input |
| `src/app/dashboard/rooms/actions.ts` | Modify | startSession removes clientName param |
| `src/app/dashboard/bookings/actions.ts` | Modify | createBooking removes clientName, endsAt nullable; checkInBooking removes client_name from insert |
| `src/components/CreateBookingModal.tsx` | Modify | Remove name field, add end-time toggle |
| `src/components/BookingsList.tsx` | Modify | Show phone as primary, handle null ends_at |

---

### Task 1: Schema migration — nullable fields

**Files:**
- Create: `supabase/migrations/0007_nullable_fields.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 0007: make client_name and ends_at nullable
-- sessions: client_name becomes optional (no name required to start)
alter table sessions alter column client_name drop not null;

-- bookings: client_name removed, phone is primary identifier
alter table bookings alter column client_name drop not null;

-- bookings: end time is now optional
alter table bookings alter column ends_at drop not null;
```

- [ ] **Step 2: Apply migration in Supabase Dashboard**

Open Supabase Dashboard → SQL Editor → paste and run the migration.

Expected: "Success. No rows returned."

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_nullable_fields.sql
git commit -m "feat: migration 0007 — nullable client_name and ends_at"
```

---

### Task 2: Update seed data

**Files:**
- Modify: `supabase/migrations/0003_seed.sql`

- [ ] **Step 1: Replace clubs and rooms section**

Replace the entire file content (keep user insert comment unchanged):

```sql
-- Seed data for 2 clubs and their rooms
-- Run AFTER creating auth users manually in Supabase Dashboard

-- Clubs
insert into clubs (id, name, address, hourly_rate) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Sonic — Морозова', 'ул. Морозова', 500),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Sonic — Толстого', 'ул. Толстого', 500);

-- Rooms for Club 1 (Морозова) — 8 standard
insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 4', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 6', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 7', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 8', 'standard');

-- Rooms for Club 2 (Толстого) — 8 standard + 3 VIP
insert into rooms (club_id, name, type) values
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
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 3', 'vip');

-- User profiles (run AFTER creating users in Supabase Auth UI)
-- Replace <uid> placeholders with real UUIDs from Authentication → Users tab
--
-- insert into users (id, email, role, club_id) values
--   ('<owner-uid>',  'owner@sonic.stv',    'owner', null),
--   ('<admin1-uid>', 'morozova@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000001'),
--   ('<admin2-uid>', 'tolstogo@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000002');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0003_seed.sql
git commit -m "feat: update seed — Морозова 8 rooms, Толстого 8+3 VIP"
```

---

### Task 3: Logo — use real sonic.svg

**Files:**
- Create: `public/sonic.svg` (copy of `src/sonic.svg`)
- Modify: `src/components/icons.tsx`

- [ ] **Step 1: Copy SVG to public/**

```bash
cp src/sonic.svg public/sonic.svg
```

- [ ] **Step 2: Update LogoPlaceholder in icons.tsx**

Find this block in `src/components/icons.tsx` (lines 127–136):

```tsx
/** Placeholder — user replaces this with their own SVG */
export function LogoPlaceholder({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props} className={className} width={28} height={28}>
      {"/Users/a1/Desktop/проекты/sonic/src/sonic.svg"}
      <rect x="2" y="2" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" fontFamily="Outfit">S</text>
    </svg>
  )
}
```

Replace with:

```tsx
export function LogoPlaceholder({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/sonic.svg" width={28} height={28} alt="Sonic" className={className} />
  )
}
```

Note: using a plain `<img>` tag (not `next/image`) because SVGs don't benefit from Next.js image optimization, and this avoids the `unoptimized` prop dance.

- [ ] **Step 3: Check types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add public/sonic.svg src/components/icons.tsx
git commit -m "feat: replace logo placeholder with real sonic.svg"
```

---

### Task 4: Update TypeScript types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Make client_name nullable on Session**

In `src/lib/types.ts`, find:

```ts
export interface Session {
  id: string
  room_id: string
  club_id: string
  client_name: string
```

Change `client_name` line to:

```ts
  client_name: string | null
```

- [ ] **Step 2: Make client_name and ends_at nullable on Booking**

Find:

```ts
export interface Booking {
  id: string
  club_id: string
  room_id: string
  client_name: string
  phone: string | null
  starts_at: string
  ends_at: string
```

Change to:

```ts
export interface Booking {
  id: string
  club_id: string
  room_id: string
  client_name: string | null
  phone: string | null
  starts_at: string
  ends_at: string | null
```

- [ ] **Step 3: Check types compile**

```bash
npx tsc --noEmit
```

Expected: errors in components that read `client_name` or `ends_at` — those are intentional and will be fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: make client_name and ends_at nullable in types"
```

---

### Task 5: Admin nav — owner-only Menu & Tariffs

**Files:**
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/menu/page.tsx`
- Modify: `src/app/dashboard/tariffs/page.tsx`

- [ ] **Step 1: Fetch role in dashboard layout**

In `src/app/dashboard/layout.tsx`, find:

```ts
  const { data: profile } = await supabase
    .from('users')
    .select('clubs(name)')
    .eq('id', user.id)
    .single()

  const clubName = (profile?.clubs as unknown as { name: string } | null)?.name ?? 'Клуб'
```

Replace with:

```ts
  const { data: profile } = await supabase
    .from('users')
    .select('role, clubs(name)')
    .eq('id', user.id)
    .single()

  const clubName = (profile?.clubs as unknown as { name: string } | null)?.name ?? 'Клуб'
  const isOwner  = profile?.role === 'owner'
```

- [ ] **Step 2: Filter nav items by role**

Find the nav items array:

```ts
          {[
            { href: '/dashboard/rooms',    label: 'Комнаты' },
            { href: '/dashboard/bookings', label: 'Бронирования' },
            { href: '/dashboard/menu',     label: 'Меню' },
            { href: '/dashboard/tariffs',  label: 'Тарифы' },
          ].map(({ href, label }) => (
```

Replace with:

```ts
          {[
            { href: '/dashboard/rooms',    label: 'Комнаты' },
            { href: '/dashboard/bookings', label: 'Бронирования' },
            ...(isOwner ? [
              { href: '/dashboard/menu',    label: 'Меню' },
              { href: '/dashboard/tariffs', label: 'Тарифы' },
            ] : []),
          ].map(({ href, label }) => (
```

- [ ] **Step 3: Add owner guard to menu page**

In `src/app/dashboard/menu/page.tsx`, find:

```ts
  const { data: profile } = await supabase
    .from('users')
    .select('club_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.club_id) {
```

Replace with:

```ts
  const { data: profile } = await supabase
    .from('users')
    .select('club_id, role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'owner') redirect('/dashboard/rooms')

  if (!profile?.club_id) {
```

Add `import { redirect } from 'next/navigation'` at the top if not already present.

- [ ] **Step 4: Add owner guard to tariffs page**

In `src/app/dashboard/tariffs/page.tsx`, find:

```ts
  const { data: profile } = await supabase
    .from('users').select('club_id').eq('id', user.id).single()

  if (!profile?.club_id) {
```

Replace with:

```ts
  const { data: profile } = await supabase
    .from('users').select('club_id, role').eq('id', user.id).single()

  if (profile?.role !== 'owner') redirect('/dashboard/rooms')

  if (!profile?.club_id) {
```

- [ ] **Step 5: Check types compile**

```bash
npx tsc --noEmit
```

Expected: no new errors from these changes.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/dashboard/menu/page.tsx src/app/dashboard/tariffs/page.tsx
git commit -m "feat: hide Menu and Tariffs from admin role"
```

---

### Task 6: Start session — confirmation only

**Files:**
- Modify: `src/components/StartSessionModal.tsx`
- Modify: `src/app/dashboard/rooms/actions.ts`

- [ ] **Step 1: Update startSession action — remove clientName param**

In `src/app/dashboard/rooms/actions.ts`, find:

```ts
export async function startSession(roomId: string, clientName: string) {
  const { supabase, clubId } = await getAuthContext()

  const { error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      room_id: roomId,
      club_id: clubId,
      client_name: clientName.trim(),
      status: 'active',
    })
```

Replace with:

```ts
export async function startSession(roomId: string) {
  const { supabase, clubId } = await getAuthContext()

  const { error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      room_id: roomId,
      club_id: clubId,
      client_name: null,
      status: 'active',
    })
```

- [ ] **Step 2: Rewrite StartSessionModal — confirmation only**

Replace the entire content of `src/components/StartSessionModal.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import { startSession } from '@/app/dashboard/rooms/actions'
import type { Room } from '@/lib/types'
import { IconX } from './icons'

interface Props {
  room: Room
  onClose: () => void
}

export default function StartSessionModal({ room, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      await startSession(room.id)
      onClose()
    } catch {
      setError('Не удалось начать сессию. Попробуйте снова.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Начать сессию</h2>
            <p className="text-text-muted text-sm">{room.name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {error && (
          <p className="text-status-busy text-sm border border-status-busy/30 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="flex-1 border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Запуск...' : 'Начать'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update checkInBooking — remove client_name from session insert**

In `src/app/dashboard/bookings/actions.ts`, find:

```ts
  // Start session with scheduled_end_at from booking
  const { error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      room_id:           booking.room_id,
      club_id:           clubId,
      client_name:       booking.client_name,
      status:            'active',
      scheduled_end_at:  booking.ends_at,
    })
```

Replace with:

```ts
  // Start session with scheduled_end_at from booking
  const { error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      room_id:          booking.room_id,
      club_id:          clubId,
      client_name:      null,
      status:           'active',
      scheduled_end_at: booking.ends_at,
    })
```

Also update the select in `checkInBooking` — remove `client_name` and `ends_at` from the destructured booking since we no longer need `client_name` (we still need `ends_at` for `scheduled_end_at`):

Find:

```ts
  const { data: booking } = await supabase
    .from('bookings')
    .select('room_id, client_name, ends_at')
    .eq('id', bookingId)
    .eq('club_id', clubId)
    .single()
```

Replace with:

```ts
  const { data: booking } = await supabase
    .from('bookings')
    .select('room_id, ends_at')
    .eq('id', bookingId)
    .eq('club_id', clubId)
    .single()
```

- [ ] **Step 4: Check types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/StartSessionModal.tsx src/app/dashboard/rooms/actions.ts src/app/dashboard/bookings/actions.ts
git commit -m "feat: start session — confirmation only, no client name"
```

---

### Task 7: Booking — phone-only, optional end time

**Files:**
- Modify: `src/app/dashboard/bookings/actions.ts`
- Modify: `src/components/CreateBookingModal.tsx`
- Modify: `src/components/BookingsList.tsx`

- [ ] **Step 1: Update createBooking action**

In `src/app/dashboard/bookings/actions.ts`, find:

```ts
export async function createBooking(
  roomId: string,
  clientName: string,
  phone: string,
  startsAt: string,
  endsAt: string,
  notes: string
): Promise<{ error?: string }> {
  const { supabase, clubId } = await getAuthContext()

  // Conflict check: any active booking for same room that overlaps
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'active')
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt)

  if (conflicts && conflicts.length > 0) {
    return { error: 'Это время уже занято другой бронью' }
  }

  const { error } = await supabase
    .from('bookings')
    .insert({
      club_id:     clubId,
      room_id:     roomId,
      client_name: clientName.trim(),
      phone:       phone.trim() || null,
      starts_at:   startsAt,
      ends_at:     endsAt,
      notes:       notes.trim() || null,
      status:      'active',
    })
```

Replace with:

```ts
export async function createBooking(
  roomId: string,
  phone: string,
  startsAt: string,
  endsAt: string | null,
  notes: string
): Promise<{ error?: string }> {
  const { supabase, clubId } = await getAuthContext()

  // Conflict check: only when this booking has an end time
  if (endsAt) {
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('status', 'active')
      .not('ends_at', 'is', null)
      .lt('starts_at', endsAt)
      .gt('ends_at', startsAt)

    if (conflicts && conflicts.length > 0) {
      return { error: 'Это время уже занято другой бронью' }
    }
  }

  const { error } = await supabase
    .from('bookings')
    .insert({
      club_id:     clubId,
      room_id:     roomId,
      client_name: null,
      phone:       phone.trim() || null,
      starts_at:   startsAt,
      ends_at:     endsAt,
      notes:       notes.trim() || null,
      status:      'active',
    })
```

- [ ] **Step 2: Rewrite CreateBookingModal**

Replace the entire content of `src/components/CreateBookingModal.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import { createBooking } from '@/app/dashboard/bookings/actions'
import type { Room } from '@/lib/types'
import { IconX } from './icons'

interface Props {
  rooms: Room[]
  onClose: () => void
}

function todayLocal() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function toISOLocal(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}`).toISOString()
}

const inputCls = "w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/50 transition-colors placeholder:text-text-muted"
const labelCls = "text-text-muted text-xs mb-1 block tracking-wide uppercase"

export default function CreateBookingModal({ rooms, onClose }: Props) {
  const today = todayLocal()

  const [roomId,      setRoomId]      = useState(rooms[0]?.id ?? '')
  const [phone,       setPhone]       = useState('')
  const [date,        setDate]        = useState(today)
  const [startTime,   setStartTime]   = useState('10:00')
  const [hasEndTime,  setHasEndTime]  = useState(false)
  const [endTime,     setEndTime]     = useState('11:00')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (hasEndTime && startTime >= endTime) {
      setError('Время окончания должно быть позже начала')
      return
    }

    setLoading(true)
    try {
      const endsAt = hasEndTime ? toISOLocal(date, endTime) : null
      const result = await createBooking(
        roomId,
        phone,
        toISOLocal(date, startTime),
        endsAt,
        notes,
      )
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        onClose()
      }
    } catch {
      setError('Ошибка при создании брони')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-white font-semibold text-base">Новая бронь</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className={labelCls}>Комната</label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              required
              className="w-full bg-bg border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/50 transition-colors"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.type === 'vip' ? ' (VIP)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Телефон</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+7 999 000 00 00"
              type="tel"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Дата</label>
            <input
              value={date}
              onChange={e => setDate(e.target.value)}
              type="date"
              min={today}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Начало</label>
            <input
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              type="time"
              required
              className={inputCls}
            />
          </div>

          {/* Optional end time */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasEndTime}
                onChange={e => setHasEndTime(e.target.checked)}
                className="rounded border-white/20 bg-transparent accent-white"
              />
              <span className="text-text-muted text-xs tracking-wide uppercase">Указать время окончания</span>
            </label>
            {hasEndTime && (
              <input
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                type="time"
                required
                className={`${inputCls} mt-2`}
              />
            )}
          </div>

          <div>
            <label className={labelCls}>Заметки (необязательно)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Предпочтения, детали..."
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-status-busy text-xs border border-status-busy/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Создаём...' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update BookingsList — phone as primary, handle null ends_at**

In `src/components/BookingsList.tsx`, find the `refetch` query:

```ts
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at')
```

Replace with (filter by `starts_at >= today` instead of `ends_at`, so open-ended bookings are included but past ones aren't):

```ts
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .gte('starts_at', todayStart.toISOString())
      .order('starts_at')
```

- [ ] **Step 4: Update BookingCard — phone as title, handle null ends_at**

In `src/components/BookingsList.tsx`, find the `BookingCard` time badge section:

```tsx
      {/* Time badge */}
      <div className="text-center flex-shrink-0 min-w-[52px]">
        <p className="text-white font-semibold text-sm leading-tight font-mono">{formatTime(b.starts_at)}</p>
        <p className="text-text-muted text-[10px] font-mono">{formatTime(b.ends_at)}</p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{b.client_name}</p>
        <p className="text-text-muted text-xs truncate">
          {compact ? '' : `${roomName} · `}{b.phone || 'без телефона'}
        </p>
```

Replace with:

```tsx
      {/* Time badge */}
      <div className="text-center flex-shrink-0 min-w-[52px]">
        <p className="text-white font-semibold text-sm leading-tight font-mono">{formatTime(b.starts_at)}</p>
        <p className="text-text-muted text-[10px] font-mono">{b.ends_at ? formatTime(b.ends_at) : '—'}</p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{b.phone || 'без телефона'}</p>
        {!compact && (
          <p className="text-text-muted text-xs truncate">{roomName}</p>
        )}
        {b.notes && <p className="text-text-muted text-xs truncate italic">{b.notes}</p>}
      </div>
```

- [ ] **Step 5: Check types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run existing tests**

```bash
npm run test:run
```

Expected: all tests pass (session.ts calculations are unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/bookings/actions.ts src/components/CreateBookingModal.tsx src/components/BookingsList.tsx
git commit -m "feat: booking — phone-only identifier, optional end time"
```

---

## Final verification

- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Run `npm run test:run` — all pass
- [ ] Run `npm run build` — clean build

```bash
npx tsc --noEmit && npm run test:run && npm run build
```

Expected: TypeScript: 0 errors, Tests: all pass, Build: success.
