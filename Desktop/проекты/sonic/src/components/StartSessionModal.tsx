'use client'
import { useState, useRef, useEffect } from 'react'
import { startSession } from '@/app/dashboard/rooms/actions'
import type { Room } from '@/lib/types'
import { IconX } from './icons'

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
}
