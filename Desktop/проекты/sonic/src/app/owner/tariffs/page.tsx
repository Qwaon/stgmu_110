export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Club, Room } from '@/lib/types'
import TariffSettings from '@/components/TariffSettings'

export default async function OwnerTariffsPage({
  searchParams,
}: {
  searchParams?: { club?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') redirect('/dashboard/rooms')

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, address, hourly_rate, created_at')
    .order('name')

  const clubList = (clubs ?? []) as Club[]
  const selectedClubId = searchParams?.club && clubList.some(club => club.id === searchParams.club)
    ? searchParams.club
    : clubList[0]?.id

  if (!selectedClubId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Клубы не найдены.</p>
      </div>
    )
  }

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('club_id', selectedClubId)
    .order('name')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white font-semibold text-lg tracking-wide">Тарифы</h1>
          <p className="text-text-muted text-sm">Управление ценами по клубам</p>
        </div>
        <ClubTabs clubs={clubList} selectedClubId={selectedClubId} basePath="/owner/tariffs" />
      </div>

      <TariffSettings rooms={(rooms ?? []) as Room[]} clubId={selectedClubId} />
    </div>
  )
}

function ClubTabs({ clubs, selectedClubId, basePath }: { clubs: Club[]; selectedClubId: string; basePath: string }) {
  return (
    <div className="flex gap-2 flex-wrap justify-end">
      {clubs.map(club => (
        <Link
          key={club.id}
          href={`${basePath}?club=${club.id}`}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            club.id === selectedClubId
              ? 'border-white/40 text-white'
              : 'border-white/10 text-text-muted hover:border-white/20 hover:text-white'
          }`}
        >
          {club.name}
        </Link>
      ))}
    </div>
  )
}
