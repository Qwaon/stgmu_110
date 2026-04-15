'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { undoEndSession } from '@/app/dashboard/rooms/actions'
import type { RoomWithSession, Booking } from '@/lib/types'
import RoomCard from './RoomCard'
import UndoToast from './UndoToast'
import SessionExpiredDialog from './SessionExpiredDialog'
import ShiftSummaryModal from './ShiftSummaryModal'
import { IconList } from './icons'

interface Props {
  initialRooms: RoomWithSession[]
  initialBookings: Booking[]
  clubId: string
  clubFirstHourRate: number
  clubSubsequentRate: number
}

interface UndoPending {
  sessionId: string
  roomId: string
}

export default function RoomGrid({ initialRooms, initialBookings, clubId, clubFirstHourRate, clubSubsequentRate }: Props) {
  const [rooms,         setRooms]         = useState(initialRooms)
  const [bookings,      setBookings]      = useState<Booking[]>(initialBookings)
  const [undoPending,   setUndoPending]   = useState<UndoPending | null>(null)
  const [showSummary,   setShowSummary]   = useState(false)
  const supabase = createClient()

  // Refetch all rooms for this club from Supabase
  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('rooms')
      .select(`
        *,
        sessions!inner(
          id, client_name, started_at, ended_at, paused_at,
          paused_duration_ms, total_minutes, total_amount, status, scheduled_end_at,
          orders(id, item_name, price, quantity, created_at, session_id, club_id)
        )
      `)
      .eq('club_id', clubId)
      .in('sessions.status', ['active', 'paused'])
      .order('name')

    const { data: allRooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('club_id', clubId)
      .order('name')

    if (!allRooms) return

    const sessionByRoom = new Map<string, RoomWithSession['active_session']>()
    for (const row of data ?? []) {
      const s = Array.isArray(row.sessions) ? row.sessions[0] : null
      if (s) sessionByRoom.set(row.id, { ...s, orders: s.orders ?? [] })
    }

    setRooms(allRooms.map(room => ({
      ...room,
      active_session: sessionByRoom.get(room.id) ?? null,
    })))
  }, [clubId])

  const refetchBookings = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at')
    setBookings(data ?? [])
  }, [clubId])

  // Subscribe to Realtime changes on rooms + sessions + bookings
  useEffect(() => {
    const channel = supabase
      .channel(`club-rooms-${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rooms',
        filter: `club_id=eq.${clubId}`,
      }, () => refetch())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sessions',
        filter: `club_id=eq.${clubId}`,
      }, () => refetch())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `club_id=eq.${clubId}`,
      }, () => refetch())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `club_id=eq.${clubId}`,
      }, () => refetchBookings())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId, refetch, refetchBookings])

  async function handleUndo() {
    if (!undoPending) return
    try {
      await undoEndSession(undoPending.sessionId, undoPending.roomId)
      setUndoPending(null)
      refetch()
    } catch {
      /* silent — session may already be expired */
    }
  }

  // Find the nearest upcoming booking per room (starts within 4 hours)
  function upcomingBookingForRoom(roomId: string): Booking | undefined {
    const now        = Date.now()
    const fourHoursMs = 4 * 60 * 60 * 1000
    return bookings.find(
      b => b.room_id === roomId && new Date(b.starts_at).getTime() - now <= fourHoursMs
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Комнаты не найдены. Проверьте настройки клуба.</p>
      </div>
    )
  }

  return (
    <>
      {/* Shift summary button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowSummary(true)}
          className="border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <IconList className="flex-shrink-0" />
          Сводка смены
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: 'Всего',    value: rooms.length,                                    color: 'text-white'          },
          { label: 'Занято',   value: rooms.filter(r => r.status === 'busy').length,   color: 'text-status-busy'   },
          { label: 'Свободно', value: rooms.filter(r => r.status === 'free').length,   color: 'text-status-free'   },
          { label: 'Брони',    value: rooms.filter(r => r.status === 'booked').length, color: 'text-status-booked' },
        ].map(stat => (
          <div key={stat.label} className="border border-white/10 rounded-lg px-4 py-2.5">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-text-muted text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Room cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            clubId={clubId}
            clubFirstHourRate={clubFirstHourRate}
            clubSubsequentRate={clubSubsequentRate}
            upcomingBooking={upcomingBookingForRoom(room.id)}
            onEnded={(sessionId, roomId) => setUndoPending({ sessionId, roomId })}
          />
        ))}
      </div>

      {undoPending && (
        <UndoToast
          onUndo={handleUndo}
          onExpire={() => setUndoPending(null)}
        />
      )}

      <SessionExpiredDialog
        rooms={rooms}
        clubFirstHourRate={clubFirstHourRate}
        clubSubsequentRate={clubSubsequentRate}
      />

      {showSummary && (
        <ShiftSummaryModal
          clubId={clubId}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  )
}
