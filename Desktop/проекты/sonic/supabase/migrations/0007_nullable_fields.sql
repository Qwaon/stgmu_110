-- 0007: make client_name and ends_at nullable
-- sessions: client_name becomes optional (no name required to start)
alter table sessions alter column client_name drop not null;

-- bookings: client_name removed, phone is primary identifier
alter table bookings alter column client_name drop not null;

-- bookings: end time is now optional
alter table bookings alter column ends_at drop not null;
