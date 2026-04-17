'use client'
import { useState } from 'react'
import { startSession } from '@/app/dashboard/rooms/actions'
import type { Room } from '@/lib/types'
import { IconX } from './icons'

interface Props {
  room: Room
  onClose: () => void
  onStarted?: (roomId: string) => void | Promise<void>
  upcomingBookingAt?: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function StartSessionModal({ room, onClose, onStarted, upcomingBookingAt }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const minsToBooking = upcomingBookingAt
    ? Math.max(0, Math.ceil((new Date(upcomingBookingAt).getTime() - Date.now()) / 60_000))
    : null

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      await startSession(room.id)
      await onStarted?.(room.id)
      onClose()
    } catch {
      setError('Не удалось начать сессию. Попробуйте снова.')
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
            <h2 className="text-white font-semibold text-base">Начать сессию</h2>
            <p className="text-text-muted text-sm">{room.name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {minsToBooking !== null && minsToBooking <= 60 && (
          <div className="border border-orange-400/30 rounded-lg px-3 py-2 mb-4">
            <p className="text-orange-400 text-sm">
              Бронь в {formatTime(upcomingBookingAt!)} (через {minsToBooking} мин)
            </p>
          </div>
        )}

        {error && (
          <p className="text-status-busy text-sm border border-status-busy/30 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="flex-1 border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Запуск...' : 'Начать'}
          </button>
        </div>
      </div>
    </div>
  )
}
