'use client'
import { useState } from 'react'
import { endSession } from '@/app/dashboard/rooms/actions'
import { calculateElapsedMs, calculateSessionMinutes, calculateSessionAmount, formatDuration } from '@/lib/session'
import type { Room, ActiveSession } from '@/lib/types'

interface Props {
  room: Room
  session: ActiveSession
  firstHourRate: number
  subsequentRate: number
  onClose: () => void
  onEnded?: (sessionId: string, roomId: string) => void
}

export default function EndSessionModal({ room, session, firstHourRate, subsequentRate, onClose, onEnded }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Preview calculation at time of modal open
  const elapsedMs     = calculateElapsedMs(session.started_at, session.paused_at, session.paused_duration_ms)
  const minutes       = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, firstHourRate, subsequentRate)
  const ordersTotal   = session.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  const total         = Math.round((sessionAmount + ordersTotal) * 100) / 100

  async function handleEnd() {
    setLoading(true)
    setError(null)
    try {
      await endSession(session.id, room.id)
      onEnded?.(session.id, room.id)
      onClose()
    } catch {
      setError('Ошибка при завершении. Попробуйте снова.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">
        <h2 className="text-white font-bold text-lg mb-0.5">Завершить сессию</h2>
        <p className="text-text-muted text-sm mb-5">{room.name} · {session.client_name}</p>

        {/* Invoice */}
        <div className="bg-surface-2 rounded-xl p-4 space-y-2.5 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Время</span>
            <span className="text-white font-medium">
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
            <span className="text-white font-bold">Итого</span>
            <span className="text-accent-light font-black text-xl">{total} ₽</span>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-surface-2 hover:bg-surface-3 text-text-muted text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleEnd}
            disabled={loading}
            className="flex-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Завершение...' : '■ Завершить'}
          </button>
        </div>
      </div>
    </div>
  )
}
