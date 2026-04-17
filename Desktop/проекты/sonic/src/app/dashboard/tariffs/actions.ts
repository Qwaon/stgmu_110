'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assertUUID } from '@/lib/validation'

async function getAuthContext(targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('users').select('club_id, role').eq('id', user.id).single()
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

export async function updateRoomTariff(
  roomId: string,
  firstHourRate: number,
  subsequentRate: number,
  clubId?: string,
): Promise<void> {
  assertUUID(roomId, 'roomId')
  if (clubId) assertUUID(clubId, 'clubId')
  if (!Number.isFinite(firstHourRate) || firstHourRate <= 0 || firstHourRate > 100000) {
    throw new Error('Некорректный тариф первого часа')
  }
  if (!Number.isFinite(subsequentRate) || subsequentRate <= 0 || subsequentRate > 100000) {
    throw new Error('Некорректный последующий тариф')
  }

  const { supabase, clubId: scopedClubId } = await getAuthContext(clubId)
  const { error } = await supabase
    .from('rooms')
    .update({ first_hour_rate: firstHourRate, subsequent_rate: subsequentRate })
    .eq('id', roomId)
    .eq('club_id', scopedClubId)
  if (error) throw new Error('Не удалось обновить тариф')
  revalidatePath('/dashboard/tariffs')
  revalidatePath('/dashboard/rooms')
  revalidatePath('/owner/tariffs')
}
