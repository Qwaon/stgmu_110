'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calculateElapsedMs, calculateSessionMinutes, calculateSessionAmount } from '@/lib/session'
import type { Order } from '@/lib/types'

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

export async function startSession(roomId: string) {
  const { supabase, clubId } = await getAuthContext()

  const { error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      room_id: roomId,
      club_id: clubId,
      client_name: null,
      status: 'active',
    })

  if (sessionErr) throw new Error(sessionErr.message)

  const { error: roomErr } = await supabase
    .from('rooms')
    .update({ status: 'busy' })
    .eq('id', roomId)
    .eq('club_id', clubId)

  if (roomErr) throw new Error(roomErr.message)
  revalidatePath('/dashboard/rooms')
}

export async function endSession(
  sessionId: string,
  roomId: string,
  _legacyHourlyRate?: number   // kept for compat, rates now read from room
): Promise<{ minutes: number; sessionAmount: number; ordersTotal: number; total: number }> {
  const { supabase, clubId } = await getAuthContext()

  const [{ data: session }, { data: room }, { data: club }] = await Promise.all([
    supabase.from('sessions').select('*, orders(*)').eq('id', sessionId).eq('club_id', clubId).single(),
    supabase.from('rooms').select('first_hour_rate, subsequent_rate, hourly_rate').eq('id', roomId).single(),
    supabase.from('clubs').select('hourly_rate').eq('id', clubId).single(),
  ])

  if (!session) throw new Error('Session not found')

  const fallback      = club?.hourly_rate ?? 500
  const firstHourRate = room?.first_hour_rate ?? fallback
  const subsequentRate = room?.subsequent_rate ?? fallback

  const elapsedMs = calculateElapsedMs(
    session.started_at,
    session.paused_at,
    session.paused_duration_ms
  )
  const minutes       = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, firstHourRate, subsequentRate)
  const ordersTotal   = (session.orders as Order[]).reduce(
    (sum, o) => sum + o.price * o.quantity, 0
  )
  const total = Math.round((sessionAmount + ordersTotal) * 100) / 100

  const { error } = await supabase
    .from('sessions')
    .update({
      ended_at:      new Date().toISOString(),
      status:        'completed',
      total_minutes: minutes,
      total_amount:  total,
    })
    .eq('id', sessionId)

  if (error) throw new Error(error.message)

  await supabase
    .from('rooms')
    .update({ status: 'free' })
    .eq('id', roomId)
    .eq('club_id', clubId)

  revalidatePath('/dashboard/rooms')
  return { minutes, sessionAmount, ordersTotal, total }
}

export async function undoEndSession(sessionId: string, roomId: string) {
  const { supabase, clubId } = await getAuthContext()

  await supabase
    .from('sessions')
    .update({ ended_at: null, status: 'active', total_minutes: null, total_amount: null })
    .eq('id', sessionId)
    .eq('club_id', clubId)

  await supabase
    .from('rooms')
    .update({ status: 'busy' })
    .eq('id', roomId)
    .eq('club_id', clubId)

  revalidatePath('/dashboard/rooms')
}

export async function pauseSession(sessionId: string) {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .eq('status', 'active')

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rooms')
}

export async function addOrder(
  sessionId: string,
  menuItemId: string,
  quantity: number
): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  // Снапшот цены и названия на момент заказа
  const { data: item, error: itemErr } = await supabase
    .from('menu_items')
    .select('name, price')
    .eq('id', menuItemId)
    .eq('club_id', clubId)
    .single()

  if (itemErr || !item) throw new Error('Menu item not found')

  const { error: orderErr } = await supabase
    .from('orders')
    .insert({
      session_id: sessionId,
      club_id:    clubId,
      item_name:  item.name,
      price:      item.price,
      quantity,
    })

  if (orderErr) throw new Error(orderErr.message)

  // Атомарный инкремент счётчика популярности
  await supabase.rpc('increment_order_count', { item_id: menuItemId, amount: quantity })

  revalidatePath('/dashboard/rooms')
}

export async function resumeSession(sessionId: string) {
  const { supabase, clubId } = await getAuthContext()

  const { data: session } = await supabase
    .from('sessions')
    .select('paused_at, paused_duration_ms')
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .single()

  if (!session?.paused_at) throw new Error('Session is not paused')

  const additionalMs       = Date.now() - new Date(session.paused_at).getTime()
  const newPausedDurationMs = session.paused_duration_ms + additionalMs

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'active', paused_at: null, paused_duration_ms: newPausedDurationMs })
    .eq('id', sessionId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rooms')
}
