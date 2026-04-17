export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ClubOverviewStat } from '@/lib/types'
import ClubsOverview from '@/components/owner/ClubsOverview'

export default async function ClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase.rpc('get_clubs_overview')

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Ошибка загрузки данных.</p>
      </div>
    )
  }

  const clubStats = (data ?? []) as ClubOverviewStat[]

  if (clubStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Клубы не найдены.</p>
      </div>
    )
  }

  return <ClubsOverview stats={clubStats} />
}
