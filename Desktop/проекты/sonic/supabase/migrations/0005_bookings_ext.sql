-- Phase 3: add scheduled_end_at to sessions
-- Set when a session is started from a booking (checkInBooking action)
alter table sessions
  add column if not exists scheduled_end_at timestamptz;
