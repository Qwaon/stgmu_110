export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Club, Room, Session } from '@/lib/types'
import ClubsOverview from '@/components/owner/ClubsOverview'

export interface ClubStats {
  club: Club
  rooms: Room[]
  sessions: Session[]  // completed sessions (for revenue / counts)
  activeSessions: Session[]
}

export default async function ClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch both clubs
  const { data: clubs } = await supabase
    .from('clubs')
    .select('*')
    .order('name')

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Клубы не найдены.</p>
      </div>
    )
  }

  // Start of current month (UTC)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // Rooms + sessions per club
  const [{ data: rooms }, { data: completedSessions }, { data: activeSessions }] = await Promise.all([
    supabase.from('rooms').select('*'),
    supabase
      .from('sessions')
      .select('*')
      .eq('status', 'completed')
      .gte('ended_at', monthStart.toISOString()),
    supabase
      .from('sessions')
      .select('*')
      .in('status', ['active', 'paused']),
  ])

  const clubStats: ClubStats[] = (clubs as Club[]).map(club => ({
    club,
    rooms:          (rooms ?? []).filter((r: Room) => r.club_id === club.id),
    sessions:       (completedSessions ?? []).filter((s: Session) => s.club_id === club.id),
    activeSessions: (activeSessions ?? []).filter((s: Session) => s.club_id === club.id),
  }))

  return <ClubsOverview stats={clubStats} />
}
