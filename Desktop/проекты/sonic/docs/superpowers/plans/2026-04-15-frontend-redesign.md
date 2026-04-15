# Frontend Redesign — Sonic PS Club Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire admin UI to an Outlined/Wireframe aesthetic — pure black (#0a0a0a) background, no fills, everything through 1px borders, Outfit font, three status colors only on borders/dots.

**Architecture:** Replace all CSS variables and Tailwind color tokens with a new monochrome system. Create a shared SVG icons file to replace all emoji. Restyle every layout, card, and modal component in-place — no new routes or business logic touched.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Google Fonts (Outfit)

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/app/globals.css` |
| Modify | `tailwind.config.ts` |
| **Create** | `src/components/icons.tsx` |
| Modify | `src/app/dashboard/layout.tsx` |
| Modify | `src/app/owner/layout.tsx` |
| Modify | `src/app/login/page.tsx` |
| Modify | `src/components/RoomCard.tsx` |
| Modify | `src/components/RoomGrid.tsx` |
| Modify | `src/components/SessionSheet.tsx` |
| Modify | `src/components/StartSessionModal.tsx` |
| Modify | `src/components/EndSessionModal.tsx` |
| Modify | `src/components/AddOrderModal.tsx` |
| Modify | `src/components/CreateBookingModal.tsx` |
| Modify | `src/components/ShiftSummaryModal.tsx` |
| Modify | `src/components/SessionExpiredDialog.tsx` |
| Modify | `src/components/UndoToast.tsx` |
| Modify | `src/components/TariffSettings.tsx` |
| Modify | `src/components/owner/ClubsOverview.tsx` |
| Modify | `src/components/owner/OwnerAnalytics.tsx` |
| Modify | `src/app/dashboard/bookings/page.tsx` |
| Modify | `src/app/dashboard/menu/page.tsx` |
| Modify | `src/app/dashboard/tariffs/page.tsx` |

---

## Task 1: Foundation — Colors, Font, Tailwind tokens

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Replace globals.css**

```css
/* src/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg:            #0a0a0a;
  --border:        rgba(255, 255, 255, 0.10);
  --border-hover:  rgba(255, 255, 255, 0.22);
  --text:          #ffffff;
  --text-muted:    #666666;

  --status-free:   #22c55e;
  --status-busy:   #ef4444;
  --status-booked: #eab308;
}

* { box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
```

- [ ] **Step 2: Replace tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg:           '#0a0a0a',
        border:       'rgba(255,255,255,0.10)',
        'border-hover':'rgba(255,255,255,0.22)',
        'text-muted': '#666666',
        'status-free':   '#22c55e',
        'status-busy':   '#ef4444',
        'status-booked': '#eab308',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (color tokens are just strings, removing old tokens may cause unused-class warnings in TSC — those are fine).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat: redesign foundation — Outfit font, monochrome tokens, outlined system"
```

---

## Task 2: SVG Icons library

**Files:**
- Create: `src/components/icons.tsx`

- [ ] **Step 1: Create icons.tsx**

All icons accept `className?: string`. Stroke-based, no fills.

```tsx
// src/components/icons.tsx
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

const base: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

export function IconStop({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

export function IconX({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={14} height={14}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={14} height={14}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function IconList({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconPause({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

export function IconResume({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={16} height={16}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function IconLogOut({ className }: IconProps) {
  return (
    <svg {...base} className={className} width={14} height={14}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

/** Placeholder — user replaces this with their own SVG */
export function LogoPlaceholder({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} width={28} height={28}>
      {/* INSERT_LOGO_SVG — replace the rect below with your logo paths */}
      <rect x="2" y="2" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" fontFamily="Outfit">S</text>
    </svg>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/icons.tsx
git commit -m "feat: add SVG icons library (replaces emoji)"
```

---

## Task 3: Dashboard Layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Replace dashboard layout**

```tsx
// src/app/dashboard/layout.tsx
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
```

Note: Active tab highlighting requires a Client Component wrapper for `usePathname`. For now all tabs are muted — this is acceptable for the redesign. If needed later, wrap nav in a `'use client'` component.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: redesign dashboard header+nav — outlined, Outfit, logo placeholder"
```

---

## Task 4: Owner Layout

**Files:**
- Modify: `src/app/owner/layout.tsx`

- [ ] **Step 1: Replace owner layout**

```tsx
// src/app/owner/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogoPlaceholder, IconLogOut } from '@/components/icons'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
            <p className="text-text-muted text-xs">Owner Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-muted text-xs hidden sm:block">{user.email}</span>
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
            { href: '/owner/clubs',     label: 'Клубы' },
            { href: '/owner/analytics', label: 'Аналитика' },
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
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/owner/layout.tsx
git commit -m "feat: redesign owner header+nav — same outlined system"
```

---

## Task 5: Login Page

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Replace login page**

```tsx
// src/app/login/page.tsx
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
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/login/page.tsx
git commit -m "feat: redesign login page — outlined card, logo placeholder"
```

---

## Task 6: RoomCard

**Files:**
- Modify: `src/components/RoomCard.tsx`

- [ ] **Step 1: Replace RoomCard.tsx**

Status colors used only on border and dot. All buttons outlined. Emoji replaced with SVG.

```tsx
// src/components/RoomCard.tsx
'use client'
import { useState, useEffect } from 'react'
import type { RoomWithSession, Booking } from '@/lib/types'
import SessionTimer from './SessionTimer'
import StartSessionModal from './StartSessionModal'
import SessionSheet from './SessionSheet'
import { IconCalendar, IconAlert, IconPlay, IconStop, IconPlus } from './icons'

const STATUS_BORDER = { free: 'border-status-free',   busy: 'border-status-busy',   booked: 'border-status-booked' } as const
const STATUS_DOT    = { free: 'bg-status-free',        busy: 'bg-status-busy',        booked: 'bg-status-booked'    } as const
const STATUS_LABEL  = { free: 'Свободна',              busy: 'Занята',                booked: 'Забронирована'       } as const
const STATUS_TEXT   = { free: 'text-status-free',      busy: 'text-status-busy',      booked: 'text-status-booked'  } as const

interface Props {
  room: RoomWithSession
  clubId: string
  clubFirstHourRate: number
  clubSubsequentRate: number
  upcomingBooking?: Booking
  onEnded?: (sessionId: string, roomId: string) => void
}

function msUntilEnd(scheduledEndAt: string | null): number | null {
  if (!scheduledEndAt) return null
  return new Date(scheduledEndAt).getTime() - Date.now()
}

function formatBookingTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function RoomCard({ room, clubId, clubFirstHourRate, clubSubsequentRate, upcomingBooking, onEnded }: Props) {
  const [showStart, setShowStart] = useState(false)
  const [showSheet, setShowSheet] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)

  const session        = room.active_session
  const firstHourRate  = room.first_hour_rate  ?? clubFirstHourRate
  const subsequentRate = room.subsequent_rate  ?? clubSubsequentRate

  useEffect(() => {
    if (!session?.scheduled_end_at) { setIsPulsing(false); return }
    function check() {
      const remaining = msUntilEnd(session!.scheduled_end_at)
      setIsPulsing(remaining !== null && remaining > 0 && remaining <= 15 * 60 * 1000)
    }
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [session?.scheduled_end_at])

  return (
    <div className={`bg-bg rounded-lg p-4 border ${STATUS_BORDER[room.status]} flex flex-col gap-3 transition-colors hover:bg-white/[0.02] ${isPulsing ? 'ring-1 ring-status-booked/50' : ''}`}>

      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[room.status]}`} />
            <h3 className="text-white font-semibold text-sm leading-tight truncate">{room.name}</h3>
            {room.type === 'vip' && (
              <span className="text-[9px] font-bold tracking-widest text-white/50 border border-white/20 px-1 py-0.5 rounded uppercase flex-shrink-0">
                VIP
              </span>
            )}
          </div>
          <span className={`text-xs font-medium uppercase tracking-wide ${STATUS_TEXT[room.status]} pl-3.5`}>
            {STATUS_LABEL[room.status]}
          </span>
        </div>
        <span className="text-text-muted text-xs whitespace-nowrap font-mono">{firstHourRate}/{subsequentRate} ₽</span>
      </div>

      {/* Upcoming booking */}
      {upcomingBooking && !session && (
        <div className="border border-status-booked/30 rounded px-2.5 py-1.5 flex items-center gap-1.5">
          <IconCalendar className="text-status-booked flex-shrink-0" />
          <span className="text-status-booked text-xs font-medium truncate">
            {upcomingBooking.client_name} · {formatBookingTime(upcomingBooking.starts_at)}
          </span>
        </div>
      )}

      {/* Session end alert */}
      {isPulsing && session?.scheduled_end_at && (
        <div className="border border-orange-400/30 rounded px-2.5 py-1.5 flex items-center gap-1.5">
          <IconAlert className="text-orange-400 flex-shrink-0" />
          <p className="text-orange-400 text-xs font-medium">
            Заканчивается в {formatBookingTime(session.scheduled_end_at)}
          </p>
        </div>
      )}

      {/* Session info */}
      {session ? (
        <div className="space-y-1 cursor-pointer" onClick={() => setShowSheet(true)}>
          <p className="text-white font-medium text-sm truncate">{session.client_name}</p>
          <SessionTimer
            startedAt={session.started_at}
            pausedAt={session.paused_at}
            pausedDurationMs={session.paused_duration_ms}
            status={session.status}
          />
          {session.orders.length > 0 && (
            <p className="text-text-muted text-xs">
              {session.orders.length} заказ{session.orders.length > 1 ? 'а' : ''}
            </p>
          )}
        </div>
      ) : (
        <p className="text-text-muted text-xs flex-1">Нет активных сессий</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {room.status === 'free' && (
          <button
            onClick={() => setShowStart(true)}
            className="flex-1 border border-white/20 hover:border-white/50 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <IconPlay />
            Начать
          </button>
        )}
        {room.status === 'busy' && session && (
          <>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconPlus />
              Заказ
            </button>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 border border-status-busy/40 hover:border-status-busy text-status-busy text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconStop />
              Завершить
            </button>
          </>
        )}
        {room.status === 'booked' && (
          <p className="text-status-booked/60 text-xs flex-1 text-center py-1">Ожидает заселения</p>
        )}
      </div>

      {showStart && <StartSessionModal room={room} onClose={() => setShowStart(false)} />}
      {showSheet && session && (
        <SessionSheet
          room={room}
          session={session}
          clubId={clubId}
          firstHourRate={firstHourRate}
          subsequentRate={subsequentRate}
          onClose={() => setShowSheet(false)}
          onEnded={onEnded}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/RoomCard.tsx
git commit -m "feat: redesign RoomCard — outlined border, status dots, SVG icons"
```

---

## Task 7: RoomGrid (stats bar + shift summary button)

**Files:**
- Modify: `src/components/RoomGrid.tsx`

- [ ] **Step 1: Update stats bar and shift summary button in RoomGrid.tsx**

Only the JSX layout parts change. Find and replace the `return (...)` block starting at `<>`:

```tsx
  return (
    <>
      {/* Shift summary button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowSummary(true)}
          className="border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <IconList className="flex-shrink-0" />
          Сводка смены
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: 'Всего',    value: rooms.length,                                    color: 'text-white'          },
          { label: 'Занято',   value: rooms.filter(r => r.status === 'busy').length,   color: 'text-status-busy'   },
          { label: 'Свободно', value: rooms.filter(r => r.status === 'free').length,   color: 'text-status-free'   },
          { label: 'Брони',    value: rooms.filter(r => r.status === 'booked').length, color: 'text-status-booked' },
        ].map(stat => (
          <div key={stat.label} className="border border-white/10 rounded-lg px-4 py-2.5">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-text-muted text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Room cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            clubId={clubId}
            clubFirstHourRate={clubFirstHourRate}
            clubSubsequentRate={clubSubsequentRate}
            upcomingBooking={upcomingBookingForRoom(room.id)}
            onEnded={(sessionId, roomId) => setUndoPending({ sessionId, roomId })}
          />
        ))}
      </div>

      {undoPending && (
        <UndoToast
          onUndo={handleUndo}
          onExpire={() => setUndoPending(null)}
        />
      )}

      <SessionExpiredDialog
        rooms={rooms}
        clubFirstHourRate={clubFirstHourRate}
        clubSubsequentRate={clubSubsequentRate}
      />

      {showSummary && (
        <ShiftSummaryModal
          clubId={clubId}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  )
```

Also add `IconList` to the import at top of file:
```tsx
import { IconList } from './icons'
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/RoomGrid.tsx
git commit -m "feat: redesign RoomGrid stats bar — outlined, SVG icon"
```

---

## Task 8: SessionSheet

**Files:**
- Modify: `src/components/SessionSheet.tsx`

- [ ] **Step 1: Read full file first, then replace the JSX return**

The logic (state, calculations) stays identical. Only styling changes.

Replace the return block (everything inside the outer `<> … </>` starting at the `<div className="fixed inset-0...">`:

```tsx
  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-bg border border-white/15 rounded-lg w-full max-w-sm shadow-2xl">

          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-start">
            <div>
              <h2 className="text-white font-semibold text-base">{room.name}</h2>
              <p className="text-text-muted text-sm">{session.client_name}</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors mt-0.5">
              <IconX />
            </button>
          </div>

          {/* Timer + amount */}
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center mb-1">
              <SessionTimer
                startedAt={session.started_at}
                pausedAt={session.paused_at}
                pausedDurationMs={session.paused_duration_ms}
                status={session.status}
              />
              <span className="text-white font-semibold">{total} ₽</span>
            </div>
            <p className="text-text-muted text-xs">{minutes} мин · аренда {sessionAmount} ₽{ordersTotal > 0 ? ` · заказы ${ordersTotal} ₽` : ''}</p>
          </div>

          {/* Orders list */}
          {session.orders.length > 0 && (
            <div className="p-4 border-b border-white/10 space-y-1.5">
              {session.orders.map(order => (
                <div key={order.id} className="flex justify-between text-sm">
                  <span className="text-white">{order.item_name} <span className="text-text-muted">×{order.quantity}</span></span>
                  <span className="text-text-muted">{order.price * order.quantity} ₽</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="p-4 flex gap-2">
            <button
              onClick={handlePauseResume}
              disabled={pausing}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {session.status === 'active'
                ? <><IconPause /> Пауза</>
                : <><IconResume /> Продолжить</>
              }
            </button>
            <button
              onClick={() => setShowAddOrder(true)}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconPlus /> Заказ
            </button>
            <button
              onClick={() => setShowEnd(true)}
              className="flex-1 border border-status-busy/40 hover:border-status-busy text-status-busy text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IconStop /> Завершить
            </button>
          </div>
        </div>
      </div>

      {showAddOrder && (
        <AddOrderModal
          sessionId={session.id}
          clubId={clubId}
          onClose={() => setShowAddOrder(false)}
        />
      )}
      {showEnd && (
        <EndSessionModal
          room={room}
          session={session}
          firstHourRate={firstHourRate}
          subsequentRate={subsequentRate}
          onClose={() => setShowEnd(false)}
          onEnded={onEnded}
        />
      )}
    </>
  )
```

Add to imports:
```tsx
import { IconX, IconPause, IconResume, IconPlus, IconStop } from './icons'
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/SessionSheet.tsx
git commit -m "feat: redesign SessionSheet — outlined, SVG icons"
```

---

## Task 9: StartSessionModal + EndSessionModal

**Files:**
- Modify: `src/components/StartSessionModal.tsx`
- Modify: `src/components/EndSessionModal.tsx`

- [ ] **Step 1: Replace StartSessionModal return block**

Add import: `import { IconX } from './icons'`

Replace the return block:

```tsx
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-white font-semibold text-base">Начать сессию</h2>
            <p className="text-text-muted text-sm">{room.name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 tracking-wide uppercase">
              Имя клиента
            </label>
            <input
              ref={inputRef}
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              required
              maxLength={60}
              className="w-full bg-transparent border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-white/50 transition-colors text-sm"
              placeholder="Например: Азамат"
            />
          </div>

          {error && (
            <p className="text-status-busy text-sm border border-status-busy/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !clientName.trim()}
              className="flex-1 border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Запуск...' : 'Начать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
```

- [ ] **Step 2: Replace EndSessionModal return block**

Read full `src/components/EndSessionModal.tsx`, then replace return block.

Add import: `import { IconX } from './icons'`

```tsx
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Завершить сессию</h2>
            <p className="text-text-muted text-sm">{room.name} · {session.client_name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {/* Invoice */}
        <div className="border border-white/10 rounded-lg p-4 space-y-2.5 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Время</span>
            <span className="text-white font-medium font-mono">
              {formatDuration(elapsedMs)} <span className="text-text-muted text-xs">({minutes} мин)</span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Аренда</span>
            <span className="text-white font-medium">{sessionAmount} ₽</span>
          </div>
          {ordersTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Заказы</span>
              <span className="text-white font-medium">{ordersTotal} ₽</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2.5 flex justify-between text-sm">
            <span className="text-white font-semibold">Итого</span>
            <span className="text-white font-bold">{total} ₽</span>
          </div>
        </div>

        {error && (
          <p className="text-status-busy text-sm border border-status-busy/30 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleEnd}
            disabled={loading}
            className="flex-1 border border-status-busy/40 hover:border-status-busy disabled:opacity-40 text-status-busy text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Завершаем...' : 'Завершить'}
          </button>
        </div>
      </div>
    </div>
  )
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/StartSessionModal.tsx src/components/EndSessionModal.tsx
git commit -m "feat: redesign Start/End session modals — outlined"
```

---

## Task 10: AddOrderModal + CreateBookingModal

**Files:**
- Modify: `src/components/AddOrderModal.tsx`
- Modify: `src/components/CreateBookingModal.tsx`

- [ ] **Step 1: Read both files fully, then apply the modal pattern**

For each modal, apply this consistent pattern for the outer wrapper and card:

**Wrapper:**
```tsx
<div
  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  onClick={e => { if (e.target === e.currentTarget) onClose() }}
>
  <div className="bg-bg border border-white/15 rounded-lg p-6 w-full max-w-sm shadow-2xl">
```

**Close button (replace `×` text with icon):**
```tsx
import { IconX } from './icons'
// ...
<button onClick={onClose} className="text-text-muted hover:text-white transition-colors"><IconX /></button>
```

**Inputs:**
```tsx
className="w-full bg-transparent border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-white/50 transition-colors text-sm"
```

**Select:**
```tsx
className="w-full bg-bg border border-white/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/50 transition-colors text-sm"
```

**Labels:**
```tsx
className="block text-xs font-medium text-text-muted mb-1.5 tracking-wide uppercase"
```

**Cancel button:**
```tsx
className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
```

**Primary/confirm button:**
```tsx
className="flex-1 border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
```

**Error message:**
```tsx
className="text-status-busy text-sm border border-status-busy/30 rounded-lg px-3 py-2"
```

Replace `rounded-2xl`, `bg-surface`, `bg-surface-2`, `bg-accent`, `border-white/10` with the patterns above throughout both files.

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/AddOrderModal.tsx src/components/CreateBookingModal.tsx
git commit -m "feat: redesign AddOrder + CreateBooking modals — outlined"
```

---

## Task 11: ShiftSummaryModal + SessionExpiredDialog + UndoToast

**Files:**
- Modify: `src/components/ShiftSummaryModal.tsx`
- Modify: `src/components/SessionExpiredDialog.tsx`
- Modify: `src/components/UndoToast.tsx`

- [ ] **Step 1: Read all three files fully**

- [ ] **Step 2: Update ShiftSummaryModal**

Apply the same outlined modal pattern. Replace `bg-surface`, `rounded-2xl`, filled buttons. Add `IconX` for close, `IconDownload` for CSV export button (if present).

Outer card: `bg-bg border border-white/15 rounded-lg`
Section dividers: `border-t border-white/10`
Summary totals row: `border border-white/10 rounded-lg p-4`
CSV button: `border border-white/15 hover:border-white/30 text-text-muted hover:text-white ... flex items-center gap-1.5` + `<IconDownload />`

- [ ] **Step 3: Update SessionExpiredDialog**

Same outlined modal pattern. The dialog wraps `EndSessionModal` — only the outer alert card changes. Apply:
```tsx
<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
  <div className="bg-bg border border-status-busy/40 rounded-lg p-5 w-full max-w-sm shadow-2xl">
    <div className="flex items-center gap-2 mb-3">
      <IconAlert className="text-status-busy" />
      <h2 className="text-white font-semibold text-sm">Время сессии истекло</h2>
    </div>
    {/* ... room/client info ... */}
  </div>
</div>
```
Import: `import { IconAlert } from './icons'`

- [ ] **Step 4: Update UndoToast**

```tsx
// src/components/UndoToast.tsx — replace return block
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-bg border border-white/15 rounded-lg px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4">
      <span className="text-text-muted text-sm">Сессия завершена</span>
      <div className="w-px h-4 bg-white/10" />
      <button
        onClick={onUndo}
        className="text-white font-medium text-sm hover:text-white/70 transition-colors border-b border-white/30 pb-px"
      >
        Отменить ({remaining}с)
      </button>
    </div>
  )
```

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/ShiftSummaryModal.tsx src/components/SessionExpiredDialog.tsx src/components/UndoToast.tsx
git commit -m "feat: redesign ShiftSummary, SessionExpired, UndoToast — outlined"
```

---

## Task 12: TariffSettings

**Files:**
- Modify: `src/components/TariffSettings.tsx`

- [ ] **Step 1: Read full TariffSettings.tsx, then update JSX**

Apply outlined pattern. Each room tariff row becomes a bordered card:

```tsx
<div className="border border-white/10 rounded-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-white font-medium text-sm">{room.name}</h3>
    {room.type === 'vip' && (
      <span className="text-[9px] font-bold tracking-widest text-white/50 border border-white/20 px-1 py-0.5 rounded uppercase">VIP</span>
    )}
  </div>
  {/* inputs row */}
</div>
```

Inputs use the outlined style. Save button: `border border-white/30 hover:border-white/60 text-white ...`.
Success state: `text-status-free text-xs`. Error: `text-status-busy text-xs`.

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/TariffSettings.tsx
git commit -m "feat: redesign TariffSettings — outlined cards"
```

---

## Task 13: Owner components

**Files:**
- Modify: `src/components/owner/ClubsOverview.tsx`
- Modify: `src/components/owner/OwnerAnalytics.tsx`

- [ ] **Step 1: Read both files fully**

- [ ] **Step 2: Update ClubsOverview**

Apply outlined pattern to club cards. Status indicators use `text-status-free/busy/booked`. Remove filled backgrounds. Section headers `text-text-muted text-xs uppercase tracking-wide`.

- [ ] **Step 3: Update OwnerAnalytics**

Chart containers: `border border-white/10 rounded-lg p-4`. Labels `text-text-muted`. Chart colors keep their data colors (don't strip chart line colors — only strip UI chrome colors).

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/owner/ClubsOverview.tsx src/components/owner/OwnerAnalytics.tsx
git commit -m "feat: redesign owner components — outlined cards"
```

---

## Task 14: Remaining pages (bookings, menu, tariffs page shells)

**Files:**
- Modify: `src/app/dashboard/bookings/page.tsx`
- Modify: `src/app/dashboard/menu/page.tsx`
- Modify: `src/app/dashboard/tariffs/page.tsx`

- [ ] **Step 1: Read all three pages**

- [ ] **Step 2: Apply outlined pattern to page-level chrome**

For each page, replace any `bg-surface`, `rounded-2xl`, filled button styles with outlined equivalents. Section headers use `text-white font-semibold text-sm`. Table/list rows use `border-b border-white/10`.

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/bookings/page.tsx src/app/dashboard/menu/page.tsx src/app/dashboard/tariffs/page.tsx
git commit -m "feat: redesign page shells — bookings, menu, tariffs"
```

---

## Task 15: BookingsList component

**Files:**
- Modify: `src/components/BookingsList.tsx`

- [ ] **Step 1: Read full BookingsList.tsx**

- [ ] **Step 2: Apply outlined pattern**

Tab switcher: underline style (same as nav — `border-b border-white` for active, `border-transparent` for inactive).
Booking rows: `border border-white/10 rounded-lg p-3` instead of filled cards.
Status badges: `border border-status-booked/40 text-status-booked text-xs rounded px-1.5 py-0.5` (outlined, no fill).
`<CreateBookingModal />` trigger button: `border border-white/20 hover:border-white/40 text-white ...`.

- [ ] **Step 3: Type-check and final build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: 0 type errors, build succeeds.

- [ ] **Step 4: Final commit**

```bash
git add src/components/BookingsList.tsx
git commit -m "feat: redesign BookingsList — outlined rows, tab underline style"
```

---

## Logo Insertion Point

After all tasks are complete, the user inserts their own logo SVG. In `src/components/icons.tsx`, find `LogoPlaceholder` and replace the inner content:

```tsx
export function LogoPlaceholder({ className }: IconProps) {
  return (
    // Replace entire SVG below with your logo:
    <svg viewBox="0 0 32 32" fill="none" className={className} width={28} height={28}>
      {/* INSERT_LOGO_SVG */}
    </svg>
  )
}
```

This single component is used in: `dashboard/layout.tsx`, `owner/layout.tsx`, `login/page.tsx`.
