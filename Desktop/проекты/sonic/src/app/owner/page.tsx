import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4 text-3xl">
          📊
        </div>
        <h1 className="text-white text-xl font-bold mb-2">Owner Panel</h1>
        <p className="text-text-muted text-sm">Аналитика и обзор клубов — Phase 4</p>
      </div>
    </div>
  )
}
