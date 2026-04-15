'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('users').select('club_id').eq('id', user.id).single()
  if (!profile?.club_id) throw new Error('No club assigned')
  return { supabase, clubId: profile.club_id as string }
}

export async function updateRoomTariff(
  roomId: string,
  firstHourRate: number,
  subsequentRate: number,
): Promise<void> {
  const { supabase, clubId } = await getAuthContext()
  const { error } = await supabase
    .from('rooms')
    .update({ first_hour_rate: firstHourRate, subsequent_rate: subsequentRate })
    .eq('id', roomId)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/tariffs')
  revalidatePath('/dashboard/rooms')
}
