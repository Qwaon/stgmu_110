'use client'
import { useState, useEffect } from 'react'
import { endSession } from '@/app/dashboard/rooms/actions'
import { calculateElapsedMs, calculateSessionMinutes, calculateSessionAmount, formatDuration } from '@/lib/session'
import type { Room, ActiveSession } from '@/lib/types'
import { IconX } from './icons'

interface Props {
  room: Room
  session: ActiveSession
  firstHourRate: number
  subsequentRate: number
  onClose: () => void
  onEnded?: (sessionId: string, roomId: string) => void | Promise<void>
}

export default function EndSessionModal({ room, session, firstHourRate, subsequentRate, onClose, onEnded }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  // Recalculate every 10s so the preview stays fresh while modal is open
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  const elapsedMs     = calculateElapsedMs(session.started_at, session.paused_at, session.paused_duration_ms)
  const minutes       = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, firstHourRate, subsequentRate)
  const ordersTotal   = session.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  const total         = Math.round((sessionAmount + ordersTotal) * 100) / 100
  void tick // used to trigger recalculation

  async function handleEnd() {
    setLoading(true)
    setError(null)
    try {
      await endSession(session.id, room.id)
      await onEnded?.(session.id, room.id)
      onClose()
    } catch {
      setError('Ошибка при завершении. Попробуйте снова.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Завершить сессию</h2>
            <p className="text-text-muted text-sm">{room.name}{session.client_name ? ` · ${session.client_name}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {/* Invoice */}
        <div className="border border-white/10 rounded-lg p-4 space-y-2.5 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Время</span>
            <span className="text-white font-medium font-mono">
              {formatDuration(elapsedMs)} <span className="text-text-muted text-xs">({minutes} мин)</span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Аренда</span>
            <span className="text-white font-medium">{sessionAmount} ₽</span>
          </div>

          {session.orders.map(order => (
            <div key={order.id} className="flex justify-between text-sm">
              <span className="text-text-muted">{order.item_name} ×{order.quantity}</span>
              <span className="text-white font-medium">{order.price * order.quantity} ₽</span>
            </div>
          ))}

          <div className="border-t border-white/10 pt-2.5 flex justify-between items-baseline">
            <span className="text-white font-semibold">Итого</span>
            <span className="text-white font-bold text-xl">{total} ₽</span>
          </div>
        </div>

        {error && (
          <p className="text-status-busy text-sm border border-status-busy/30 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleEnd}
            disabled={loading}
            className="flex-1 border border-status-busy/40 hover:border-status-busy disabled:opacity-40 text-status-busy text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Завершение...' : 'Завершить'}
          </button>
        </div>
      </div>
    </div>
  )
}
