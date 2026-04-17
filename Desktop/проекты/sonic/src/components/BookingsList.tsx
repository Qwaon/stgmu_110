'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cancelBooking, checkInBooking } from '@/app/dashboard/bookings/actions'
import CreateBookingModal from './CreateBookingModal'
import type { Booking, Room } from '@/lib/types'
import { IconCalendar, IconPlus } from './icons'

interface Props {
  initialBookings: Booking[]
  rooms: Room[]
  clubId: string
}

type Tab = 'list' | 'days'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function localDateKey(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function todayKey() {
  return localDateKey(new Date().toISOString())
}

function tomorrowKey() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return localDateKey(d.toISOString())
}

function groupLabel(dateKey: string): string {
  const today    = todayKey()
  const tomorrow = tomorrowKey()
  if (dateKey === today)    return 'Сегодня'
  if (dateKey === tomorrow) return 'Завтра'
  return formatDate(dateKey + 'T12:00:00')
}

export default function BookingsList({ initialBookings, rooms, clubId }: Props) {
  const [bookings,     setBookings]    = useState<Booking[]>(initialBookings)
  const [tab,          setTab]         = useState<Tab>('list')
  const [showCreate,   setShowCreate]  = useState(false)
  const [loadingId,    setLoadingId]   = useState<string | null>(null)
  const [selectedDay,  setSelectedDay] = useState(todayKey())
  const supabase = createClient()

  function shouldShowBooking(booking: Booking) {
    return booking.status === 'active' && new Date(booking.starts_at).getTime() >= startOfToday().getTime()
  }

  function upsertBooking(nextBooking: Booking) {
    setBookings(prev => {
      const merged = prev.filter(booking => booking.id !== nextBooking.id)
      if (!shouldShowBooking(nextBooking)) return merged
      return [...merged, nextBooking].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    })
  }

  function removeBooking(bookingId: string) {
    setBookings(prev => prev.filter(booking => booking.id !== bookingId))
  }

  useEffect(() => {
    const channel = supabase
      .channel(`bookings-${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `club_id=eq.${clubId}`,
      }, payload => {
        const nextBooking = payload.new as Booking
        const prevBooking = payload.old as Booking

        if (payload.eventType === 'DELETE') {
          removeBooking(prevBooking.id)
          return
        }

        upsertBooking(nextBooking)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId])

  async function handleCheckIn(id: string) {
    setLoadingId(id)
    removeBooking(id)
    try {
      await checkInBooking(id)
    } catch {
      const original = bookings.find(booking => booking.id === id)
      if (original) upsertBooking(original)
    } finally {
      setLoadingId(null)
    }
  }

  async function handleCancel(id: string) {
    setLoadingId(id)
    removeBooking(id)
    try {
      await cancelBooking(id)
    } catch {
      const original = bookings.find(booking => booking.id === id)
      if (original) upsertBooking(original)
    } finally {
      setLoadingId(null)
    }
  }

  const roomName = (id: string) => rooms.find(r => r.id === id)?.name ?? '—'
  const bookingCountByDay = useMemo(() => {
    const counts = new Map<string, number>()
    for (const booking of bookings) {
      const key = localDateKey(booking.starts_at)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [bookings])

  // ── TAB: LIST ──────────────────────────────────────────────────────────
  function renderList() {
    if (bookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <IconCalendar className="text-text-muted w-8 h-8" />
          <p className="text-text-muted text-sm">Нет активных броней</p>
          <button
            onClick={() => setShowCreate(true)}
            className="border border-white/20 hover:border-white/40 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <IconPlus />
            Создать бронь
          </button>
        </div>
      )
    }

    const grouped = new Map<string, Booking[]>()
    for (const b of bookings) {
      const key = localDateKey(b.starts_at)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(b)
    }
    const sortedKeys = [...grouped.keys()].sort()

    return (
      <div className="space-y-6">
        {sortedKeys.map(key => (
          <section key={key}>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">
              {groupLabel(key)}
            </p>
            <div className="space-y-1.5">
              {grouped.get(key)!.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  roomName={roomName(b.room_id)}
                  loading={loadingId === b.id}
                  onCheckIn={() => handleCheckIn(b.id)}
                  onCancel={() => handleCancel(b.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  // ── TAB: DAYS ──────────────────────────────────────────────────────────
  function renderDays() {
    const dayBookings = bookings.filter(b => localDateKey(b.starts_at) === selectedDay)

    return (
      <div className="space-y-4">
        {/* Date picker row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...Array(7)].map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() + i)
            const key = localDateKey(d.toISOString())
            const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра'
              : d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })
            const count = bookingCountByDay.get(key) ?? 0
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  selectedDay === key
                    ? 'border-white/40 text-white'
                    : 'border-white/10 text-text-muted hover:text-white hover:border-white/20'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className="ml-1.5 text-xs text-text-muted">({count})</span>
                )}
              </button>
            )
          })}
        </div>

        {dayBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-text-muted text-sm">Броней нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => {
              const roomBookings = dayBookings.filter(b => b.room_id === room.id)
              if (roomBookings.length === 0) return null
              return (
                <div key={room.id} className="border border-white/10 rounded-lg p-4">
                  <p className="text-white font-semibold text-sm mb-3">
                    {room.name}
                    {room.type === 'vip' && (
                      <span className="ml-2 text-[9px] font-bold tracking-widest text-white/50 border border-white/20 px-1 py-0.5 rounded uppercase">VIP</span>
                    )}
                  </p>
                  <div className="space-y-1.5">
                    {roomBookings.map(b => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        roomName={room.name}
                        loading={loadingId === b.id}
                        onCheckIn={() => handleCheckIn(b.id)}
                        onCancel={() => handleCancel(b.id)}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        {/* Tab switcher */}
        <div className="flex border-b border-white/10">
          {([['list', 'Список'], ['days', 'По дням']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b -mb-px ${
                tab === t
                  ? 'text-white border-white'
                  : 'text-text-muted hover:text-white border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="border border-white/20 hover:border-white/40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <IconPlus />
          Новая бронь
        </button>
      </div>

      {tab === 'list' ? renderList() : renderDays()}

      {showCreate && (
        <CreateBookingModal
          rooms={rooms}
          onCreated={upsertBooking}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
}

function startOfToday() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  return todayStart
}

// ── BookingCard ────────────────────────────────────────────────────────────

interface CardProps {
  booking: Booking
  roomName: string
  loading: boolean
  onCheckIn: () => void
  onCancel: () => void
  compact?: boolean
}

function BookingCard({ booking: b, roomName, loading, onCheckIn, onCancel, compact }: CardProps) {
  return (
    <div className="border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
      {/* Time badge */}
      <div className="text-center flex-shrink-0 min-w-[52px]">
        <p className="text-white font-semibold text-sm leading-tight font-mono">{formatTime(b.starts_at)}</p>
        <p className="text-text-muted text-[10px] font-mono">{b.ends_at ? formatTime(b.ends_at) : '—'}</p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{b.phone || 'без телефона'}</p>
        {!compact && (
          <p className="text-text-muted text-xs truncate">{roomName}</p>
        )}
        {b.notes && <p className="text-text-muted text-xs truncate italic">{b.notes}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onCheckIn}
          disabled={loading}
          className="border border-white/20 hover:border-white/50 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Заселить
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="border border-white/10 hover:border-status-busy/40 disabled:opacity-40 text-text-muted hover:text-status-busy text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
