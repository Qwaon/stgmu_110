import type { Club, Room, Session, AnalyticsSession, ClubOverviewStat } from '@/lib/types'

function startOf(period: 'day' | 'week' | 'month', now = new Date()): Date {
  const d = new Date(now)
  if (period === 'day') {
    d.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

export function dateKey(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function buildDailyRevenueData(sessions: AnalyticsSession[], clubIds: string[], now = new Date()) {
  const days: string[] = []
  const sums = new Map<string, number>()

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(dateKey(d.toISOString()))
  }

  for (const session of sessions) {
    if (!session.ended_at) continue
    const key = `${session.club_id}:${dateKey(session.ended_at)}`
    sums.set(key, (sums.get(key) ?? 0) + (session.total_amount ?? 0))
  }

  return days.map(day => {
    const row: Record<string, string | number> = { day }
    for (const clubId of clubIds) {
      row[clubId] = sums.get(`${clubId}:${day}`) ?? 0
    }
    return row
  })
}

export function buildHeatmap(sessions: AnalyticsSession[]) {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const session of sessions) {
    const d = new Date(session.started_at)
    grid[d.getDay()][d.getHours()]++
  }
  return grid
}

export function summarizeAnalyticsSessions(sessions: AnalyticsSession[]) {
  let totalRevenue = 0
  let durationSum = 0
  let durationCount = 0

  for (const session of sessions) {
    totalRevenue += session.total_amount ?? 0
    if (session.total_minutes) {
      durationSum += session.total_minutes
      durationCount++
    }
  }

  return {
    totalRevenue,
    sessionCount: sessions.length,
    averageCheck: sessions.length ? totalRevenue / sessions.length : null,
    averageDuration: durationCount ? durationSum / durationCount : null,
  }
}

export function buildClubOverviewStats(
  clubs: Club[],
  rooms: Pick<Room, 'club_id' | 'status'>[],
  completedSessions: Pick<Session, 'club_id' | 'ended_at' | 'total_amount' | 'total_minutes'>[],
  activeSessions: Pick<Session, 'club_id'>[],
  now = new Date(),
): ClubOverviewStat[] {
  const dayStart = startOf('day', now).getTime()
  const weekStart = startOf('week', now).getTime()
  const monthStart = startOf('month', now).getTime()

  const roomCounters = new Map<string, ClubOverviewStat['rooms']>()
  const metrics = new Map<string, Omit<ClubOverviewStat, 'club'> & { totalDurationToday: number; durationCountToday: number }>()

  for (const club of clubs) {
    roomCounters.set(club.id, { free: 0, busy: 0, booked: 0 })
    metrics.set(club.id, {
      rooms: { free: 0, busy: 0, booked: 0 },
      activeSessions: 0,
      revenueToday: 0,
      revenueWeek: 0,
      revenueMonth: 0,
      sessionsToday: 0,
      averageDurationToday: null,
      totalDurationToday: 0,
      durationCountToday: 0,
    })
  }

  for (const room of rooms) {
    const entry = metrics.get(room.club_id)
    if (!entry) continue
    entry.rooms[room.status]++
  }

  for (const session of activeSessions) {
    const entry = metrics.get(session.club_id)
    if (entry) entry.activeSessions++
  }

  for (const session of completedSessions) {
    if (!session.ended_at) continue
    const entry = metrics.get(session.club_id)
    if (!entry) continue
    const endedAt = new Date(session.ended_at).getTime()
    const amount = session.total_amount ?? 0

    if (endedAt >= monthStart) entry.revenueMonth += amount
    if (endedAt >= weekStart) entry.revenueWeek += amount
    if (endedAt >= dayStart) {
      entry.revenueToday += amount
      entry.sessionsToday++
      if (session.total_minutes) {
        entry.totalDurationToday += session.total_minutes
        entry.durationCountToday++
      }
    }
  }

  return clubs.map(club => {
    const entry = metrics.get(club.id)!
    return {
      club,
      rooms: entry.rooms,
      activeSessions: entry.activeSessions,
      revenueToday: entry.revenueToday,
      revenueWeek: entry.revenueWeek,
      revenueMonth: entry.revenueMonth,
      sessionsToday: entry.sessionsToday,
      averageDurationToday: entry.durationCountToday
        ? Math.round(entry.totalDurationToday / entry.durationCountToday)
        : null,
    }
  })
}
