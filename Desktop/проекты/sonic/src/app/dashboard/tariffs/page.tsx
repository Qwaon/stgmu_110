export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Room } from '@/lib/types'
import TariffSettings from '@/components/TariffSettings'

export default async function TariffsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('club_id').eq('id', user.id).single()

  if (!profile?.club_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Клуб не назначен.</p>
      </div>
    )
  }

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('club_id', profile.club_id)
    .order('name')

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-white font-bold text-xl mb-6">Тарифы</h1>
      <TariffSettings rooms={(rooms ?? []) as Room[]} />
    </div>
  )
}
