'use client'
import { useState, useEffect } from 'react'

export default function LiveClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) return null

  return (
    <span className="text-white text-sm font-mono tabular-nums tracking-wide">{time}</span>
  )
}
