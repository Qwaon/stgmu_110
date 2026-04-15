'use client'
import { useState, useEffect } from 'react'
import type { RoomWithSession, Booking } from '@/lib/types'
import SessionTimer from './SessionTimer'
import StartSessionModal from './StartSessionModal'
import SessionSheet from './SessionSheet'
import { IconCalendar, IconAlert, IconPlay, IconStop, IconPlus } from './icons'

const STATUS_BORDER = { free: 'border-status-free',   busy: 'border-status-busy',   booked: 'border-status-booked' } as const
const STATUS_DOT    = { free: 'bg-status-free',        busy: 'bg-status-busy',        booked: 'bg-status-booked'    } as const
const STATUS_LABEL  = { free: 'Свободна',              busy: 'Занята',                booked: 'Забронирована'       } as const
const STATUS_TEXT   = { free: 'text-status-free',      busy: 'text-status-busy',      booked: 'text-status-booked'  } as const

interface Props {
  room: RoomWithSession
  clubId: string
  clubFirstHourRate: number
  clubSubsequentRate: number
  upcomingBooking?: Booking
  onEnded?: (sessionId: string, roomId: string) => void
}

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

  return (
    <div className={`bg-bg rounded-lg p-4 border ${STATUS_BORDER[room.status]} flex flex-col gap-3 transition-colors hover:bg-white/[0.02] ${isPulsing ? 'ring-1 ring-status-booked/50' : ''}`}>

      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[room.status]}`} />
            <h3 className="text-white font-semibold text-sm leading-tight truncate">{room.name}</h3>
            {room.type === 'vip' && (
              <span className="text-[9px] font-bold tracking-widest text-white/50 border border-white/20 px-1 py-0.5 rounded uppercase flex-shrink-0">
                VIP
              </span>
            )}
          </div>
          <span className={`text-xs font-medium uppercase tracking-wide ${STATUS_TEXT[room.status]} pl-3.5`}>
            {STATUS_LABEL[room.status]}
          </span>
        </div>
        <span className="text-text-muted text-xs whitespace-nowrap font-mono">{firstHourRate}/{subsequentRate} ₽</span>
      </div>

      {/* Upcoming booking */}
      {upcomingBooking && !session && (
        <div className="border border-status-booked/30 rounded px-2.5 py-1.5 flex items-center gap-1.5">
          <IconCalendar className="text-status-booked flex-shrink-0" />
          <span className="text-status-booked text-xs font-medium truncate">
            {upcomingBooking.client_name} · {formatBookingTime(upcomingBooking.starts_at)}
          </span>
        </div>
      )}

      {/* Session end alert */}
      {isPulsing && session?.scheduled_end_at && (
        <div className="border border-orange-400/30 rounded px-2.5 py-1.5 flex items-center gap-1.5">
          <IconAlert className="text-orange-400 flex-shrink-0" />
          <p className="text-orange-400 text-xs font-medium">
            Заканчивается в {formatBookingTime(session.scheduled_end_at)}
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
            className="flex-1 border border-white/20 hover:border-white/50 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <IconPlay />
            Начать
          </button>
        )}
        {room.status === 'busy' && session && (
          <>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconPlus />
              Заказ
            </button>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 border border-status-busy/40 hover:border-status-busy text-status-busy text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconStop />
              Завершить
            </button>
          </>
        )}
        {room.status === 'booked' && (
          <p className="text-status-booked/60 text-xs flex-1 text-center py-1">Ожидает заселения</p>
        )}
      </div>

      {showStart && <StartSessionModal room={room} onClose={() => setShowStart(false)} />}
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
