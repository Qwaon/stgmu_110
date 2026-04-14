'use client'
import { useState } from 'react'
import { pauseSession, resumeSession } from '@/app/dashboard/rooms/actions'
import {
  calculateElapsedMs,
  calculateSessionAmount,
  calculateSessionMinutes,
} from '@/lib/session'
import type { Room, ActiveSession } from '@/lib/types'
import SessionTimer from './SessionTimer'
import AddOrderModal from './AddOrderModal'
import EndSessionModal from './EndSessionModal'

interface Props {
  room: Room
  session: ActiveSession
  clubId: string
  hourlyRate: number
  onClose: () => void
  onEnded?: (sessionId: string, roomId: string) => void
}

export default function SessionSheet({ room, session, clubId, hourlyRate, onClose, onEnded }: Props) {
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [showEnd, setShowEnd]           = useState(false)
  const [pausing, setPausing]           = useState(false)

  const elapsedMs     = calculateElapsedMs(session.started_at, session.paused_at, session.paused_duration_ms)
  const minutes       = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, hourlyRate)
  const ordersTotal   = session.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  const total         = Math.round((sessionAmount + ordersTotal) * 100) / 100

  async function handlePauseResume() {
    setPausing(true)
    try {
      if (session.status === 'active') await pauseSession(session.id)
      else await resumeSession(session.id)
    } finally {
      setPausing(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-surface rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl">

          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-start">
            <div>
              <h2 className="text-white font-bold text-base">{room.name}</h2>
              <p className="text-text-muted text-sm">{session.client_name}</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white text-xl leading-none mt-0.5">×</button>
          </div>

          {/* Таймер + предварительная сумма */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <SessionTimer
              startedAt={session.started_at}
              pausedAt={session.paused_at}
              pausedDurationMs={session.paused_duration_ms}
              status={session.status}
            />
            <div className="text-right">
              <p className="text-white font-bold text-lg">{total} ₽</p>
              <p className="text-text-muted text-xs">предварительно</p>
            </div>
          </div>

          {/* Список заказов */}
          <div className="p-4 border-b border-white/10">
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">Заказы</p>
            {session.orders.length === 0 ? (
              <p className="text-text-muted text-sm">Нет заказов</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {session.orders.map(order => (
                  <div key={order.id} className="flex justify-between text-sm">
                    <span className="text-white">{order.item_name} ×{order.quantity}</span>
                    <span className="text-text-muted">{(order.price * order.quantity).toFixed(0)} ₽</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowAddOrder(true)}
              className="mt-1 w-full bg-surface-2 hover:bg-surface-3 text-accent-light text-sm font-semibold py-2 rounded-xl border border-white/5 transition-colors"
            >
              + Добавить позицию
            </button>
          </div>

          {/* Кнопки действий */}
          <div className="p-4 flex gap-2">
            <button
              onClick={handlePauseResume}
              disabled={pausing}
              className="flex-1 bg-surface-2 hover:bg-surface-3 disabled:opacity-50 text-text-muted text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {session.status === 'paused' ? '▶ Возобновить' : '⏸ Пауза'}
            </button>
            <button
              onClick={() => setShowEnd(true)}
              className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              ■ Завершить
            </button>
          </div>
        </div>
      </div>

      {showAddOrder && (
        <AddOrderModal
          sessionId={session.id}
          clubId={clubId}
          onClose={() => setShowAddOrder(false)}
          onAdded={() => setShowAddOrder(false)}
        />
      )}

      {showEnd && (
        <EndSessionModal
          room={room}
          session={session}
          hourlyRate={hourlyRate}
          onClose={() => setShowEnd(false)}
          onEnded={(sid, rid) => { onEnded?.(sid, rid); onClose() }}
        />
      )}
    </>
  )
}
