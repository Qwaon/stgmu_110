'use client'
import { useState } from 'react'
import { createBooking } from '@/app/dashboard/bookings/actions'
import type { Room } from '@/lib/types'

interface Props {
  rooms: Room[]
  onClose: () => void
}

function todayLocal() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function toISOLocal(dateStr: string, timeStr: string): string {
  // Combine local date + time into ISO string for DB (stored as UTC)
  return new Date(`${dateStr}T${timeStr}`).toISOString()
}

export default function CreateBookingModal({ rooms, onClose }: Props) {
  const today = todayLocal()

  const [roomId,      setRoomId]      = useState(rooms[0]?.id ?? '')
  const [clientName,  setClientName]  = useState('')
  const [phone,       setPhone]       = useState('')
  const [date,        setDate]        = useState(today)
  const [startTime,   setStartTime]   = useState('10:00')
  const [endTime,     setEndTime]     = useState('11:00')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (startTime >= endTime) {
      setError('Время окончания должно быть позже начала')
      return
    }

    setLoading(true)
    try {
      const result = await createBooking(
        roomId,
        clientName,
        phone,
        toISOLocal(date, startTime),
        toISOLocal(date, endTime),
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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-white font-bold text-base">Новая бронь</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Room */}
          <div>
            <label className="text-text-muted text-xs mb-1 block">Комната</label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              required
              className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.type === 'vip' ? ' (VIP)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Client name */}
          <div>
            <label className="text-text-muted text-xs mb-1 block">Имя клиента</label>
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Иванов Иван"
              required
              className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light placeholder:text-text-muted"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-text-muted text-xs mb-1 block">Телефон</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+7 999 000 00 00"
              type="tel"
              className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light placeholder:text-text-muted"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-text-muted text-xs mb-1 block">Дата</label>
            <input
              value={date}
              onChange={e => setDate(e.target.value)}
              type="date"
              min={today}
              required
              className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light"
            />
          </div>

          {/* Time range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-text-muted text-xs mb-1 block">Начало</label>
              <input
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                type="time"
                required
                className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light"
              />
            </div>
            <div className="flex-1">
              <label className="text-text-muted text-xs mb-1 block">Конец</label>
              <input
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                type="time"
                required
                className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-text-muted text-xs mb-1 block">Заметки (необязательно)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Предпочтения, детали..."
              className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light placeholder:text-text-muted"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-2 hover:bg-surface-3 text-text-muted text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? 'Создаём...' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
