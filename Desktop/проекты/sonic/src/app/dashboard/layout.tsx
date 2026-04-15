import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogoPlaceholder, IconLogOut } from '@/components/icons'

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
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-10 bg-bg">
        <div className="flex items-center gap-3">
          <LogoPlaceholder className="text-white flex-shrink-0" />
          <div>
            <h1 className="text-white font-bold text-sm tracking-[0.1em] uppercase leading-tight">Sonic</h1>
            <p className="text-text-muted text-xs">{clubName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-muted text-xs hidden sm:block truncate max-w-[200px]">{user.email}</span>
          <form action={handleSignOut}>
            <button type="submit" className="text-text-muted hover:text-white text-xs transition-colors flex items-center gap-1.5">
              <IconLogOut />
              Выйти
            </button>
          </form>
        </div>
      </header>

      <nav className="border-b border-white/10 px-6 bg-bg">
        <div className="flex">
          {[
            { href: '/dashboard/rooms',    label: 'Комнаты' },
            { href: '/dashboard/bookings', label: 'Бронирования' },
            { href: '/dashboard/menu',     label: 'Меню' },
            { href: '/dashboard/tariffs',  label: 'Тарифы' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-3 text-sm font-medium text-text-muted hover:text-white transition-colors border-b border-transparent hover:border-white/40"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
