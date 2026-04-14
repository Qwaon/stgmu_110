-- Seed data for 2 clubs and their rooms
-- Run AFTER creating auth users manually in Supabase Dashboard

-- Clubs
insert into clubs (id, name, address, hourly_rate) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Sonic Club — Центр',  'ул. Ленина, 1',    500),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Sonic Club — Север',  'ул. Гагарина, 15', 500);

-- Rooms for Club 1
insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'VIP',    'vip'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard');

-- Rooms for Club 2
insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP',    'vip'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 4', 'standard');

-- User profiles (run AFTER creating users in Supabase Auth UI)
-- Replace <uid> placeholders with real UUIDs from Authentication → Users tab
--
-- insert into users (id, email, role, club_id) values
--   ('<owner-uid>',  'owner@psclub.kz',  'owner', null),
--   ('<admin1-uid>', 'admin1@psclub.kz', 'admin', 'aaaabbbb-0000-0000-0000-000000000001'),
--   ('<admin2-uid>', 'admin2@psclub.kz', 'admin', 'aaaabbbb-0000-0000-0000-000000000002');
