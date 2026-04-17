'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconX, IconDownload } from './icons'

interface Props {
  clubId: string
  onClose: () => void
}

interface ShiftSummarySession {
  id: string
  client_name: string | null
  started_at: string
  ended_at: string | null
  total_minutes: number | null
  total_amount: number | null
  orders_total: number
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function ShiftSummaryModal({ clubId, onClose }: Props) {
  const [sessions, setSessions] = useState<ShiftSummarySession[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.resolve(
      supabase.rpc('get_shift_summary_payload', { p_club_id: clubId })
    ).then(({ data, error: rpcError }) => {
        if (rpcError) {
          setError('Не удалось загрузить данные смены')
          setLoading(false)
          return
        }
        const raw = data as ShiftSummarySession[] | null
        setSessions(raw ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Ошибка сети')
        setLoading(false)
      })
  }, [clubId])

  const totalRevenue   = sessions.reduce((s, x) => s + (x.total_amount ?? 0), 0)
  const ordersRevenue  = sessions.reduce((s, x) => s + x.orders_total, 0)
  const sessionRevenue = totalRevenue - ordersRevenue
  const avgCheck       = sessions.length ? Math.round(totalRevenue / sessions.length) : 0
  const totalMinutes   = sessions.reduce((s, x) => s + (x.total_minutes ?? 0), 0)

  function exportCSV() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = ['Клиент', 'Начало', 'Конец', 'Мин', 'Аренда (₽)', 'Заказы (₽)', 'Итого (₽)']
    const rows = sessions.map(s => {
      return [
        s.client_name,
        s.started_at ? formatTime(s.started_at) : '',
        s.ended_at   ? formatTime(s.ended_at)   : '',
        s.total_minutes ?? '',
        Math.round((s.total_amount ?? 0) - s.orders_total),
        Math.round(s.orders_total),
        s.total_amount ?? '',
      ]
    })
    const totals = ['ИТОГО', '', '', totalMinutes, Math.round(sessionRevenue), Math.round(ordersRevenue), Math.round(totalRevenue)]
    const csv = [headers, ...rows, totals].map(r => r.map(esc).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `смена-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">Сводка смены</h2>
            <p className="text-text-muted text-xs">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">Загрузка...</div>
        ) : error ? (
          <div className="p-8 text-center text-status-busy text-sm">{error}</div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="p-4 border-b border-white/10 grid grid-cols-2 gap-2 flex-shrink-0">
              <StatBox label="Сессий"      value={String(sessions.length)} />
              <StatBox label="Выручка"     value={`${Math.round(totalRevenue).toLocaleString('ru-RU')} ₽`} highlight />
              <StatBox label="Аренда"      value={`${Math.round(sessionRevenue).toLocaleString('ru-RU')} ₽`} />
              <StatBox label="Заказы"      value={`${Math.round(ordersRevenue).toLocaleString('ru-RU')} ₽`} />
              <StatBox label="Средний чек" value={avgCheck ? `${avgCheck.toLocaleString('ru-RU')} ₽` : '—'} />
              <StatBox label="Всего минут" value={totalMinutes ? `${totalMinutes} мин` : '—'} />
            </div>

            {/* Session list */}
            <div className="overflow-y-auto flex-1 p-4">
              {sessions.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Сегодня сессий не было</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => {
                    return (
                      <div key={s.id} className="border border-white/10 rounded-lg px-3 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          {s.client_name && <p className="text-white text-sm font-medium truncate">{s.client_name}</p>}
                          <p className="text-text-muted text-xs">
                            {s.started_at ? formatTime(s.started_at) : ''}–{s.ended_at ? formatTime(s.ended_at) : ''}
                            {' · '}{s.total_minutes ?? 0} мин
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-semibold text-sm">{s.total_amount ?? 0} ₽</p>
                          {s.orders_total > 0 && <p className="text-text-muted text-xs">+{s.orders_total} ₽ заказы</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex gap-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={exportCSV}
                disabled={sessions.length === 0}
                className="flex-1 border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <IconDownload />
                CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border border-white/10 rounded-lg px-3 py-2.5">
      <p className={`font-bold text-base ${highlight ? 'text-white' : 'text-white'}`}>{value}</p>
      <p className="text-text-muted text-xs">{label}</p>
    </div>
  )
}
