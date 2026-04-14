'use client'
import { useEffect, useState } from 'react'

interface Props {
  onUndo: () => void
  onExpire: () => void
  durationMs?: number
}

export default function UndoToast({ onUndo, onExpire, durationMs = 10000 }: Props) {
  const [remaining, setRemaining] = useState(Math.ceil(durationMs / 1000))

  useEffect(() => {
    const expireTimer = setTimeout(onExpire, durationMs)
    const countTimer  = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => { clearTimeout(expireTimer); clearInterval(countTimer) }
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-surface-2 border border-white/10 rounded-2xl px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4">
      <span className="text-text-muted text-sm">Сессия завершена</span>
      <div className="w-px h-4 bg-white/10" />
      <button
        onClick={onUndo}
        className="text-accent-light font-semibold text-sm hover:text-white transition-colors"
      >
        Отменить ({remaining}с)
      </button>
    </div>
  )
}
