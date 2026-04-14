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

export async function createMenuItem(name: string, price: number): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .insert({ club_id: clubId, name: name.trim(), price })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}

export async function updateMenuItem(id: string, name: string, price: number): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .update({ name: name.trim(), price })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}

export async function togglePin(id: string, currentPinned: boolean): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .update({ is_pinned: !currentPinned })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}
