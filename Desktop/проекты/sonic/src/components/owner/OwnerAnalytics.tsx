'use client'
import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Club, Session } from '@/lib/types'
import { IconDownload } from '../icons'

interface Props {
  clubs: Club[]
  sessions: Session[]
}

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const CLUB_COLORS = ['#ffffff', '#22c55e']

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function buildDailyRevenue(sessions: Session[], clubs: Club[]) {
  const keys: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    keys.push(dateKey(d.toISOString()))
  }

  return keys.map(day => {
    const row: Record<string, string | number> = { day }
    for (const club of clubs) {
      row[club.id] = sessions
        .filter(s => s.club_id === club.id && s.ended_at && dateKey(s.ended_at) === day)
        .reduce((sum, s) => sum + (s.total_amount ?? 0), 0)
    }
    return row
  })
}

function buildHeatmap(sessions: Session[]) {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const s of sessions) {
    if (!s.started_at) continue
    const d = new Date(s.started_at)
    grid[d.getDay()][d.getHours()]++
  }
  return grid
}

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
  a.download = `sonic-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function OwnerAnalytics({ clubs, sessions }: Props) {
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set(clubs.map(c => c.id)))

  const filtered = useMemo(
    () => sessions.filter(s => selectedClubs.has(s.club_id)),
    [sessions, selectedClubs]
  )

  const dailyData = useMemo(() => buildDailyRevenue(filtered, clubs.filter(c => selectedClubs.has(c.id))), [filtered, clubs, selectedClubs])
  const heatmap   = useMemo(() => buildHeatmap(filtered), [filtered])
  const maxHeat   = useMemo(() => Math.max(...heatmap.flat(), 1), [heatmap])

  function toggleClub(id: string) {
    setSelectedClubs(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } else next.add(id)
      return next
    })
  }

  const tooltipFormatter = (value: unknown, name: unknown) => {
    const clubId = typeof name === 'string' ? name : ''
    const club = clubs.find(c => c.id === clubId)
    const num = typeof value === 'number' ? value : 0
    return [`${Math.round(num).toLocaleString('ru-RU')} ₽`, club?.name ?? clubId]
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white font-semibold text-lg tracking-wide">Аналитика</h1>
        <button
          onClick={() => exportCSV(filtered, clubs)}
          className="border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <IconDownload />
          Экспорт CSV
        </button>
      </div>

      {/* Club filter */}
      <div className="flex gap-2">
        {clubs.map((c, i) => (
          <button
            key={c.id}
            onClick={() => toggleClub(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              selectedClubs.has(c.id)
                ? 'border-white/40 text-white'
                : 'border-white/10 text-text-muted hover:border-white/20'
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: CLUB_COLORS[i % CLUB_COLORS.length] }}
            />
            {c.name}
          </button>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="border border-white/10 rounded-lg p-5">
        <p className="text-white font-medium mb-4 text-sm">Выручка за 30 дней</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#666666', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: '#666666', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}к`}
              width={36}
            />
            <Tooltip
              contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
              labelStyle={{ color: '#666666', fontSize: 12 }}
              itemStyle={{ color: '#ffffff', fontSize: 13 }}
              formatter={tooltipFormatter}
            />
            {clubs.filter(c => selectedClubs.has(c.id)).map((c, i) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={c.id}
                stroke={CLUB_COLORS[i % CLUB_COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="border border-white/10 rounded-lg p-5">
        <p className="text-white font-medium mb-4 text-sm">Пиковые часы (сессий за 30 дней)</p>

        <div className="flex mb-1 ml-7 gap-px">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[8px] text-text-muted">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>

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
                          : `rgba(255,255,255,${0.1 + intensity * 0.7})`,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-text-muted text-[10px]">Меньше</span>
          {[0.1, 0.3, 0.55, 0.75, 1].map(v => (
            <div
              key={v}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(255,255,255,${0.1 + v * 0.7})` }}
            />
          ))}
          <span className="text-text-muted text-[10px]">Больше</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <div key={stat.label} className="border border-white/10 rounded-lg p-4">
            <p className="text-white font-bold text-lg">{stat.value}</p>
            <p className="text-text-muted text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
