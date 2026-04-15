-- Seed data for 2 clubs and their rooms
-- Run AFTER creating auth users manually in Supabase Dashboard

-- Clubs
insert into clubs (id, name, address, hourly_rate) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Sonic — Морозова', 'ул. Морозова', 500),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Sonic — Толстого', 'ул. Толстого', 500)
on conflict (id) do update set name = excluded.name, address = excluded.address;

-- Rooms for Club 1 (Морозова) — 8 standard
insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 4', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 6', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 7', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 8', 'standard')
on conflict do nothing;

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
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 3', 'vip')
on conflict do nothing;

-- User profiles (run AFTER creating users in Supabase Auth UI)
-- Replace <uid> placeholders with real UUIDs from Authentication → Users tab
--
-- insert into users (id, email, role, club_id) values
--   ('<owner-uid>',  'owner@sonic.stv',    'owner', null),
--   ('<admin1-uid>', 'morozova@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000001'),
--   ('<admin2-uid>', 'tolstogo@sonic.stv', 'admin', 'aaaabbbb-0000-0000-0000-000000000002');
