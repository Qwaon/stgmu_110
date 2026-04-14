'use client'
import { useEffect, useState } from 'react'
import { calculateElapsedMs, formatDuration } from '@/lib/session'
import type { SessionStatus } from '@/lib/types'

interface Props {
  startedAt: string
  pausedAt: string | null
  pausedDurationMs: number
  status: SessionStatus
}

export default function SessionTimer({ startedAt, pausedAt, pausedDurationMs, status }: Props) {
  const [elapsedMs, setElapsedMs] = useState(() =>
    calculateElapsedMs(startedAt, pausedAt, pausedDurationMs)
  )

  useEffect(() => {
    setElapsedMs(calculateElapsedMs(startedAt, pausedAt, pausedDurationMs))
    if (status !== 'active') return

    const interval = setInterval(() => {
      setElapsedMs(calculateElapsedMs(startedAt, pausedAt, pausedDurationMs))
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, pausedAt, pausedDurationMs, status])

  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-2xl font-black text-accent-light tabular-nums tracking-tight">
        {formatDuration(elapsedMs)}
      </span>
      {status === 'paused' && (
        <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
          пауза
        </span>
      )}
    </div>
  )
}
