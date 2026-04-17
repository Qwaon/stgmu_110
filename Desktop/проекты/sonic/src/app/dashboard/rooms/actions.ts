'use server'
import { createClient } from '@/lib/supabase/server'
import { assertUUID } from '@/lib/validation'
import type { Order } from '@/lib/types'

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

export async function startSession(roomId: string) {
  assertUUID(roomId, 'roomId')
  const { supabase } = await getAuthContext()
  const { error } = await supabase.rpc('start_session_atomic', { p_room_id: roomId })
  if (error) throwActionError(error.message, 'Failed to start session')
}

export async function endSession(
  sessionId: string,
  roomId: string,
): Promise<{ minutes: number; sessionAmount: number; ordersTotal: number; total: number }> {
  assertUUID(sessionId, 'sessionId')
  assertUUID(roomId, 'roomId')
  const { supabase } = await getAuthContext()

  const { data: result, error } = await supabase.rpc('end_session_atomic', {
    p_session_id: sessionId,
    p_room_id: roomId,
  })
  if (error) throwActionError(error.message, 'Failed to end session')

  const r = result as { minutes: number; sessionAmount: number; ordersTotal: number; total: number }
  return {
    minutes: r.minutes,
    sessionAmount: r.sessionAmount,
    ordersTotal: r.ordersTotal,
    total: r.total,
  }
}

export async function undoEndSession(sessionId: string, roomId: string) {
  assertUUID(sessionId, 'sessionId')
  assertUUID(roomId, 'roomId')
  const { supabase } = await getAuthContext()
  const { error } = await supabase.rpc('undo_end_session_atomic', {
    p_session_id: sessionId,
    p_room_id: roomId,
  })
  if (error) throwActionError(error.message, 'Failed to restore session')
}

export async function pauseSession(sessionId: string) {
  assertUUID(sessionId, 'sessionId')
  const { supabase } = await getAuthContext()

  const { error } = await supabase.rpc('pause_session_atomic', {
    p_session_id: sessionId,
  })
  if (error) throwActionError(error.message, 'Failed to pause session')
}

export async function addOrder(
  sessionId: string,
  menuItemId: string,
  quantity: number
): Promise<Order> {
  assertUUID(sessionId, 'sessionId')
  assertUUID(menuItemId, 'menuItemId')
  const { supabase, clubId } = await getAuthContext()

  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
    throw new Error('Quantity must be between 1 and 99')
  }

  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .single()

  if (sessionErr || !session) throw new Error('Session not found')
  if (!['active', 'paused'].includes(session.status)) throw new Error('Cannot add orders to a completed session')

  // Снапшот цены и названия на момент заказа
  const { data: item, error: itemErr } = await supabase
    .from('menu_items')
    .select('name, price')
    .eq('id', menuItemId)
    .eq('club_id', clubId)
    .single()

  if (itemErr || !item) throw new Error('Menu item not found')

  const { data: insertedOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      session_id: sessionId,
      club_id:    clubId,
      item_name:  item.name,
      price:      item.price,
      quantity,
    })
    .select('*')
    .single()

  if (orderErr) throw new Error('Не удалось добавить заказ')

  // Атомарный инкремент счётчика популярности
  const { error: incError } = await supabase.rpc('increment_order_count', { item_id: menuItemId, amount: quantity })
  if (incError) console.error('increment_order_count failed:', incError.message)

  return insertedOrder as Order
}

export async function resumeSession(sessionId: string) {
  assertUUID(sessionId, 'sessionId')
  const { supabase } = await getAuthContext()

  const { error } = await supabase.rpc('resume_session_atomic', {
    p_session_id: sessionId,
  })
  if (error) throwActionError(error.message, 'Failed to resume session')
}
