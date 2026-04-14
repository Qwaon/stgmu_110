'use client'
import { useState, useRef, useEffect } from 'react'
import { startSession } from '@/app/dashboard/rooms/actions'
import type { Room } from '@/lib/types'

interface Props {
  room: Room
  onClose: () => void
}

export default function StartSessionModal({ room, onClose }: Props) {
  const [clientName, setClientName] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim()) return

    setLoading(true)
    setError(null)
    try {
      await startSession(room.id, clientName)
      onClose()
    } catch {
      setError('Не удалось начать сессию. Попробуйте снова.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">
        <h2 className="text-white font-bold text-lg mb-0.5">Начать сессию</h2>
        <p className="text-text-muted text-sm mb-5">{room.name}</p>

        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Имя клиента
            </label>
            <input
              ref={inputRef}
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              required
              maxLength={60}
              className="w-full bg-surface-2 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-text-muted focus:outline-none focus:border-accent-light transition-colors"
              placeholder="Например: Азамат"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
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
              disabled={loading || !clientName.trim()}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? 'Запуск...' : '▶ Начать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
