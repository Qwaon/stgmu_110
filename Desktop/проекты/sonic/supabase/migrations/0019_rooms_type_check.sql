-- Add CHECK constraint on rooms.type to restrict to valid values
alter table rooms
  add constraint rooms_type_check
  check (type in ('standard', 'vip'));
