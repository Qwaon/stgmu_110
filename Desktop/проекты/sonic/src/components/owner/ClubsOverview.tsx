'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ClubStats } from '@/app/owner/clubs/page'
import type { Room, Session } from '@/lib/types'

interface Props {
  stats: ClubStats[]
}

function startOf(period: 'day' | 'week' | 'month'): Date {
  const d = new Date()
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

function revenue(sessions: Session[], period: 'day' | 'week' | 'month'): number {
  const from = startOf(period).getTime()
  return sessions
    .filter(s => s.ended_at && new Date(s.ended_at).getTime() >= from)
    .reduce((sum, s) => sum + (s.total_amount ?? 0), 0)
}

function sessionsToday(sessions: Session[]): number {
  const from = startOf('day').getTime()
  return sessions.filter(s => s.ended_at && new Date(s.ended_at).getTime() >= from).length
}

function avgDuration(sessions: Session[]): number {
  const from = startOf('day').getTime()
  const today = sessions.filter(s => s.ended_at && new Date(s.ended_at).getTime() >= from && s.total_minutes)
  if (today.length === 0) return 0
  return Math.round(today.reduce((sum, s) => sum + (s.total_minutes ?? 0), 0) / today.length)
}

export default function ClubsOverview({ stats: initialStats }: Props) {
  const [stats, setStats] = useState(initialStats)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const supabase = createClient()

  const refetch = useCallback(async () => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [{ data: rooms }, { data: completed }, { data: active }] = await Promise.all([
      supabase.from('rooms').select('*'),
      supabase.from('sessions').select('*').eq('status', 'completed').gte('ended_at', monthStart.toISOString()),
      supabase.from('sessions').select('*').in('status', ['active', 'paused']),
    ])

    setStats(prev => prev.map(s => ({
      ...s,
      rooms:          (rooms ?? []).filter((r: Room) => r.club_id === s.club.id),
      sessions:       (completed ?? []).filter((sess: Session) => sess.club_id === s.club.id),
      activeSessions: (active ?? []).filter((sess: Session) => sess.club_id === s.club.id),
    })))
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    const t = setInterval(refetch, 60_000)
    return () => clearInterval(t)
  }, [refetch])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-semibold text-lg tracking-wide">Обзор клубов</h1>
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-xs">
            {lastRefresh.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={refetch}
            className="border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            Обновить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stats.map(s => (
          <ClubCard key={s.club.id} stat={s} />
        ))}
      </div>
    </div>
  )
}

function ClubCard({ stat: { club, rooms, sessions, activeSessions } }: { stat: ClubStats }) {
  const todayRevenue  = revenue(sessions, 'day')
  const weekRevenue   = revenue(sessions, 'week')
  const monthRevenue  = revenue(sessions, 'month')
  const countToday    = sessionsToday(sessions)
  const avg           = avgDuration(sessions)

  const free   = rooms.filter(r => r.status === 'free').length
  const busy   = rooms.filter(r => r.status === 'busy').length
  const booked = rooms.filter(r => r.status === 'booked').length

  return (
    <div className="border border-white/10 rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-white font-semibold text-base">{club.name}</h2>
        {club.address && <p className="text-text-muted text-xs mt-0.5">{club.address}</p>}
      </div>

      {/* Room status */}
      <div className="flex gap-2 mb-4">
        <RoomPill label="Занято"    value={busy}   color="text-status-busy"   border="border-status-busy/30"   />
        <RoomPill label="Свободно"  value={free}   color="text-status-free"   border="border-status-free/30"   />
        <RoomPill label="Забронир." value={booked} color="text-status-booked" border="border-status-booked/30" />
        <RoomPill label="Активных"  value={activeSessions.length} color="text-white" border="border-white/20" />
      </div>

      {/* Revenue */}
      <div className="border border-white/10 rounded-lg p-4 mb-3">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">Выручка</p>
        <div className="grid grid-cols-3 gap-3">
          <RevenueBlock label="Сегодня" amount={todayRevenue} />
          <RevenueBlock label="Неделя"  amount={weekRevenue} />
          <RevenueBlock label="Месяц"   amount={monthRevenue} />
        </div>
      </div>

      {/* Session stats */}
      <div className="flex gap-2">
        <StatBlock label="Сессий сегодня" value={String(countToday)} />
        <StatBlock label="Средняя длит."  value={avg ? `${avg} мин` : '—'} />
        <StatBlock label="Тариф"          value={`${club.hourly_rate} ₽/ч`} />
      </div>
    </div>
  )
}

function RoomPill({ label, value, color, border }: { label: string; value: number; color: string; border: string }) {
  return (
    <div className={`border ${border} rounded-lg px-2.5 py-2 flex-1 text-center`}>
      <p className={`${color} font-bold text-lg leading-none`}>{value}</p>
      <p className="text-text-muted text-[10px] mt-0.5">{label}</p>
    </div>
  )
}

function RevenueBlock({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="text-center">
      <p className="text-white font-semibold text-base leading-tight">{Math.round(amount).toLocaleString('ru-RU')} ₽</p>
      <p className="text-text-muted text-[10px] mt-0.5">{label}</p>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 rounded-lg px-2.5 py-2 flex-1 text-center">
      <p className="text-white font-semibold text-sm">{value}</p>
      <p className="text-text-muted text-[10px] mt-0.5">{label}</p>
    </div>
  )
}
