'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cancelBooking, checkInBooking } from '@/app/dashboard/bookings/actions'
import CreateBookingModal from './CreateBookingModal'
import type { Booking, Room } from '@/lib/types'

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

function dayKey(iso: string) {
  return iso.slice(0, 10) // YYYY-MM-DD in UTC; good enough for grouping
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
  return formatDate(dateKey + 'T12:00:00') // local noon → readable date
}

export default function BookingsList({ initialBookings, rooms, clubId }: Props) {
  const [bookings,     setBookings]    = useState<Booking[]>(initialBookings)
  const [tab,          setTab]         = useState<Tab>('list')
  const [showCreate,   setShowCreate]  = useState(false)
  const [loadingId,    setLoadingId]   = useState<string | null>(null)
  const [selectedDay,  setSelectedDay] = useState(todayKey())
  const supabase = createClient()

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at')
    setBookings(data ?? [])
  }, [clubId])

  useEffect(() => {
    const channel = supabase
      .channel(`bookings-${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `club_id=eq.${clubId}`,
      }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId, refetch])

  async function handleCheckIn(id: string) {
    setLoadingId(id)
    try { await checkInBooking(id) } finally { setLoadingId(null) }
  }

  async function handleCancel(id: string) {
    setLoadingId(id)
    try { await cancelBooking(id) } finally { setLoadingId(null) }
  }

  const roomName = (id: string) => rooms.find(r => r.id === id)?.name ?? '—'

  // ── TAB: LIST ──────────────────────────────────────────────────────────
  function renderList() {
    if (bookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-4xl">📅</div>
          <p className="text-text-muted text-sm">Нет активных броней</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            + Создать бронь
          </button>
        </div>
      )
    }

    // Group by local date of starts_at
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
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-3">
              {groupLabel(key)}
            </p>
            <div className="space-y-2">
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
            const count = bookings.filter(b => localDateKey(b.starts_at) === key).length
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedDay === key
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-text-muted hover:text-white border border-white/5'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    selectedDay === key ? 'bg-white/20' : 'bg-accent/30 text-accent-light'
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Room timeline for selected day */}
        {dayBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-text-muted text-sm">Броней нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Group by room */}
            {rooms.map(room => {
              const roomBookings = dayBookings.filter(b => b.room_id === room.id)
              if (roomBookings.length === 0) return null
              return (
                <div key={room.id} className="bg-surface rounded-xl p-4 border border-white/5">
                  <p className="text-white font-semibold text-sm mb-3">
                    {room.name}
                    {room.type === 'vip' && (
                      <span className="ml-2 text-[10px] font-bold text-accent-light bg-accent/20 px-1.5 py-0.5 rounded uppercase">VIP</span>
                    )}
                  </p>
                  <div className="space-y-2">
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
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-white/5">
          {([['list', 'Список'], ['days', 'По дням']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-accent text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Новая бронь
        </button>
      </div>

      {tab === 'list' ? renderList() : renderDays()}

      {showCreate && (
        <CreateBookingModal
          rooms={rooms}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
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
    <div className="bg-surface-2 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3">
      {/* Time badge */}
      <div className="text-center flex-shrink-0 min-w-[52px]">
        <p className="text-white font-bold text-sm leading-tight">{formatTime(b.starts_at)}</p>
        <p className="text-text-muted text-[10px]">{formatTime(b.ends_at)}</p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{b.client_name}</p>
        <p className="text-text-muted text-xs truncate">
          {compact ? '' : `${roomName} · `}{b.phone || 'без телефона'}
        </p>
        {b.notes && <p className="text-text-muted text-xs truncate italic">{b.notes}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onCheckIn}
          disabled={loading}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Заселить
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="bg-surface-3 hover:bg-red-600/30 disabled:opacity-50 text-text-muted hover:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
