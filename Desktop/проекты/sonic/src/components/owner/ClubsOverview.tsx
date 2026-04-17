'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ClubOverviewStat } from '@/lib/types'

interface Props {
  stats: ClubOverviewStat[]
}

export default function ClubsOverview({ stats: initialStats }: Props) {
  const [stats, setStats] = useState(initialStats)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const supabaseRef = useRef(createClient())

  const refetch = useCallback(async () => {
    const { data } = await supabaseRef.current.rpc('get_clubs_overview')
    if (data) setStats(data as ClubOverviewStat[])
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

function ClubCard({ stat }: { stat: ClubOverviewStat }) {
  const { club, rooms, activeSessions, revenueToday, revenueWeek, revenueMonth, sessionsToday, averageDurationToday } = stat
  return (
    <div className="border border-white/10 rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-white font-semibold text-base">{club.name}</h2>
        {club.address && <p className="text-text-muted text-xs mt-0.5">{club.address}</p>}
      </div>

      {/* Room status */}
      <div className="flex gap-2 mb-4">
        <RoomPill label="Занято"    value={rooms.busy}   color="text-status-busy"   border="border-status-busy/30"   />
        <RoomPill label="Свободно"  value={rooms.free}   color="text-status-free"   border="border-status-free/30"   />
        <RoomPill label="Забронир." value={rooms.booked} color="text-status-booked" border="border-status-booked/30" />
        <RoomPill label="Активных"  value={activeSessions} color="text-white" border="border-white/20" />
      </div>

      {/* Revenue */}
      <div className="border border-white/10 rounded-lg p-4 mb-3">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">Выручка</p>
        <div className="grid grid-cols-3 gap-3">
          <RevenueBlock label="Сегодня" amount={revenueToday} />
          <RevenueBlock label="Неделя"  amount={revenueWeek} />
          <RevenueBlock label="Месяц"   amount={revenueMonth} />
        </div>
      </div>

      {/* Session stats */}
      <div className="flex gap-2">
        <StatBlock label="Сессий сегодня" value={String(sessionsToday)} />
        <StatBlock label="Средняя длит."  value={averageDurationToday ? `${averageDurationToday} мин` : '—'} />
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
