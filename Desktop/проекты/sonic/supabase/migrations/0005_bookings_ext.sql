-- Phase 3: bookings extension
-- Add scheduled_end_at to sessions (set when a session starts from a booking)
alter table sessions
  add column if not exists scheduled_end_at timestamptz;

-- RLS for bookings (admins see only their club, owner sees all)
alter table bookings enable row level security;

create policy "Admin sees own club bookings"
  on bookings for all
  using (
    club_id = (
      select club_id from users where id = auth.uid()
    )
  );

create policy "Owner sees all bookings"
  on bookings for all
  using (
    exists (select 1 from users where id = auth.uid() and role = 'owner')
  );
