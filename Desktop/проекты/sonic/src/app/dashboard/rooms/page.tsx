import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RoomWithSession } from '@/lib/types'
import RoomGrid from '@/components/RoomGrid'

export const dynamic = 'force-dynamic'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('club_id, clubs(hourly_rate)')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Клуб не назначен. Обратитесь к владельцу.</p>
      </div>
    )
  }

  const clubHourlyRate = (profile.clubs as { hourly_rate: number } | null)?.hourly_rate ?? 500

  // Fetch rooms with their active/paused session + session orders
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select(`
      *,
      sessions!inner(
        id, client_name, started_at, ended_at, paused_at,
        paused_duration_ms, total_minutes, total_amount, status,
        orders(id, item_name, price, quantity, created_at, session_id, club_id)
      )
    `)
    .eq('club_id', profile.club_id)
    .in('sessions.status', ['active', 'paused'])
    .order('name')

  // Also fetch rooms without active sessions (free rooms won't appear with !inner join)
  const { data: allRooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('club_id', profile.club_id)
    .order('name')

  if (error) {
    console.error('Sessions fetch error:', error)
  }

  // Build a map of room_id → active session
  const sessionByRoom = new Map<string, RoomWithSession['active_session']>()
  for (const row of rooms ?? []) {
    const session = Array.isArray(row.sessions) ? row.sessions[0] : null
    if (session) sessionByRoom.set(row.id, { ...session, orders: session.orders ?? [] })
  }

  const roomsWithSession: RoomWithSession[] = (allRooms ?? []).map(room => ({
    ...room,
    active_session: sessionByRoom.get(room.id) ?? null,
  }))

  return (
    <RoomGrid
      initialRooms={roomsWithSession}
      clubId={profile.club_id}
      defaultHourlyRate={clubHourlyRate}
    />
  )
}
