create index if not exists rooms_club_id_name_idx
  on rooms (club_id, name);

create index if not exists sessions_club_status_room_idx
  on sessions (club_id, status, room_id);

create index if not exists sessions_room_status_idx
  on sessions (room_id, status);

create index if not exists bookings_club_status_starts_at_idx
  on bookings (club_id, status, starts_at);

create index if not exists bookings_room_status_starts_at_idx
  on bookings (room_id, status, starts_at);

create index if not exists orders_session_id_idx
  on orders (session_id);

create index if not exists menu_items_club_pin_popularity_idx
  on menu_items (club_id, is_pinned desc, order_count desc);
