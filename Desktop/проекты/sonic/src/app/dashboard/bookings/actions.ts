'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) throw new Error('No club assigned')
  return { supabase, clubId: profile.club_id as string }
}

export async function createBooking(
  roomId: string,
  clientName: string,
  phone: string,
  startsAt: string,
  endsAt: string,
  notes: string
): Promise<{ error?: string }> {
  const { supabase, clubId } = await getAuthContext()

  // Conflict check: any active booking for same room that overlaps
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'active')
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt)

  if (conflicts && conflicts.length > 0) {
    return { error: 'Это время уже занято другой бронью' }
  }

  const { error } = await supabase
    .from('bookings')
    .insert({
      club_id:     clubId,
      room_id:     roomId,
      client_name: clientName.trim(),
      phone:       phone.trim() || null,
      starts_at:   startsAt,
      ends_at:     endsAt,
      notes:       notes.trim() || null,
      status:      'active',
    })

  if (error) return { error: error.message }

  // Mark room as booked if it's currently free
  await supabase
    .from('rooms')
    .update({ status: 'booked' })
    .eq('id', roomId)
    .eq('club_id', clubId)
    .eq('status', 'free')

  revalidatePath('/dashboard/bookings')
  revalidatePath('/dashboard/rooms')
  return {}
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  // Get booking to know the room
  const { data: booking } = await supabase
    .from('bookings')
    .select('room_id')
    .eq('id', bookingId)
    .eq('club_id', clubId)
    .single()

  if (!booking) throw new Error('Booking not found')

  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('club_id', clubId)

  // Check if there are remaining active bookings for this room
  const { data: remaining } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', booking.room_id)
    .eq('status', 'active')

  // If no more active bookings and room has no active session → free it
  if (!remaining || remaining.length === 0) {
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('room_id', booking.room_id)
      .in('status', ['active', 'paused'])
      .limit(1)

    if (!activeSession || activeSession.length === 0) {
      await supabase
        .from('rooms')
        .update({ status: 'free' })
        .eq('id', booking.room_id)
        .eq('club_id', clubId)
        .eq('status', 'booked')
    }
  }

  revalidatePath('/dashboard/bookings')
  revalidatePath('/dashboard/rooms')
}

export async function checkInBooking(bookingId: string): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  // Get booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select('room_id, ends_at')
    .eq('id', bookingId)
    .eq('club_id', clubId)
    .single()

  if (!booking) throw new Error('Booking not found')

  // Start session with scheduled_end_at from booking
  const { error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      room_id:          booking.room_id,
      club_id:          clubId,
      client_name:      null,
      status:           'active',
      scheduled_end_at: booking.ends_at,
    })

  if (sessionErr) throw new Error(sessionErr.message)

  // Mark booking as completed
  await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)
    .eq('club_id', clubId)

  // Mark room as busy
  await supabase
    .from('rooms')
    .update({ status: 'busy' })
    .eq('id', booking.room_id)
    .eq('club_id', clubId)

  revalidatePath('/dashboard/bookings')
  revalidatePath('/dashboard/rooms')
}
