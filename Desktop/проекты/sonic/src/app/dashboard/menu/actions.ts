'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assertUUID } from '@/lib/validation'

async function getAuthContext(targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('club_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')

  if (profile.role === 'owner') {
    if (!targetClubId) throw new Error('Club is required')
    const { count } = await supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('id', targetClubId)
    if (!count) throw new Error('Forbidden')
    return { supabase, clubId: targetClubId }
  }

  if (!profile.club_id) throw new Error('No club assigned')
  if (targetClubId && targetClubId !== profile.club_id) throw new Error('Forbidden')
  return { supabase, clubId: profile.club_id as string }
}

export async function createMenuItem(name: string, price: number, clubId?: string): Promise<void> {
  if (clubId) assertUUID(clubId, 'clubId')
  if (!name.trim() || name.trim().length > 100) throw new Error('Название: от 1 до 100 символов')
  if (price < 0 || price > 100000) throw new Error('Некорректная цена')

  const { supabase, clubId: scopedClubId } = await getAuthContext(clubId)

  const { error } = await supabase
    .from('menu_items')
    .insert({ club_id: scopedClubId, name: name.trim(), price })

  if (error) throw new Error('Не удалось создать позицию')
  revalidatePath('/dashboard/menu')
  revalidatePath('/owner/menu')
}

export async function updateMenuItem(id: string, name: string, price: number, clubId?: string): Promise<void> {
  assertUUID(id, 'menuItemId')
  if (clubId) assertUUID(clubId, 'clubId')
  if (!name.trim() || name.trim().length > 100) throw new Error('Название: от 1 до 100 символов')
  if (price < 0 || price > 100000) throw new Error('Некорректная цена')

  const { supabase, clubId: scopedClubId } = await getAuthContext(clubId)

  const { error } = await supabase
    .from('menu_items')
    .update({ name: name.trim(), price })
    .eq('id', id)
    .eq('club_id', scopedClubId)

  if (error) throw new Error('Не удалось обновить позицию')
  revalidatePath('/dashboard/menu')
  revalidatePath('/owner/menu')
}

export async function deleteMenuItem(id: string, clubId?: string): Promise<void> {
  assertUUID(id, 'menuItemId')
  if (clubId) assertUUID(clubId, 'clubId')
  const { supabase, clubId: scopedClubId } = await getAuthContext(clubId)

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('club_id', scopedClubId)

  if (error) throw new Error('Не удалось удалить позицию')
  revalidatePath('/dashboard/menu')
  revalidatePath('/owner/menu')
}

export async function togglePin(id: string, currentPinned: boolean, clubId?: string): Promise<void> {
  assertUUID(id, 'menuItemId')
  if (clubId) assertUUID(clubId, 'clubId')
  const { supabase, clubId: scopedClubId } = await getAuthContext(clubId)

  const { error } = await supabase
    .from('menu_items')
    .update({ is_pinned: !currentPinned })
    .eq('id', id)
    .eq('club_id', scopedClubId)

  if (error) throw new Error('Не удалось обновить позицию')
  revalidatePath('/dashboard/menu')
  revalidatePath('/owner/menu')
}
