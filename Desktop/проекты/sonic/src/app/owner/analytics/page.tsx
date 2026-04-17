export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Club } from '@/lib/types'
import OwnerAnalytics from '@/components/owner/OwnerAnalytics'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: clubs }, { data: analytics }] = await Promise.all([
    supabase.from('clubs').select('id, name, address, hourly_rate, created_at').order('name'),
    supabase.rpc('get_owner_analytics', { p_days: 30 }),
  ])

  const a = analytics as {
    daily: { club_id: string; day: string; revenue: number }[]
    heatmap: { dow: number; hour: number; count: number }[]
    summary: { sessionCount: number; totalRevenue: number; averageCheck: number | null; averageDuration: number | null }
    sessions_for_export: { club_id: string; ended_at: string; total_minutes: number | null; total_amount: number | null }[]
  } | null

  return (
    <OwnerAnalytics
      clubs={(clubs ?? []) as Club[]}
      daily={a?.daily ?? []}
      heatmap={a?.heatmap ?? []}
      summary={a?.summary ?? { sessionCount: 0, totalRevenue: 0, averageCheck: null, averageDuration: null }}
      sessionsForExport={a?.sessions_for_export ?? []}
    />
  )
}
