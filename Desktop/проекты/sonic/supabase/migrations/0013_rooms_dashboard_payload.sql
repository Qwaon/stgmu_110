create or replace function get_rooms_dashboard_payload()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with auth_ctx as (
    select get_my_club_id() as club_id
  )
  select jsonb_build_object(
    'club_id', auth_ctx.club_id,
    'club_hourly_rate', (
      select c.hourly_rate
      from clubs c
      where c.id = auth_ctx.club_id
    ),
    'rooms', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.name)
      from rooms r
      where r.club_id = auth_ctx.club_id
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'room_id', s.room_id,
          'club_id', s.club_id,
          'client_name', s.client_name,
          'started_at', s.started_at,
          'ended_at', s.ended_at,
          'paused_at', s.paused_at,
          'paused_duration_ms', s.paused_duration_ms,
          'total_minutes', s.total_minutes,
          'total_amount', s.total_amount,
          'status', s.status,
          'scheduled_end_at', s.scheduled_end_at,
          'created_at', s.created_at,
          'orders', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', o.id,
                'session_id', o.session_id,
                'club_id', o.club_id,
                'item_name', o.item_name,
                'price', o.price,
                'quantity', o.quantity,
                'created_at', o.created_at
              )
              order by o.created_at
            )
            from orders o
            where o.session_id = s.id
          ), '[]'::jsonb)
        )
        order by s.started_at desc
      )
      from sessions s
      where s.club_id = auth_ctx.club_id
        and s.status in ('active', 'paused')
    ), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.starts_at)
      from bookings b
      where b.club_id = auth_ctx.club_id
        and b.status = 'active'
        and (b.ends_at is null or b.ends_at >= now())
    ), '[]'::jsonb),
    'menu_items', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.is_pinned desc, m.order_count desc)
      from menu_items m
      where m.club_id = auth_ctx.club_id
    ), '[]'::jsonb)
  )
  from auth_ctx;
$$;
