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
import { IconX, IconPause, IconResume, IconPlus, IconStop } from './icons'

interface Props {
  room: Room
  session: ActiveSession
  clubId: string
  firstHourRate: number
  subsequentRate: number
  onClose: () => void
  onEnded?: (sessionId: string, roomId: string) => void
}

export default function SessionSheet({ room, session, clubId, firstHourRate, subsequentRate, onClose, onEnded }: Props) {
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [showEnd, setShowEnd]           = useState(false)
  const [pausing, setPausing]           = useState(false)

  const elapsedMs     = calculateElapsedMs(session.started_at, session.paused_at, session.paused_duration_ms)
  const minutes       = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, firstHourRate, subsequentRate)
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
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-bg border border-white/15 rounded-lg w-full max-w-sm shadow-2xl">

          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-start">
            <div>
              <h2 className="text-white font-semibold text-base">{room.name}</h2>
              {session.client_name && <p className="text-text-muted text-sm">{session.client_name}</p>}
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors mt-0.5">
              <IconX />
            </button>
          </div>

          {/* Timer + amount */}
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center mb-1">
              <SessionTimer
                startedAt={session.started_at}
                pausedAt={session.paused_at}
                pausedDurationMs={session.paused_duration_ms}
                status={session.status}
              />
              <span className="text-white font-semibold">{total} ₽</span>
            </div>
            <p className="text-text-muted text-xs">
              {minutes} мин · аренда {sessionAmount} ₽{ordersTotal > 0 ? ` · заказы ${ordersTotal} ₽` : ''}
            </p>
          </div>

          {/* Orders list */}
          {session.orders.length > 0 && (
            <div className="p-4 border-b border-white/10 space-y-1.5">
              {session.orders.map(order => (
                <div key={order.id} className="flex justify-between text-sm">
                  <span className="text-white">{order.item_name} <span className="text-text-muted">×{order.quantity}</span></span>
                  <span className="text-text-muted">{(order.price * order.quantity).toFixed(0)} ₽</span>
                </div>
              ))}
            </div>
          )}

          {/* Tariff */}
          <div className="px-4 py-2 border-b border-white/10">
            <p className="text-text-muted text-xs">{firstHourRate} ₽/1ч · {subsequentRate} ₽/ч далее</p>
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-2">
            <button
              onClick={handlePauseResume}
              disabled={pausing}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {session.status === 'active'
                ? <><IconPause /> Пауза</>
                : <><IconResume /> Продолжить</>
              }
            </button>
            <button
              onClick={() => setShowAddOrder(true)}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconPlus /> Заказ
            </button>
            <button
              onClick={() => setShowEnd(true)}
              className="flex-1 border border-status-busy/40 hover:border-status-busy text-status-busy text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconStop /> Завершить
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
          firstHourRate={firstHourRate}
          subsequentRate={subsequentRate}
          onClose={() => setShowEnd(false)}
          onEnded={(sid, rid) => { onEnded?.(sid, rid); onClose() }}
        />
      )}
    </>
  )
}
