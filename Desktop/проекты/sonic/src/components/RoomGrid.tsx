'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { undoEndSession } from '@/app/dashboard/rooms/actions'
import type { RoomWithSession } from '@/lib/types'
import RoomCard from './RoomCard'
import UndoToast from './UndoToast'

interface Props {
  initialRooms: RoomWithSession[]
  clubId: string
  defaultHourlyRate: number
}

interface UndoPending {
  sessionId: string
  roomId: string
}

export default function RoomGrid({ initialRooms, clubId, defaultHourlyRate }: Props) {
  const [rooms, setRooms]           = useState(initialRooms)
  const [undoPending, setUndoPending] = useState<UndoPending | null>(null)
  const supabase = createClient()

  // Refetch all rooms for this club from Supabase
  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('rooms')
      .select(`
        *,
        sessions!inner(
          id, client_name, started_at, ended_at, paused_at,
          paused_duration_ms, total_minutes, total_amount, status,
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

  // Subscribe to Realtime changes on rooms + sessions
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
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId, refetch])

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

  if (rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Комнаты не найдены. Проверьте настройки клуба.</p>
      </div>
    )
  }

  return (
    <>
      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        {[
          { label: 'Всего', value: rooms.length, color: 'text-text-muted' },
          { label: 'Занято', value: rooms.filter(r => r.status === 'busy').length, color: 'text-red-400' },
          { label: 'Свободно', value: rooms.filter(r => r.status === 'free').length, color: 'text-green-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface rounded-xl px-4 py-2 border border-white/5">
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-text-muted text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Room cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            clubId={clubId}
            clubHourlyRate={defaultHourlyRate}
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
    </>
  )
}
