'use server'
import { createClient } from '@/lib/supabase/server'
import { assertUUID } from '@/lib/validation'
import { validateBookingWindow } from '@/lib/bookings'
import type { Booking } from '@/lib/types'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Unauthorized')
  if (profile.role !== 'admin') throw new Error('Forbidden: admin role required')
  if (!profile.club_id) throw new Error('No club assigned')
  return { supabase, clubId: profile.club_id as string }
}

function throwActionError(message: string | undefined, fallback: string): never {
  throw new Error(message || fallback)
}

export async function createBooking(
  roomId: string,
  phone: string,
  startsAt: string,
  endsAt: string | null,
  notes: string
): Promise<{ error?: string; booking?: Booking }> {
  try { assertUUID(roomId, 'roomId') } catch { return { error: 'Некорректный ID комнаты' } }
  const { supabase, clubId } = await getAuthContext()

  if (phone.length > 30) return { error: 'Телефон слишком длинный' }
  if (notes.length > 500) return { error: 'Заметка слишком длинная' }

  const validationError = validateBookingWindow(startsAt, endsAt)
  if (validationError) return { error: validationError }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', roomId)
    .eq('club_id', clubId)
    .single()

  if (roomError || !room) return { error: 'Комната не найдена' }

  // Conflict check: treat open-ended bookings as ending in far future.
  // Two queries cover all four overlap cases (timed/open × timed/open).
  const farFuture    = '2099-12-31T23:59:59.999Z'
  const effectiveEnd = endsAt ?? farFuture

  const [{ data: timedConflicts }, { data: openConflicts }] = await Promise.all([
    // Existing timed bookings that overlap our window
    supabase.from('bookings').select('id')
      .eq('room_id', roomId).eq('status', 'active')
      .not('ends_at', 'is', null)
      .lt('starts_at', effectiveEnd)
      .gt('ends_at', startsAt)
      .limit(1),
    // Existing open-ended bookings that start before our effective end
    supabase.from('bookings').select('id')
      .eq('room_id', roomId).eq('status', 'active')
      .is('ends_at', null)
      .lt('starts_at', effectiveEnd)
      .limit(1),
  ])

  if ((timedConflicts?.length ?? 0) + (openConflicts?.length ?? 0) > 0) {
    return { error: 'Это время уже занято другой бронью' }
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      club_id:     clubId,
      room_id:     roomId,
      client_name: null,
      phone:       phone.trim() || null,
      starts_at:   startsAt,
      ends_at:     endsAt,
      notes:       notes.trim() || null,
      status:      'active',
    })
    .select('*')
    .single()

  if (error?.message?.includes('bookings_no_overlap_per_room')) {
    return { error: 'Это время уже занято другой бронью' }
  }
  if (error) return { error: 'Не удалось создать бронь' }

  // Room stays free — it's available for sessions until the booking time.
  // No room.status change here; RoomCard will show the booking badge.

  return { booking: booking as Booking }
}

export async function cancelBooking(bookingId: string): Promise<void> {
  assertUUID(bookingId, 'bookingId')
  const { supabase, clubId } = await getAuthContext()

  // Verify booking belongs to this club before calling RPC
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('club_id', clubId)
    .single()

  if (!booking) throw new Error('Бронь не найдена')

  const { error } = await supabase.rpc('cancel_booking_atomic', { p_booking_id: bookingId })
  if (error) throwActionError(error.message, 'Failed to cancel booking')
}

export async function checkInBooking(bookingId: string): Promise<void> {
  assertUUID(bookingId, 'bookingId')
  const { supabase, clubId } = await getAuthContext()

  // Verify booking belongs to this club before calling RPC
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('club_id', clubId)
    .single()

  if (!booking) throw new Error('Бронь не найдена')

  const { error } = await supabase.rpc('check_in_booking_atomic', { p_booking_id: bookingId })
  if (error) throwActionError(error.message, 'Failed to check in booking')
}
