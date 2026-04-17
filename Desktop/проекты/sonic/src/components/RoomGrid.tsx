'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { undoEndSession } from '@/app/dashboard/rooms/actions'
import type { RoomWithSession, Booking, MenuItem, Order, ActiveSession, RoomStatus } from '@/lib/types'
import RoomCard from './RoomCard'
import UndoToast from './UndoToast'
import SessionExpiredDialog from './SessionExpiredDialog'
import ShiftSummaryModal from './ShiftSummaryModal'
import { IconList } from './icons'

interface Props {
  initialRooms: RoomWithSession[]
  initialBookings: Booking[]
  initialMenuItems: MenuItem[]
  clubId: string
  clubFirstHourRate: number
  clubSubsequentRate: number
}

interface UndoPending {
  sessionId: string
  roomId: string
}

export default function RoomGrid({ initialRooms, initialBookings, initialMenuItems, clubId, clubFirstHourRate, clubSubsequentRate }: Props) {
  const [rooms,         setRooms]         = useState(initialRooms)
  const [bookings,      setBookings]      = useState<Booking[]>(initialBookings)
  const [undoPending,   setUndoPending]   = useState<UndoPending | null>(null)
  const [showSummary,   setShowSummary]   = useState(false)
  const [realtimeOk,    setRealtimeOk]    = useState(true)
  const supabase = createClient()

  function sortRooms(nextRooms: RoomWithSession[]) {
    return [...nextRooms].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }

  function shouldShowBooking(booking: Booking) {
    return booking.status === 'active' && (booking.ends_at === null || new Date(booking.ends_at).getTime() >= Date.now())
  }

  function setRoomStatus(roomId: string, status: RoomStatus) {
    setRooms(prev => prev.map(room => room.id === roomId ? { ...room, status } : room))
  }

  function handleSessionEnded(sessionId: string, roomId: string) {
    removeSession(sessionId)
    setRoomStatus(roomId, bookingByRoomRef.current.has(roomId) ? 'booked' : 'free')
    setUndoPending({ sessionId, roomId })
  }

  async function fetchLiveSessionForRoom(roomId: string) {
    const { data } = await supabase
      .from('sessions')
      .select(`
        id, room_id, club_id, client_name, started_at, ended_at, paused_at,
        paused_duration_ms, total_minutes, total_amount, status, scheduled_end_at,
        created_at,
        orders(id, item_name, price, quantity, created_at, session_id, club_id)
      `)
      .eq('room_id', roomId)
      .in('status', ['active', 'paused'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return

    setRooms(prev => prev.map(room => (
      room.id === roomId
        ? { ...room, status: 'busy', active_session: { ...data, orders: data.orders ?? [] } }
        : room
    )))
  }

  async function fetchSessionWithOrders(sessionId: string) {
    const { data } = await supabase
      .from('sessions')
      .select(`
        id, room_id, club_id, client_name, started_at, ended_at, paused_at,
        paused_duration_ms, total_minutes, total_amount, status, scheduled_end_at,
        created_at,
        orders(id, item_name, price, quantity, created_at, session_id, club_id)
      `)
      .eq('id', sessionId)
      .single()

    if (!data || !['active', 'paused'].includes(data.status)) return

    setRooms(prev => prev.map(room => (
      room.id === data.room_id
        ? { ...room, active_session: { ...data, orders: data.orders ?? [] } }
        : room
    )))
  }

  function removeSession(sessionId: string) {
    setRooms(prev => prev.map(room => (
      room.active_session?.id === sessionId ? { ...room, active_session: null } : room
    )))
  }

  const bookingByRoom = useMemo(() => {
    const now = Date.now()
    const fourHoursMs = 4 * 60 * 60 * 1000
    const map = new Map<string, Booking>()
    for (const booking of bookings) {
      const startsAt = new Date(booking.starts_at).getTime()
      if (startsAt - now > fourHoursMs) continue
      const existing = map.get(booking.room_id)
      if (!existing || new Date(existing.starts_at).getTime() > startsAt) {
        map.set(booking.room_id, booking)
      }
    }
    return map
  }, [bookings])

  const bookingByRoomRef = useRef(bookingByRoom)
  bookingByRoomRef.current = bookingByRoom

  const roomStats = useMemo(() => {
    let busy = 0, free = 0, booked = 0
    for (const r of rooms) {
      if (r.active_session) busy++
      else if (bookingByRoom.has(r.id)) booked++
      else free++
    }
    return { total: rooms.length, busy, free, booked }
  }, [rooms, bookingByRoom])

  // Subscribe to Realtime changes on rooms + sessions + bookings
  useEffect(() => {
    const channel = supabase
      .channel(`club-rooms-${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rooms',
        filter: `club_id=eq.${clubId}`,
      }, payload => {
        const nextRoom = payload.new as RoomWithSession
        const prevRoom = payload.old as RoomWithSession

        setRooms(prev => {
          if (payload.eventType === 'DELETE') {
            return prev.filter(room => room.id !== prevRoom.id)
          }

          if (payload.eventType === 'INSERT') {
            return sortRooms([...prev, { ...nextRoom, active_session: null }])
          }

          return sortRooms(prev.map(room => {
            if (room.id !== nextRoom.id) return room
            return { ...room, ...nextRoom, active_session: room.active_session }
          }))
        })
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sessions',
        filter: `club_id=eq.${clubId}`,
      }, async payload => {
        const nextSession = payload.new as ActiveSession
        const prevSession = payload.old as ActiveSession

        if (payload.eventType === 'DELETE') {
          removeSession(prevSession.id)
          return
        }

        if (nextSession.status === 'completed') {
          removeSession(nextSession.id)
          return
        }

        if (payload.eventType === 'UPDATE' && prevSession.status === 'completed') {
          setRoomStatus(nextSession.room_id, 'busy')
          await fetchSessionWithOrders(nextSession.id)
          return
        }

        setRooms(prev => prev.map(room => {
          if (room.id !== nextSession.room_id) return room
          const previousOrders = room.active_session?.id === nextSession.id ? room.active_session.orders : []
          return {
            ...room,
            active_session: { ...nextSession, orders: previousOrders },
          }
        }))
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `club_id=eq.${clubId}`,
      }, payload => {
        const nextOrder = payload.new as Order
        const prevOrder = payload.old as Order

        setRooms(prev => prev.map(room => {
          const session = room.active_session
          if (!session) return room

          if (payload.eventType === 'DELETE') {
            if (session.id !== prevOrder.session_id) return room
            return {
              ...room,
              active_session: {
                ...session,
                orders: session.orders.filter(order => order.id !== prevOrder.id),
              },
            }
          }

          if (session.id !== nextOrder.session_id) return room
          const withoutCurrent = session.orders.filter(order => order.id !== nextOrder.id)
          return {
            ...room,
            active_session: {
              ...session,
              orders: [...withoutCurrent, nextOrder].sort((a, b) => a.created_at.localeCompare(b.created_at)),
            },
          }
        }))
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `club_id=eq.${clubId}`,
      }, payload => {
        const nextBooking = payload.new as Booking
        const prevBooking = payload.old as Booking

        setBookings(prev => {
          if (payload.eventType === 'DELETE') {
            return prev.filter(booking => booking.id !== prevBooking.id)
          }

          const merged = prev.filter(booking => booking.id !== nextBooking.id)
          if (!shouldShowBooking(nextBooking)) return merged
          return [...merged, nextBooking].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        })
      })
      .subscribe((status) => {
        setRealtimeOk(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [clubId])

  async function handleUndo() {
    if (!undoPending) return
    try {
      await undoEndSession(undoPending.sessionId, undoPending.roomId)
      setUndoPending(null)
      setRoomStatus(undoPending.roomId, 'busy')
      await fetchSessionWithOrders(undoPending.sessionId)
    } catch {
      /* silent — session may already be expired */
    }
  }

  async function handleSessionStarted(roomId: string) {
    setRoomStatus(roomId, 'busy')
    await fetchLiveSessionForRoom(roomId)
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

      {!realtimeOk && (
        <div className="mb-4 border border-yellow-500/30 bg-yellow-500/10 rounded-lg px-4 py-2 text-yellow-400 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
          Нет связи с сервером. Данные могут быть неактуальны.
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: 'Всего',    value: roomStats.total,  color: 'text-white'          },
          { label: 'Занято',   value: roomStats.busy,   color: 'text-status-busy'   },
          { label: 'Свободно', value: roomStats.free,   color: 'text-status-free'   },
          { label: 'Брони',    value: roomStats.booked, color: 'text-status-booked' },
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
            menuItems={initialMenuItems}
            upcomingBooking={bookingByRoom.get(room.id)}
            onStarted={handleSessionStarted}
            onEnded={handleSessionEnded}
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
