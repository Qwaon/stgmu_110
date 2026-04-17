-- Rebuild room configuration for the two Sonic locations.
-- This removes existing rooms for these clubs and recreates the target layout:
-- Морозова: 8 standard rooms
-- Толстого: 8 standard rooms + 3 VIP rooms
-- Related sessions/orders/bookings for those rooms are removed as well.

with target_rooms as (
  select id
  from rooms
  where club_id in (
    'aaaabbbb-0000-0000-0000-000000000001'::uuid,
    'aaaabbbb-0000-0000-0000-000000000002'::uuid
  )
)
delete from sessions
where room_id in (select id from target_rooms);

delete from rooms
where club_id in (
  'aaaabbbb-0000-0000-0000-000000000001'::uuid,
  'aaaabbbb-0000-0000-0000-000000000002'::uuid
);

insert into rooms (club_id, name, type) values
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 4', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 6', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 7', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 8', 'standard'),
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
