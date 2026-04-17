'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Club } from '@/lib/types'
import { IconDownload } from '../icons'

const RechartsChart = dynamic(() => import('recharts').then(mod => {
  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } = mod
  function Chart({ data, clubs, colors, formatter }: {
    data: Record<string, string | number>[]
    clubs: Club[]
    colors: string[]
    formatter: (value: unknown, name: unknown) => [string, string]
  }) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="day" tick={{ fill: '#666666', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={{ fill: '#666666', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}к`} width={36} />
          <Tooltip
            contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
            labelStyle={{ color: '#666666', fontSize: 12 }}
            itemStyle={{ color: '#ffffff', fontSize: 13 }}
            formatter={formatter}
          />
          {clubs.map((c, i) => (
            <Line key={c.id} type="monotone" dataKey={c.id} stroke={colors[i % colors.length]} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }
  return Chart
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Загрузка графика...</div> })

interface DailyRow { club_id: string; day: string; revenue: number }
interface HeatmapRow { dow: number; hour: number; count: number }
interface Summary { sessionCount: number; totalRevenue: number; averageCheck: number | null; averageDuration: number | null }
interface ExportSession { club_id: string; ended_at: string; total_minutes: number | null; total_amount: number | null }

interface Props {
  clubs: Club[]
  daily: DailyRow[]
  heatmap: HeatmapRow[]
  summary: Summary
  sessionsForExport: ExportSession[]
}

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const CLUB_COLORS = ['#ffffff', '#22c55e']

function exportCSV(sessions: ExportSession[], clubs: Club[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const clubMap = Object.fromEntries(clubs.map(c => [c.id, c.name]))
  const headers = ['Дата', 'Время', 'Клуб', 'Мин', 'Сумма (₽)']
  const rows = sessions.map(s => [
    s.ended_at ? new Date(s.ended_at).toLocaleDateString('ru-RU') : '',
    s.ended_at ? new Date(s.ended_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
    clubMap[s.club_id] ?? s.club_id,
    s.total_minutes ?? '',
    s.total_amount ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `sonic-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function OwnerAnalytics({ clubs, daily, heatmap: heatmapRows, summary, sessionsForExport }: Props) {
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set(clubs.map(c => c.id)))
  const selectedClubList = useMemo(
    () => clubs.filter(c => selectedClubs.has(c.id)),
    [clubs, selectedClubs]
  )
  const clubNameById = useMemo(() => new Map(clubs.map(c => [c.id, c.name])), [clubs])

  // Build chart data from pre-aggregated daily rows
  const dailyData = useMemo(() => {
    const days: string[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const sums = new Map<string, number>()
    for (const row of daily) {
      if (!selectedClubs.has(row.club_id)) continue
      sums.set(`${row.club_id}:${row.day}`, row.revenue)
    }

    return days.map(day => {
      const row: Record<string, string | number> = { day }
      for (const club of selectedClubList) {
        row[club.id] = sums.get(`${club.id}:${day}`) ?? 0
      }
      return row
    })
  }, [daily, selectedClubs, selectedClubList])

  // Build heatmap grid from pre-aggregated rows
  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
    for (const row of heatmapRows) {
      grid[row.dow][row.hour] = row.count
    }
    return grid
  }, [heatmapRows])

  const maxHeat = useMemo(() => Math.max(...heatmap.flat(), 1), [heatmap])

  function toggleClub(id: string) {
    setSelectedClubs(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } else next.add(id)
      return next
    })
  }

  const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
    const clubId = typeof name === 'string' ? name : ''
    const num = typeof value === 'number' ? value : 0
    return [`${Math.round(num).toLocaleString('ru-RU')} ₽`, clubNameById.get(clubId) ?? clubId]
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white font-semibold text-lg tracking-wide">Аналитика</h1>
        <button
          onClick={() => exportCSV(sessionsForExport, clubs)}
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
        <RechartsChart data={dailyData} clubs={selectedClubList} colors={CLUB_COLORS} formatter={tooltipFormatter} />
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
          { label: 'Сессий за 30 дней', value: summary.sessionCount },
          {
            label: 'Общая выручка',
            value: `${Math.round(summary.totalRevenue).toLocaleString('ru-RU')} ₽`
          },
          {
            label: 'Средний чек',
            value: summary.averageCheck !== null
              ? `${Math.round(summary.averageCheck).toLocaleString('ru-RU')} ₽`
              : '—'
          },
          {
            label: 'Средняя длит.',
            value: summary.averageDuration !== null
              ? `${Math.round(summary.averageDuration)} мин`
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
