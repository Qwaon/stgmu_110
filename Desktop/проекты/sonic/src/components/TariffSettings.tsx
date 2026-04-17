'use client'
import { useEffect, useState } from 'react'
import { updateRoomTariff } from '@/app/dashboard/tariffs/actions'
import type { Room } from '@/lib/types'
import { IconCheck } from './icons'

interface Props {
  rooms: Room[]
  clubId?: string
}

interface RoomDraft {
  firstHourRate: string
  subsequentRate: string
  saving: boolean
  saved: boolean
  error: string | null
}

function buildDrafts(rooms: Room[]): Record<string, RoomDraft> {
  return Object.fromEntries(rooms.map(r => [r.id, {
    firstHourRate: String(r.first_hour_rate ?? (r.type === 'vip' ? 350 : 250)),
    subsequentRate: String(r.subsequent_rate ?? (r.type === 'vip' ? 300 : 200)),
    saving: false,
    saved: false,
    error: null,
  }]))
}

export default function TariffSettings({ rooms, clubId }: Props) {
  const [drafts, setDrafts] = useState<Record<string, RoomDraft>>(() => buildDrafts(rooms))

  useEffect(() => {
    setDrafts(buildDrafts(rooms))
  }, [rooms])

  function update(id: string, field: 'firstHourRate' | 'subsequentRate', value: string) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value, saved: false, error: null } }))
  }

  async function save(room: Room) {
    const draft = drafts[room.id]
    const first = parseFloat(draft.firstHourRate)
    const sub   = parseFloat(draft.subsequentRate)

    if (isNaN(first) || first <= 0 || isNaN(sub) || sub <= 0) {
      setDrafts(prev => ({ ...prev, [room.id]: { ...prev[room.id], error: 'Введите корректные числа' } }))
      return
    }

    setDrafts(prev => ({ ...prev, [room.id]: { ...prev[room.id], saving: true, error: null } }))
    try {
      await updateRoomTariff(room.id, first, sub, clubId)
      setDrafts(prev => ({ ...prev, [room.id]: { ...prev[room.id], saving: false, saved: true } }))
    } catch {
      setDrafts(prev => ({ ...prev, [room.id]: { ...prev[room.id], saving: false, error: 'Ошибка сохранения' } }))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-text-muted text-sm mb-4">
        Тариф: первый час · дальше (₽/ч). По факту — клиент платит за реальное время.
      </p>

      {rooms.map(room => {
        const d = drafts[room.id]
        if (!d) return null
        return (
          <div key={room.id} className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-white font-semibold text-sm">{room.name}</p>
              {room.type === 'vip' && (
                <span className="text-[9px] font-bold tracking-widest text-white/50 border border-white/20 px-1 py-0.5 rounded uppercase">VIP</span>
              )}
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-text-muted text-xs mb-1 block tracking-wide uppercase">Первый час (₽)</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={d.firstHourRate}
                  onChange={e => update(room.id, 'firstHourRate', e.target.value)}
                  className="w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/50 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-text-muted text-xs mb-1 block tracking-wide uppercase">Далее (₽/ч)</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={d.subsequentRate}
                  onChange={e => update(room.id, 'subsequentRate', e.target.value)}
                  className="w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/50 transition-colors"
                />
              </div>
              <button
                onClick={() => save(room)}
                disabled={d.saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5 ${
                  d.saved
                    ? 'border border-status-free/40 text-status-free'
                    : 'border border-white/30 hover:border-white/60 text-white'
                }`}
              >
                {d.saving ? '...' : d.saved ? <><IconCheck />Сохранено</> : 'Сохранить'}
              </button>
            </div>

            {d.error && <p className="text-status-busy text-xs mt-2">{d.error}</p>}
          </div>
        )
      })}
    </div>
  )
}
