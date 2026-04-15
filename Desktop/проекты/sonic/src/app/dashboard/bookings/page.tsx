export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Booking, Room } from '@/lib/types'
import BookingsList from '@/components/BookingsList'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Клуб не назначен. Обратитесь к владельцу.</p>
      </div>
    )
  }

  const clubId = profile.club_id as string

  // Active bookings that haven't ended yet
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('*')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')

  // All rooms for the club (for the create modal + day view)
  const { data: roomsData } = await supabase
    .from('rooms')
    .select('*')
    .eq('club_id', clubId)
    .order('name')

  const bookings: Booking[] = bookingsData ?? []
  const rooms: Room[]       = roomsData ?? []

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-white font-semibold text-lg tracking-wide mb-6">Бронирования</h1>
      <BookingsList
        initialBookings={bookings}
        rooms={rooms}
        clubId={clubId}
      />
    </div>
  )
}
