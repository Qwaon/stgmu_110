import { describe, it, expect } from 'vitest'
import {
  calculateElapsedMs,
  calculateSessionMinutes,
  calculateSessionAmount,
  formatDuration,
} from '@/lib/session'

describe('calculateElapsedMs', () => {
  it('returns elapsed time minus paused duration', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const now = new Date('2026-04-15T11:00:00.000Z').getTime()
    const result = calculateElapsedMs(startedAt, null, 0, now)
    expect(result).toBe(60 * 60 * 1000)
  })

  it('subtracts accumulated paused duration', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const now = new Date('2026-04-15T11:00:00.000Z').getTime()
    const pausedDurationMs = 10 * 60 * 1000
    const result = calculateElapsedMs(startedAt, null, pausedDurationMs, now)
    expect(result).toBe(50 * 60 * 1000)
  })

  it('subtracts current pause if paused_at is set', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const pausedAt = '2026-04-15T10:50:00.000Z'
    const now = new Date('2026-04-15T11:00:00.000Z').getTime()
    const result = calculateElapsedMs(startedAt, pausedAt, 0, now)
    expect(result).toBe(50 * 60 * 1000)
  })

  it('never returns negative value', () => {
    const startedAt = '2026-04-15T10:00:00.000Z'
    const now = new Date('2026-04-15T10:00:00.000Z').getTime()
    expect(calculateElapsedMs(startedAt, null, 0, now)).toBe(0)
  })
})

describe('calculateSessionMinutes', () => {
  it('rounds up partial minutes', () => {
    expect(calculateSessionMinutes(30 * 1000)).toBe(1)
  })

  it('returns exact minutes for whole hours', () => {
    expect(calculateSessionMinutes(60 * 60 * 1000)).toBe(60)
  })

  it('returns 90 for 1.5 hours', () => {
    expect(calculateSessionMinutes(90 * 60 * 1000)).toBe(90)
  })
})

describe('calculateSessionAmount', () => {
  it('charges 500 for exactly 60 minutes at 500/hr', () => {
    expect(calculateSessionAmount(60, 500)).toBe(500)
  })

  it('charges 750 for 90 minutes at 500/hr', () => {
    expect(calculateSessionAmount(90, 500)).toBe(750)
  })

  it('rounds to 2 decimal places', () => {
    expect(calculateSessionAmount(10, 500)).toBeCloseTo(83.33, 2)
  })
})

describe('formatDuration', () => {
  it('formats under 1 hour as MM:SS', () => {
    expect(formatDuration(5 * 60 * 1000 + 30 * 1000)).toBe('05:30')
  })

  it('formats over 1 hour as H:MM:SS', () => {
    expect(formatDuration(65 * 60 * 1000 + 5 * 1000)).toBe('1:05:05')
  })

  it('formats zero as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00')
  })
})
