create or replace function get_shift_summary_payload(p_club_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_role text := get_my_role();
  v_my_club_id uuid := get_my_club_id();
  v_start timestamptz;
  v_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if v_role <> 'owner' and v_my_club_id <> p_club_id then
    raise exception 'Forbidden';
  end if;

  v_start := date_trunc('day', now());
  v_end := v_start + interval '1 day' - interval '1 millisecond';

  return (
    with session_rows as (
      select
        s.id,
        s.client_name,
        s.started_at,
        s.ended_at,
        s.total_minutes,
        s.total_amount,
        coalesce((
          select sum(o.price * o.quantity)
          from orders o
          where o.session_id = s.id
        ), 0) as orders_total
      from sessions s
      where s.club_id = p_club_id
        and s.status = 'completed'
        and s.ended_at >= v_start
        and s.ended_at <= v_end
      order by s.ended_at
    )
    select jsonb_build_object(
      'sessions',
      coalesce((
        select jsonb_agg(to_jsonb(session_rows))
        from session_rows
      ), '[]'::jsonb)
    )
  );
end;
$$;
