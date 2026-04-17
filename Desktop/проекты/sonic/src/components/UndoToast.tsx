'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onUndo: () => void
  onExpire: () => void
  durationMs?: number
}

export default function UndoToast({ onUndo, onExpire, durationMs = 10000 }: Props) {
  const [remaining, setRemaining] = useState(Math.ceil(durationMs / 1000))
  const settledRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  const onUndoRef = useRef(onUndo)
  onExpireRef.current = onExpire
  onUndoRef.current = onUndo

  useEffect(() => {
    const expireTimer = setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true
        onExpireRef.current()
      }
    }, durationMs)
    const countTimer = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => { clearTimeout(expireTimer); clearInterval(countTimer) }
  }, [durationMs])

  const handleUndo = useCallback(() => {
    if (!settledRef.current) {
      settledRef.current = true
      onUndoRef.current()
    }
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-bg border border-white/15 rounded-lg px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4">
      <span className="text-text-muted text-sm">Сессия завершена</span>
      <div className="w-px h-4 bg-white/10" />
      <button
        onClick={handleUndo}
        className="text-white font-medium text-sm hover:text-white/70 transition-colors border-b border-white/30 pb-px"
      >
        Отменить ({remaining}с)
      </button>
    </div>
  )
}
