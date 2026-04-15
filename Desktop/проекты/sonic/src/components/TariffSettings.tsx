'use client'
import { useState } from 'react'
import { updateRoomTariff } from '@/app/dashboard/tariffs/actions'
import type { Room } from '@/lib/types'

interface Props {
  rooms: Room[]
}

interface RoomDraft {
  firstHourRate: string
  subsequentRate: string
  saving: boolean
  saved: boolean
  error: string | null
}

export default function TariffSettings({ rooms }: Props) {
  const [drafts, setDrafts] = useState<Record<string, RoomDraft>>(
    Object.fromEntries(rooms.map(r => [r.id, {
      firstHourRate:  String(r.first_hour_rate  ?? (r.type === 'vip' ? 350 : 250)),
      subsequentRate: String(r.subsequent_rate  ?? (r.type === 'vip' ? 300 : 200)),
      saving: false,
      saved: false,
      error: null,
    }]))
  )

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
      await updateRoomTariff(room.id, first, sub)
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
        return (
          <div key={room.id} className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-white font-semibold text-sm">{room.name}</p>
              {room.type === 'vip' && (
                <span className="text-[10px] font-bold text-accent-light bg-accent/20 px-1.5 py-0.5 rounded uppercase">VIP</span>
              )}
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-text-muted text-xs mb-1 block">Первый час (₽)</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={d.firstHourRate}
                  onChange={e => update(room.id, 'firstHourRate', e.target.value)}
                  className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light"
                />
              </div>
              <div className="flex-1">
                <label className="text-text-muted text-xs mb-1 block">Далее (₽/ч)</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={d.subsequentRate}
                  onChange={e => update(room.id, 'subsequentRate', e.target.value)}
                  className="w-full bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light"
                />
              </div>
              <button
                onClick={() => save(room)}
                disabled={d.saving}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  d.saved
                    ? 'bg-green-600/30 text-green-400'
                    : 'bg-accent hover:bg-accent-hover text-white'
                }`}
              >
                {d.saving ? '...' : d.saved ? '✓' : 'Сохранить'}
              </button>
            </div>

            {d.error && <p className="text-red-400 text-xs mt-2">{d.error}</p>}
          </div>
        )
      })}
    </div>
  )
}
