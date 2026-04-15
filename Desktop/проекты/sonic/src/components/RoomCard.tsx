'use client'
import { useState, useEffect } from 'react'
import type { RoomWithSession, Booking } from '@/lib/types'
import SessionTimer from './SessionTimer'
import StartSessionModal from './StartSessionModal'
import SessionSheet from './SessionSheet'

const STATUS_BORDER = { free: 'border-green-500', busy: 'border-red-500', booked: 'border-yellow-500' } as const
const STATUS_TEXT   = { free: 'text-green-400',   busy: 'text-red-400',   booked: 'text-yellow-400'  } as const
const STATUS_LABEL  = { free: 'Свободна',          busy: 'Занята',         booked: 'Забронирована'    } as const

interface Props {
  room: RoomWithSession
  clubId: string
  clubFirstHourRate: number
  clubSubsequentRate: number
  upcomingBooking?: Booking
  onEnded?: (sessionId: string, roomId: string) => void
}

/** Returns ms until scheduled_end_at, or null */
function msUntilEnd(scheduledEndAt: string | null): number | null {
  if (!scheduledEndAt) return null
  return new Date(scheduledEndAt).getTime() - Date.now()
}

function formatBookingTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function RoomCard({ room, clubId, clubFirstHourRate, clubSubsequentRate, upcomingBooking, onEnded }: Props) {
  const [showStart, setShowStart] = useState(false)
  const [showSheet, setShowSheet] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)

  const session        = room.active_session
  const firstHourRate  = room.first_hour_rate  ?? clubFirstHourRate
  const subsequentRate = room.subsequent_rate  ?? clubSubsequentRate

  // Check every 30s if session is within 15 min of scheduled end
  useEffect(() => {
    if (!session?.scheduled_end_at) { setIsPulsing(false); return }

    function check() {
      const remaining = msUntilEnd(session!.scheduled_end_at)
      setIsPulsing(remaining !== null && remaining > 0 && remaining <= 15 * 60 * 1000)
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [session?.scheduled_end_at])

  const pulseClass = isPulsing ? 'animate-pulse ring-2 ring-yellow-400/60' : ''

  return (
    <div className={`bg-surface rounded-2xl p-5 border-l-4 ${STATUS_BORDER[room.status]} flex flex-col gap-3 transition-colors hover:bg-surface-2 ${pulseClass}`}>

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
        <span className="text-text-muted text-xs whitespace-nowrap">{firstHourRate}/{subsequentRate} ₽</span>
      </div>

      {/* Upcoming booking badge (shown on free/booked rooms) */}
      {upcomingBooking && !session && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <span className="text-yellow-400 text-[10px]">📅</span>
          <span className="text-yellow-400 text-xs font-medium">
            {upcomingBooking.client_name} · {formatBookingTime(upcomingBooking.starts_at)}
          </span>
        </div>
      )}

      {/* Session end alert badge */}
      {isPulsing && session?.scheduled_end_at && (
        <div className="bg-orange-400/10 border border-orange-400/30 rounded-lg px-2.5 py-1.5">
          <p className="text-orange-400 text-xs font-semibold text-center">
            ⚠ Сессия заканчивается в {formatBookingTime(session.scheduled_end_at)}
          </p>
        </div>
      )}

      {/* Session info */}
      {session ? (
        <div className="space-y-1 cursor-pointer" onClick={() => setShowSheet(true)}>
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
          <>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 bg-surface-2 hover:bg-surface-3 text-accent-light text-sm font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              + Заказ
            </button>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              ■ Завершить
            </button>
          </>
        )}
        {room.status === 'booked' && (
          <p className="text-yellow-400/70 text-xs flex-1 text-center py-1">Ожидает заселения</p>
        )}
      </div>

      {showStart && (
        <StartSessionModal room={room} onClose={() => setShowStart(false)} />
      )}
      {showSheet && session && (
        <SessionSheet
          room={room}
          session={session}
          clubId={clubId}
          firstHourRate={firstHourRate}
          subsequentRate={subsequentRate}
          onClose={() => setShowSheet(false)}
          onEnded={onEnded}
        />
      )}
    </div>
  )
}
