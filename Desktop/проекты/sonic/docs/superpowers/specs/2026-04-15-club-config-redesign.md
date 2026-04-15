# Spec: Club Config & UX Redesign

**Date:** 2026-04-15  
**Status:** Approved

---

## Scope

Five independent changes to the Sonic PS Club admin app:

1. Real logo in header (replace placeholder)
2. Correct room counts per club in seed data
3. Menu & Tariffs tabs hidden from admin role (owner-only)
4. Start session — confirmation only, no client name
5. Booking — phone-only identifier, optional end time

---

## 1. Logo

**What:** Replace `LogoPlaceholder` (letter "S" in rect) with actual `sonic.svg`.

**How:**
- Copy `src/sonic.svg` → `public/sonic.svg` (Next.js serves `public/` as static assets)
- Rewrite `LogoPlaceholder` in `src/components/icons.tsx` to render `<Image src="/sonic.svg" width={28} height={28} alt="Sonic" />` using `next/image`
- Remove `SVGProps` from the component signature (no longer an SVG element)
- Both layouts (`dashboard/layout.tsx`, `owner/layout.tsx`) already import `LogoPlaceholder` — they get the real logo automatically

---

## 2. Room counts (seed)

**What:** Update `supabase/migrations/0003_seed.sql` to reflect actual club layouts.

**Mapping:**
- Club 1 (`aaaabbbb-0000-0000-0000-000000000001`) → **Sonic — Морозова**: 8 standard rooms (Room 1–8)
- Club 2 (`aaaabbbb-0000-0000-0000-000000000002`) → **Sonic — Толстого**: 8 standard rooms (Room 1–8) + 3 VIP rooms (VIP 1, VIP 2, VIP 3)

Rename clubs in the seed accordingly. User insert block stays commented out (unchanged).

---

## 3. Admin cannot access Menu & Tariffs

**What:** Admin role users must not see or access the Menu and Tariffs sections.

**Dashboard nav (`dashboard/layout.tsx`):**
- Fetch `role` alongside `club_id` from `users` table
- Render nav items conditionally: show "Меню" and "Тарифы" only when `role === 'owner'`

**Page-level guard (`menu/page.tsx`, `tariffs/page.tsx`):**
- Fetch role, redirect to `/dashboard/rooms` if `role !== 'owner'`
- This prevents direct URL access, not just nav hiding

---

## 4. Start session — confirmation only

**What:** Remove the "Client name" field. Session start is a single-tap confirmation.

**UI (`StartSessionModal.tsx`):**
- Remove `<input>` for client name, remove form element
- Show: room name + "Начать сессию?" heading + Cancel/Start buttons
- Start button calls `startSession(room.id)` directly (no name arg)

**Action (`rooms/actions.ts` → `startSession`):**
- Remove `clientName` parameter
- Insert `client_name: ''` (empty string) until DB migration runs, then null
- `checkInBooking` in `bookings/actions.ts`: remove `client_name` from session insert

**Schema migration (`0007_nullable_fields.sql`):**
```sql
alter table sessions alter column client_name drop not null;
alter table bookings alter column client_name drop not null;
```

After migration, `startSession` inserts `client_name: null`.

---

## 5. Booking — phone only, optional end time

**What:** Remove client name from bookings. Phone is the sole identifier. End time is optional (toggled on/off).

### Schema migration (same `0007_nullable_fields.sql`):
```sql
alter table bookings alter column ends_at drop not null;
```

### Type updates (`lib/types.ts`):
```ts
// Session
client_name: string | null   // was: string

// Booking  
client_name: string | null   // was: string
ends_at: string | null        // was: string
```

### `CreateBookingModal.tsx`:
- Remove "Имя клиента" field
- Phone field becomes the primary identifier (not required, but strongly encouraged)
- Add toggle "Указать время окончания" (default: off)
  - When off: `endTime` state is null, end time inputs hidden
  - When on: show end time input (existing logic)
- Pass `endsAt: string | null` to action

### `createBooking` action (`bookings/actions.ts`):
- Remove `clientName` parameter
- `endsAt` parameter becomes `string | null`
- Conflict check: skip if either booking has `ends_at = null` (open-ended booking can't conflict by time)
- Insert: `client_name: null`, `ends_at: endsAt`

### `BookingsList.tsx`:
- `BookingCard` primary text: show `b.phone ?? 'без телефона'` (was `b.client_name`)
- End time display: show `formatTime(b.ends_at)` only when `b.ends_at` is not null; otherwise show `'—'`
- `refetch` query: remove `.gte('ends_at', ...)` filter (was filtering out open-ended bookings); instead filter by `starts_at` of the current day or keep all active bookings

### `checkInBooking` action:
- When starting a session from a booking: `scheduled_end_at: booking.ends_at` (already nullable after migration — no change needed in logic, null is valid)

---

## Files changed

| File | Change |
|------|--------|
| `public/sonic.svg` | New file (copied from `src/sonic.svg`) |
| `src/components/icons.tsx` | `LogoPlaceholder` → uses `next/image` |
| `supabase/migrations/0003_seed.sql` | Correct room counts, rename clubs |
| `supabase/migrations/0007_nullable_fields.sql` | New migration |
| `src/lib/types.ts` | `client_name` nullable on Session & Booking; `ends_at` nullable on Booking |
| `src/app/dashboard/layout.tsx` | Fetch role, conditionally render nav items |
| `src/app/dashboard/menu/page.tsx` | Owner-only guard |
| `src/app/dashboard/tariffs/page.tsx` | Owner-only guard |
| `src/components/StartSessionModal.tsx` | Confirmation-only, no name field |
| `src/app/dashboard/rooms/actions.ts` | `startSession` removes clientName param |
| `src/app/dashboard/bookings/actions.ts` | `createBooking` removes clientName, endsAt nullable; `checkInBooking` removes client_name from insert |
| `src/components/CreateBookingModal.tsx` | Remove name field, optional end time toggle |
| `src/components/BookingsList.tsx` | Show phone as primary, handle null ends_at |

---

## Out of scope

- History of sessions (client_name column kept, just nullable — no data migration)
- Conflict detection for open-ended bookings with each other (skipped — no end time = no overlap possible)
- Mobile/tablet adaptive layout (Phase 5 pending)
