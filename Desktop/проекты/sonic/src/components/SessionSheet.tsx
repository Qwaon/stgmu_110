'use client'
import { useEffect, useState } from 'react'
import { pauseSession, resumeSession } from '@/app/dashboard/rooms/actions'
import {
  calculateElapsedMs,
  calculateSessionAmount,
  calculateSessionMinutes,
} from '@/lib/session'
import type { Room, ActiveSession, MenuItem, Order } from '@/lib/types'
import SessionTimer from './SessionTimer'
import AddOrderModal from './AddOrderModal'
import EndSessionModal from './EndSessionModal'
import { IconX, IconPause, IconResume, IconPlus, IconStop } from './icons'

interface Props {
  room: Room
  session: ActiveSession
  clubId: string
  menuItems: MenuItem[]
  firstHourRate: number
  subsequentRate: number
  onClose: () => void
  onEnded?: (sessionId: string, roomId: string) => void | Promise<void>
}

export default function SessionSheet({ room, session, clubId, menuItems, firstHourRate, subsequentRate, onClose, onEnded }: Props) {
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [showEnd, setShowEnd]           = useState(false)
  const [pausing, setPausing]           = useState(false)
  const [sessionState, setSessionState] = useState(session)

  useEffect(() => {
    setSessionState(session)
  }, [session])

  const elapsedMs     = calculateElapsedMs(sessionState.started_at, sessionState.paused_at, sessionState.paused_duration_ms)
  const minutes       = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, firstHourRate, subsequentRate)
  const ordersTotal   = sessionState.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  const total         = Math.round((sessionAmount + ordersTotal) * 100) / 100

  async function handlePauseResume() {
    setPausing(true)
    try {
      if (sessionState.status === 'active') {
        await pauseSession(sessionState.id)
        setSessionState(prev => ({ ...prev, status: 'paused', paused_at: new Date().toISOString() }))
      } else {
        await resumeSession(sessionState.id)
        const pausedAt = sessionState.paused_at
        const additionalMs = pausedAt ? Date.now() - new Date(pausedAt).getTime() : 0
        setSessionState(prev => ({
          ...prev,
          status: 'active',
          paused_at: null,
          paused_duration_ms: prev.paused_duration_ms + Math.max(0, additionalMs),
        }))
      }
    } finally {
      setPausing(false)
    }
  }

  function handleOrderAdded(order: Order) {
    setSessionState(prev => ({
      ...prev,
      orders: [...prev.orders, order].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }))
    setShowAddOrder(false)
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
                startedAt={sessionState.started_at}
                pausedAt={sessionState.paused_at}
                pausedDurationMs={sessionState.paused_duration_ms}
                status={sessionState.status}
              />
              <span className="text-white font-semibold">{total} ₽</span>
            </div>
            <p className="text-text-muted text-xs">
              {minutes} мин · аренда {sessionAmount} ₽{ordersTotal > 0 ? ` · заказы ${ordersTotal} ₽` : ''}
            </p>
          </div>

          {/* Orders list */}
          {sessionState.orders.length > 0 && (
            <div className="p-4 border-b border-white/10 space-y-1.5">
              {sessionState.orders.map(order => (
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
              {sessionState.status === 'active'
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
          sessionId={sessionState.id}
          clubId={clubId}
          items={menuItems}
          onClose={() => setShowAddOrder(false)}
          onAdded={handleOrderAdded}
        />
      )}

      {showEnd && (
        <EndSessionModal
          room={room}
          session={sessionState}
          firstHourRate={firstHourRate}
          subsequentRate={subsequentRate}
          onClose={() => setShowEnd(false)}
          onEnded={(sid, rid) => { onEnded?.(sid, rid); onClose() }}
        />
      )}
    </>
  )
}
