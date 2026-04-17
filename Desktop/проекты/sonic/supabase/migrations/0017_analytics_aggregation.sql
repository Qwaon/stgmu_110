-- P4: Index on sessions.ended_at for analytics queries
create index if not exists idx_sessions_ended_at on sessions (ended_at)
  where ended_at is not null;

-- P1: Aggregated clubs overview — replaces fetching all raw rows
create or replace function get_clubs_overview()
returns jsonb
language sql
security definer
volatile
set search_path = public, pg_temp
as $$
  with
    day_start  as (select (current_date at time zone 'UTC') as ts),
    week_start as (select ((current_date - 6) at time zone 'UTC') as ts),
    month_start as (select (date_trunc('month', current_date) at time zone 'UTC') as ts),

    room_counts as (
      select club_id,
        count(*) filter (where status = 'free')   as free,
        count(*) filter (where status = 'busy')   as busy,
        count(*) filter (where status = 'booked') as booked
      from rooms
      group by club_id
    ),

    active_counts as (
      select club_id, count(*) as cnt
      from sessions
      where status in ('active', 'paused')
      group by club_id
    ),

    revenue as (
      select
        s.club_id,
        coalesce(sum(s.total_amount) filter (
          where s.ended_at >= (select ts from day_start)
        ), 0) as revenue_today,
        coalesce(sum(s.total_amount) filter (
          where s.ended_at >= (select ts from week_start)
        ), 0) as revenue_week,
        coalesce(sum(s.total_amount), 0) as revenue_month,
        count(*) filter (
          where s.ended_at >= (select ts from day_start)
        ) as sessions_today,
        avg(s.total_minutes) filter (
          where s.ended_at >= (select ts from day_start) and s.total_minutes is not null
        ) as avg_duration_today
      from sessions s
      where s.status = 'completed'
        and s.ended_at >= (select ts from month_start)
      group by s.club_id
    )

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'club', to_jsonb(c),
      'rooms', jsonb_build_object(
        'free',   coalesce(rc.free, 0),
        'busy',   coalesce(rc.busy, 0),
        'booked', coalesce(rc.booked, 0)
      ),
      'activeSessions',      coalesce(ac.cnt, 0),
      'revenueToday',        coalesce(rev.revenue_today, 0),
      'revenueWeek',         coalesce(rev.revenue_week, 0),
      'revenueMonth',        coalesce(rev.revenue_month, 0),
      'sessionsToday',       coalesce(rev.sessions_today, 0),
      'averageDurationToday', case
        when rev.avg_duration_today is not null then round(rev.avg_duration_today)
        else null
      end
    )
    order by c.name
  ), '[]'::jsonb)
  from clubs c
  left join room_counts rc on rc.club_id = c.id
  left join active_counts ac on ac.club_id = c.id
  left join revenue rev on rev.club_id = c.id;
$$;


-- P2: Aggregated analytics — daily revenue + heatmap + summary in one call
create or replace function get_owner_analytics(p_days int default 30)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_since timestamptz;
  v_result jsonb;
begin
  v_since := (current_date - p_days) at time zone 'UTC';

  select jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object('club_id', sub.club_id, 'day', sub.day, 'revenue', sub.revenue)
        order by sub.day, sub.club_id
      )
      from (
        select
          s.club_id,
          to_char(s.ended_at at time zone 'UTC', 'DD.MM') as day,
          coalesce(sum(s.total_amount), 0) as revenue
        from sessions s
        where s.status = 'completed'
          and s.ended_at >= v_since
        group by s.club_id, to_char(s.ended_at at time zone 'UTC', 'DD.MM')
      ) sub
    ), '[]'::jsonb),

    'heatmap', coalesce((
      select jsonb_agg(
        jsonb_build_object('dow', sub.dow, 'hour', sub.hr, 'count', sub.cnt)
        order by sub.dow, sub.hr
      )
      from (
        select
          extract(dow from s.started_at at time zone 'UTC')::int as dow,
          extract(hour from s.started_at at time zone 'UTC')::int as hr,
          count(*) as cnt
        from sessions s
        where s.status = 'completed'
          and s.ended_at >= v_since
        group by 1, 2
      ) sub
    ), '[]'::jsonb),

    'summary', (
      select jsonb_build_object(
        'sessionCount', count(*),
        'totalRevenue', coalesce(sum(s.total_amount), 0),
        'averageCheck', case when count(*) > 0
          then round(sum(s.total_amount) / count(*), 2) else null end,
        'averageDuration', case when count(*) filter (where s.total_minutes is not null) > 0
          then round(avg(s.total_minutes) filter (where s.total_minutes is not null))
          else null end
      )
      from sessions s
      where s.status = 'completed'
        and s.ended_at >= v_since
    ),

    'sessions_for_export', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'club_id', s.club_id,
          'ended_at', s.ended_at,
          'total_minutes', s.total_minutes,
          'total_amount', s.total_amount
        )
        order by s.ended_at
      )
      from sessions s
      where s.status = 'completed'
        and s.ended_at >= v_since
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
