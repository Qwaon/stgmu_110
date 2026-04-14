'use client'
import { useState } from 'react'
import type { RoomWithSession } from '@/lib/types'
import SessionTimer from './SessionTimer'
import StartSessionModal from './StartSessionModal'
import EndSessionModal from './EndSessionModal'

const STATUS_BORDER = { free: 'border-green-500', busy: 'border-red-500', booked: 'border-yellow-500' } as const
const STATUS_TEXT   = { free: 'text-green-400',   busy: 'text-red-400',   booked: 'text-yellow-400'  } as const
const STATUS_LABEL  = { free: 'Свободна',          busy: 'Занята',         booked: 'Забронирована'    } as const

interface Props {
  room: RoomWithSession
  clubHourlyRate: number
}

export default function RoomCard({ room, clubHourlyRate }: Props) {
  const [showStart, setShowStart] = useState(false)
  const [showEnd, setShowEnd]     = useState(false)

  const session    = room.active_session
  const hourlyRate = room.hourly_rate ?? clubHourlyRate

  return (
    <div className={`bg-surface rounded-2xl p-5 border-l-4 ${STATUS_BORDER[room.status]} flex flex-col gap-3 transition-colors hover:bg-surface-2`}>

      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-sm leading-tight">{room.name}</h3>
            {room.type === 'vip' && (
              <span className="text-[10px] font-bold tracking-widest text-accent-light bg-accent/20 px-1.5 py-0.5 rounded uppercase">
                VIP
              </span>
            )}
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${STATUS_TEXT[room.status]}`}>
            {STATUS_LABEL[room.status]}
          </span>
        </div>
        <span className="text-text-muted text-xs whitespace-nowrap">{hourlyRate} ₽/ч</span>
      </div>

      {/* Session info */}
      {session ? (
        <div className="space-y-1">
          <p className="text-white font-medium text-sm truncate">{session.client_name}</p>
          <SessionTimer
            startedAt={session.started_at}
            pausedAt={session.paused_at}
            pausedDurationMs={session.paused_duration_ms}
            status={session.status}
          />
          {session.orders.length > 0 && (
            <p className="text-text-muted text-xs">
              {session.orders.length} заказ{session.orders.length > 1 ? 'а' : ''}
            </p>
          )}
        </div>
      ) : (
        <p className="text-text-muted text-xs flex-1">Нет активных сессий</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {room.status === 'free' && (
          <button
            onClick={() => setShowStart(true)}
            className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2 px-3 rounded-xl transition-colors"
          >
            ▶ Начать
          </button>
        )}
        {room.status === 'busy' && session && (
          <button
            onClick={() => setShowEnd(true)}
            className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold py-2 px-3 rounded-xl transition-colors"
          >
            ■ Завершить
          </button>
        )}
      </div>

      {showStart && (
        <StartSessionModal room={room} onClose={() => setShowStart(false)} />
      )}
      {showEnd && session && (
        <EndSessionModal
          room={room}
          session={session}
          hourlyRate={hourlyRate}
          onClose={() => setShowEnd(false)}
        />
      )}
    </div>
  )
}
