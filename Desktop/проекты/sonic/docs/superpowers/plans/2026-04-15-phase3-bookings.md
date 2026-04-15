# Phase 3 — Bookings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement full booking management for PS Club admin: create/cancel/check-in bookings, two-tab UI, room card badges and 15-min pulse alert.

**Architecture:** Server Component page loads initial data; BookingsList Client Component handles tabs + Realtime; Server Actions mutate DB. Follows the same rooms-page pattern already in the codebase.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + Realtime), TypeScript, Tailwind CSS

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/0005_bookings_ext.sql` |
| Modify | `src/lib/types.ts` |
| Create | `src/app/dashboard/bookings/actions.ts` |
| Create | `src/components/CreateBookingModal.tsx` |
| Create | `src/components/BookingsList.tsx` |
| Modify | `src/app/dashboard/bookings/page.tsx` |
| Modify | `src/components/RoomCard.tsx` |
| Modify | `src/components/RoomGrid.tsx` |
| Modify | `src/app/dashboard/rooms/page.tsx` |

---

### Task 1: Migration — scheduled_end_at + bookings RLS

**Files:** Create `supabase/migrations/0005_bookings_ext.sql`

- [ ] Add `scheduled_end_at timestamptz` to sessions
- [ ] Add RLS policies for bookings table
- [ ] Run in Supabase SQL Editor

### Task 2: Update types

**Files:** Modify `src/lib/types.ts`

- [ ] Add `scheduled_end_at: string | null` to Session interface
- [ ] Add `RoomWithBooking` type for rooms page with upcoming booking

### Task 3: Booking Server Actions

**Files:** Create `src/app/dashboard/bookings/actions.ts`

- [ ] `createBooking` — insert booking, conflict check, set room status 'booked'
- [ ] `cancelBooking` — set booking cancelled, restore room to 'free' if no active session
- [ ] `checkInBooking` — start session with client name + scheduled_end_at, complete booking, set room 'busy'

### Task 4: CreateBookingModal

**Files:** Create `src/components/CreateBookingModal.tsx`

- [ ] Form: room (select), client name, phone, date, start time, end time
- [ ] Client-side validation (end > start)
- [ ] Calls createBooking action

### Task 5: BookingsList (two tabs + Realtime)

**Files:** Create `src/components/BookingsList.tsx`

- [ ] Tab "Список": cards grouped by date (Сегодня / Завтра / Позже)
- [ ] Tab "По дням": date picker + room timeline
- [ ] Realtime subscription on bookings table
- [ ] Buttons: Заселить / Отменить per booking card

### Task 6: Bookings page (Server Component)

**Files:** Modify `src/app/dashboard/bookings/page.tsx`

- [ ] Load bookings (active, future) + rooms for club
- [ ] Render BookingsList with initial data

### Task 7: RoomCard — badge + pulse

**Files:** Modify `src/components/RoomCard.tsx`, `RoomGrid.tsx`, `rooms/page.tsx`

- [ ] RoomCard accepts `upcomingBooking?: Booking`
- [ ] Show badge "Бронь HH:MM" when booking starts within 4h
- [ ] Pulse animation when active session has scheduled_end_at within 15 min
- [ ] RoomGrid fetches + passes upcoming bookings per room
- [ ] rooms/page.tsx loads today's active bookings
