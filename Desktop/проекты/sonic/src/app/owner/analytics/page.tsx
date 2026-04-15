export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Club, Session } from '@/lib/types'
import OwnerAnalytics from '@/components/owner/OwnerAnalytics'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Last 30 days of completed sessions
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [{ data: clubs }, { data: sessions }] = await Promise.all([
    supabase.from('clubs').select('*').order('name'),
    supabase
      .from('sessions')
      .select('*')
      .eq('status', 'completed')
      .gte('ended_at', thirtyDaysAgo.toISOString())
      .order('ended_at'),
  ])

  return (
    <OwnerAnalytics
      clubs={(clubs ?? []) as Club[]}
      sessions={(sessions ?? []) as Session[]}
    />
  )
}
