'use client'
import { useEffect, useState } from 'react'
import type { RoomWithSession } from '@/lib/types'
import EndSessionModal from './EndSessionModal'
import { IconAlert, IconStop } from './icons'

interface Props {
  rooms: RoomWithSession[]
  clubFirstHourRate: number
  clubSubsequentRate: number
}

interface ExpiredSession {
  room: RoomWithSession
  firstHourRate: number
  subsequentRate: number
}

export default function SessionExpiredDialog({ rooms, clubFirstHourRate, clubSubsequentRate }: Props) {
  const [expired,   setExpired]   = useState<ExpiredSession | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [showEnd,   setShowEnd]   = useState(false)

  useEffect(() => {
    function check() {
      for (const room of rooms) {
        const s = room.active_session
        if (!s?.scheduled_end_at) continue
        if (dismissed.has(s.id)) continue
        const remaining = new Date(s.scheduled_end_at).getTime() - Date.now()
        if (remaining <= 0) {
          setExpired({
            room,
            firstHourRate:  room.first_hour_rate  ?? clubFirstHourRate,
            subsequentRate: room.subsequent_rate  ?? clubSubsequentRate,
          })
          return
        }
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [rooms, dismissed, clubFirstHourRate, clubSubsequentRate])

  function dismiss() {
    if (expired?.room.active_session) {
      setDismissed(prev => new Set(prev).add(expired.room.active_session!.id))
    }
    setExpired(null)
    setShowEnd(false)
  }

  if (!expired) return null

  const { room, firstHourRate, subsequentRate } = expired
  const session = room.active_session!

  return (
    <>
      {!showEnd && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-bg border border-orange-400/40 rounded-lg p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <IconAlert className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Время вышло</p>
                <p className="text-text-muted text-xs truncate">
                  {room.name} · {session.client_name}
                </p>
                <p className="text-orange-400 text-xs mt-0.5">Оплата по факту времени</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={dismiss}
                className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Позже
              </button>
              <button
                onClick={() => setShowEnd(true)}
                className="flex-1 border border-status-busy/40 hover:border-status-busy text-status-busy text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <IconStop />
                Завершить
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <EndSessionModal
          room={room}
          session={session}
          firstHourRate={firstHourRate}
          subsequentRate={subsequentRate}
          onClose={dismiss}
          onEnded={dismiss}
        />
      )}
    </>
  )
}
