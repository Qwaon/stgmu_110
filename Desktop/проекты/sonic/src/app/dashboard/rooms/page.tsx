import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RoomWithSession, Booking, MenuItem, ActiveSession, Room } from '@/lib/types'
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

  const clubId             = profile.club_id as string
  const { data: dashboardData, error } = await supabase.rpc('get_rooms_dashboard_payload')
  const payload = dashboardData as {
    club_id: string | null
    club_hourly_rate: number | null
    rooms: Room[]
    sessions: ActiveSession[]
    bookings: Booking[]
    menu_items: MenuItem[]
  } | null

  const clubHourlyRate     = payload?.club_hourly_rate ?? 500
  const clubFirstHourRate  = clubHourlyRate
  const clubSubsequentRate = clubHourlyRate

  if (error) console.error('Sessions fetch error:', error)

  // Build a map of room_id → active session
  const sessionByRoom = new Map<string, RoomWithSession['active_session']>()
  for (const session of payload?.sessions ?? []) {
    sessionByRoom.set(session.room_id, { ...session, orders: session.orders ?? [] })
  }

  const roomsWithSession: RoomWithSession[] = (payload?.rooms ?? []).map(room => ({
    ...room,
    active_session: sessionByRoom.get(room.id) ?? null,
  }))

  const bookings: Booking[] = payload?.bookings ?? []
  const menuItems: MenuItem[] = payload?.menu_items ?? []

  return (
    <RoomGrid
      initialRooms={roomsWithSession}
      initialBookings={bookings}
      initialMenuItems={menuItems}
      clubId={clubId}
      clubFirstHourRate={clubFirstHourRate}
      clubSubsequentRate={clubSubsequentRate}
    />
  )
}
