'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoPlaceholder } from '@/components/icons'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-white/20 rounded-lg mb-5">
            <LogoPlaceholder className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase text-white">Sonic</h1>
          <p className="text-text-muted text-sm mt-1.5">Административная панель</p>
        </div>

        <form onSubmit={handleLogin} className="border border-white/10 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 tracking-wide uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-transparent border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-white/50 transition-colors text-sm"
              placeholder="admin@sonic.kz"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 tracking-wide uppercase">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-transparent border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-white/50 transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-status-busy text-sm border border-status-busy/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-white/30 hover:border-white/60 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm tracking-wide"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
