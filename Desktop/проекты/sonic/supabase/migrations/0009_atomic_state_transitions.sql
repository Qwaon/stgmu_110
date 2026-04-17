create or replace function start_session_atomic(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_room_status text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select status
    into v_room_status
  from rooms
  where id = p_room_id
    and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  if v_room_status = 'busy' then
    raise exception 'Room already has an active session';
  end if;

  insert into sessions (room_id, club_id, client_name, status)
  values (p_room_id, v_club_id, null, 'active');

  update rooms
  set status = 'busy'
  where id = p_room_id
    and club_id = v_club_id;
end;
$$;

create or replace function end_session_atomic(
  p_session_id uuid,
  p_room_id uuid,
  p_minutes int,
  p_total numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_session_status text;
  v_session_room_id uuid;
  v_room_status text;
  v_has_active_booking boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id, status
    into v_session_room_id, v_session_status
  from sessions
  where id = p_session_id
    and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_session_room_id <> p_room_id then
    raise exception 'Session does not belong to the specified room';
  end if;

  if v_session_status not in ('active', 'paused') then
    raise exception 'Session is already completed';
  end if;

  select status
    into v_room_status
  from rooms
  where id = p_room_id
    and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  update sessions
  set ended_at = now(),
      status = 'completed',
      total_minutes = p_minutes,
      total_amount = p_total
  where id = p_session_id
    and club_id = v_club_id;

  select exists (
    select 1
    from bookings
    where room_id = p_room_id
      and club_id = v_club_id
      and status = 'active'
      and (ends_at is null or ends_at >= now())
  ) into v_has_active_booking;

  update rooms
  set status = case when v_has_active_booking then 'booked' else 'free' end
  where id = p_room_id
    and club_id = v_club_id;
end;
$$;

create or replace function undo_end_session_atomic(p_session_id uuid, p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_session_status text;
  v_session_room_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id, status
    into v_session_room_id, v_session_status
  from sessions
  where id = p_session_id
    and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_session_room_id <> p_room_id then
    raise exception 'Session does not belong to the specified room';
  end if;

  if v_session_status <> 'completed' then
    raise exception 'Only completed sessions can be restored';
  end if;

  perform 1
  from rooms
  where id = p_room_id
    and club_id = v_club_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  update sessions
  set ended_at = null,
      status = 'active',
      total_minutes = null,
      total_amount = null
  where id = p_session_id
    and club_id = v_club_id;

  update rooms
  set status = 'busy'
  where id = p_room_id
    and club_id = v_club_id;
end;
$$;

create or replace function cancel_booking_atomic(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_room_id uuid;
  v_has_active_booking boolean;
  v_has_live_session boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id
    into v_room_id
  from bookings
  where id = p_booking_id
    and club_id = v_club_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  perform 1
  from rooms
  where id = v_room_id
    and club_id = v_club_id
  for update;

  update bookings
  set status = 'cancelled'
  where id = p_booking_id
    and club_id = v_club_id;

  select exists (
    select 1
    from bookings
    where room_id = v_room_id
      and club_id = v_club_id
      and status = 'active'
      and (ends_at is null or ends_at >= now())
  ) into v_has_active_booking;

  select exists (
    select 1
    from sessions
    where room_id = v_room_id
      and club_id = v_club_id
      and status in ('active', 'paused')
  ) into v_has_live_session;

  update rooms
  set status = case
    when v_has_live_session then 'busy'
    when v_has_active_booking then 'booked'
    else 'free'
  end
  where id = v_room_id
    and club_id = v_club_id;

  return v_room_id;
end;
$$;

create or replace function check_in_booking_atomic(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid := get_my_club_id();
  v_room_id uuid;
  v_ends_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select room_id, ends_at
    into v_room_id, v_ends_at
  from bookings
  where id = p_booking_id
    and club_id = v_club_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  perform 1
  from rooms
  where id = v_room_id
    and club_id = v_club_id
  for update;

  insert into sessions (room_id, club_id, client_name, status, scheduled_end_at)
  values (v_room_id, v_club_id, null, 'active', v_ends_at);

  update bookings
  set status = 'completed'
  where id = p_booking_id
    and club_id = v_club_id;

  update rooms
  set status = 'busy'
  where id = v_room_id
    and club_id = v_club_id;

  return v_room_id;
end;
$$;
