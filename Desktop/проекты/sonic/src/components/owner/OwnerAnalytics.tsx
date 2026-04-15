'use client'
import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Club, Session } from '@/lib/types'

interface Props {
  clubs: Club[]
  sessions: Session[]
}

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const CLUB_COLORS = ['#4a43a0', '#22c55e']

// ── helpers ────────────────────────────────────────────────────────────────

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function buildDailyRevenue(sessions: Session[], clubs: Club[]) {
  // Build last-30-day keys
  const keys: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    keys.push(dateKey(d.toISOString()))
  }

  // revenue per club per day
  const data = keys.map(day => {
    const row: Record<string, string | number> = { day }
    for (const club of clubs) {
      row[club.id] = sessions
        .filter(s => s.club_id === club.id && s.ended_at && dateKey(s.ended_at) === day)
        .reduce((sum, s) => sum + (s.total_amount ?? 0), 0)
    }
    return row
  })
  return data
}

function buildHeatmap(sessions: Session[]) {
  // [dayOfWeek 0-6][hour 0-23] = count
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const s of sessions) {
    if (!s.started_at) continue
    const d = new Date(s.started_at)
    grid[d.getDay()][d.getHours()]++
  }
  return grid
}

// ── CSV export ─────────────────────────────────────────────────────────────

function exportCSV(sessions: Session[], clubs: Club[]) {
  const clubMap = Object.fromEntries(clubs.map(c => [c.id, c.name]))
  const headers = ['Дата', 'Время', 'Клуб', 'Клиент', 'Мин', 'Сумма (₽)']
  const rows = sessions.map(s => [
    s.ended_at ? new Date(s.ended_at).toLocaleDateString('ru-RU') : '',
    s.ended_at ? new Date(s.ended_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
    clubMap[s.club_id] ?? s.club_id,
    s.client_name,
    s.total_minutes ?? '',
    s.total_amount ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `psclub-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── component ──────────────────────────────────────────────────────────────

export default function OwnerAnalytics({ clubs, sessions }: Props) {
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set(clubs.map(c => c.id)))

  const filtered = useMemo(
    () => sessions.filter(s => selectedClubs.has(s.club_id)),
    [sessions, selectedClubs]
  )

  const dailyData  = useMemo(() => buildDailyRevenue(filtered, clubs.filter(c => selectedClubs.has(c.id))), [filtered, clubs, selectedClubs])
  const heatmap    = useMemo(() => buildHeatmap(filtered), [filtered])

  const maxHeat = useMemo(() => Math.max(...heatmap.flat(), 1), [heatmap])

  function toggleClub(id: string) {
    setSelectedClubs(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } else next.add(id)
      return next
    })
  }

  // Tooltip formatter
  const tooltipFormatter = (value: unknown, name: unknown) => {
    const clubId = typeof name === 'string' ? name : ''
    const club = clubs.find(c => c.id === clubId)
    const num = typeof value === 'number' ? value : 0
    return [`${Math.round(num).toLocaleString('ru-RU')} ₽`, club?.name ?? clubId]
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white font-bold text-xl">Аналитика</h1>
        <button
          onClick={() => exportCSV(filtered, clubs)}
          className="bg-surface-2 hover:bg-surface-3 border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          ↓ Экспорт CSV
        </button>
      </div>

      {/* Club filter */}
      <div className="flex gap-2">
        {clubs.map((c, i) => (
          <button
            key={c.id}
            onClick={() => toggleClub(c.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              selectedClubs.has(c.id)
                ? 'border-transparent text-white'
                : 'bg-surface border-white/10 text-text-muted'
            }`}
            style={selectedClubs.has(c.id) ? { backgroundColor: CLUB_COLORS[i % CLUB_COLORS.length] } : {}}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-surface rounded-2xl p-5 border border-white/5">
        <p className="text-white font-semibold mb-4">Выручка за 30 дней</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#6b6b8a', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: '#6b6b8a', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}к`}
              width={36}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              labelStyle={{ color: '#a0a0b8', fontSize: 12 }}
              itemStyle={{ color: '#ffffff', fontSize: 13 }}
              formatter={tooltipFormatter}
            />
            {clubs.filter(c => selectedClubs.has(c.id)).map((c, i) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={c.id}
                stroke={CLUB_COLORS[i % CLUB_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="bg-surface rounded-2xl p-5 border border-white/5">
        <p className="text-white font-semibold mb-4">Пиковые часы (сессий за 30 дней)</p>

        {/* Hour labels */}
        <div className="flex mb-1 ml-7 gap-px">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[8px] text-text-muted">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        <div className="space-y-px">
          {DAYS_RU.map((day, di) => (
            <div key={di} className="flex items-center gap-1">
              <span className="text-text-muted text-[10px] w-6 text-right flex-shrink-0">{day}</span>
              <div className="flex flex-1 gap-px">
                {heatmap[di].map((count, hi) => {
                  const intensity = count / maxHeat
                  return (
                    <div
                      key={hi}
                      title={`${day} ${hi}:00 — ${count} сессий`}
                      className="flex-1 rounded-[2px] h-5"
                      style={{
                        backgroundColor: count === 0
                          ? 'rgba(255,255,255,0.03)'
                          : `rgba(74, 67, 160, ${0.15 + intensity * 0.85})`,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-text-muted text-[10px]">Меньше</span>
          {[0.1, 0.3, 0.55, 0.75, 1].map(v => (
            <div
              key={v}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(74, 67, 160, ${0.15 + v * 0.85})` }}
            />
          ))}
          <span className="text-text-muted text-[10px]">Больше</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Сессий за 30 дней', value: filtered.length },
          {
            label: 'Общая выручка',
            value: `${Math.round(filtered.reduce((s, x) => s + (x.total_amount ?? 0), 0)).toLocaleString('ru-RU')} ₽`
          },
          {
            label: 'Средний чек',
            value: filtered.length
              ? `${Math.round(filtered.reduce((s, x) => s + (x.total_amount ?? 0), 0) / filtered.length).toLocaleString('ru-RU')} ₽`
              : '—'
          },
          {
            label: 'Средняя длит.',
            value: filtered.filter(s => s.total_minutes).length
              ? `${Math.round(filtered.filter(s => s.total_minutes).reduce((s, x) => s + (x.total_minutes ?? 0), 0) / filtered.filter(s => s.total_minutes).length)} мин`
              : '—'
          },
        ].map(stat => (
          <div key={stat.label} className="bg-surface rounded-xl p-4 border border-white/5">
            <p className="text-white font-bold text-lg">{stat.value}</p>
            <p className="text-text-muted text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
