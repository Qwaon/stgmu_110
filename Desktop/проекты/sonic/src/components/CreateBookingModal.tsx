'use client'
import { useState } from 'react'
import { createBooking } from '@/app/dashboard/bookings/actions'
import type { Room } from '@/lib/types'
import { IconX } from './icons'

interface Props {
  rooms: Room[]
  onClose: () => void
}

function todayLocal() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function toISOLocal(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}`).toISOString()
}

const inputCls = "w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/50 transition-colors placeholder:text-text-muted"
const labelCls = "text-text-muted text-xs mb-1 block tracking-wide uppercase"

export default function CreateBookingModal({ rooms, onClose }: Props) {
  const today = todayLocal()

  const [roomId,     setRoomId]     = useState(rooms[0]?.id ?? '')
  const [phone,      setPhone]      = useState('')
  const [date,       setDate]       = useState(today)
  const [startTime,  setStartTime]  = useState('10:00')
  const [hasEndTime, setHasEndTime] = useState(false)
  const [endTime,    setEndTime]    = useState('11:00')
  const [notes,      setNotes]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (hasEndTime && startTime >= endTime) {
      setError('Время окончания должно быть позже начала')
      return
    }

    setLoading(true)
    try {
      const endsAt = hasEndTime ? toISOLocal(date, endTime) : null
      const result = await createBooking(
        roomId,
        phone,
        toISOLocal(date, startTime),
        endsAt,
        notes,
      )
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        onClose()
      }
    } catch {
      setError('Ошибка при создании брони')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-white font-semibold text-base">Новая бронь</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className={labelCls}>Комната</label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              required
              className="w-full bg-bg border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/50 transition-colors"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.type === 'vip' ? ' (VIP)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Телефон</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+7 999 000 00 00"
              type="tel"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Дата</label>
            <input
              value={date}
              onChange={e => setDate(e.target.value)}
              type="date"
              min={today}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Начало</label>
            <input
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              type="time"
              required
              className={inputCls}
            />
          </div>

          {/* Optional end time */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasEndTime}
                onChange={e => setHasEndTime(e.target.checked)}
                className="rounded border-white/20 bg-transparent accent-white"
              />
              <span className="text-text-muted text-xs tracking-wide uppercase">Указать время окончания</span>
            </label>
            {hasEndTime && (
              <input
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                type="time"
                required
                className={`${inputCls} mt-2`}
              />
            )}
          </div>

          <div>
            <label className={labelCls}>Заметки (необязательно)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Предпочтения, детали..."
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-status-busy text-xs border border-status-busy/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/15 hover:border-white/30 text-text-muted hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Создаём...' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
