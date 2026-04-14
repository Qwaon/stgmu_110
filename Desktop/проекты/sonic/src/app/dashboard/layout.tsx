import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('clubs(name)')
    .eq('id', user.id)
    .single()

  const clubName = (profile?.clubs as unknown as { name: string } | null)?.name ?? 'Клуб'

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">{clubName}</h1>
            <p className="text-text-muted text-xs">Admin Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-text-muted text-xs hidden sm:block truncate max-w-[200px]">
            {user.email}
          </span>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="text-text-muted hover:text-white text-xs transition-colors"
            >
              Выйти
            </button>
          </form>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-surface border-b border-white/5 px-6">
        <div className="flex gap-1">
          <Link
            href="/dashboard/rooms"
            className="px-4 py-3 text-sm font-medium text-white border-b-2 border-accent-light"
          >
            Комнаты
          </Link>
          <Link
            href="/dashboard/bookings"
            className="px-4 py-3 text-sm font-medium text-text-muted hover:text-white transition-colors border-b-2 border-transparent"
          >
            Бронирования
          </Link>
          <Link
            href="/dashboard/menu"
            className="px-4 py-3 text-sm font-medium text-text-muted hover:text-white transition-colors border-b-2 border-transparent"
          >
            Меню
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
