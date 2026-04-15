/**
 * Calculate active elapsed time in milliseconds.
 * Subtracts accumulated paused duration and current pause if session is paused.
 */
export function calculateElapsedMs(
  startedAt: string,
  pausedAt: string | null,
  pausedDurationMs: number,
  now: number = Date.now()
): number {
  const start = new Date(startedAt).getTime()
  let elapsed = now - start - pausedDurationMs

  if (pausedAt) {
    const pauseStart = new Date(pausedAt).getTime()
    elapsed -= now - pauseStart
  }

  return Math.max(0, elapsed)
}

/**
 * Convert elapsed milliseconds to billable minutes (rounded up).
 */
export function calculateSessionMinutes(elapsedMs: number): number {
  return Math.ceil(elapsedMs / (1000 * 60))
}

/**
 * Calculate session cost with tiered pricing:
 * - First 60 minutes: firstHourRate (prorated)
 * - Beyond 60 minutes: firstHourRate + (additionalMinutes / 60) × subsequentRate
 * If subsequentRate is omitted, flat rate applies (backward compat).
 */
export function calculateSessionAmount(
  minutes: number,
  firstHourRate: number,
  subsequentRate: number = firstHourRate,
): number {
  if (minutes <= 0) return 0
  if (minutes <= 60) {
    return Math.round((minutes / 60) * firstHourRate * 100) / 100
  }
  const additional = Math.round(((minutes - 60) / 60) * subsequentRate * 100) / 100
  return Math.round((firstHourRate + additional) * 100) / 100
}

/**
 * Format milliseconds as MM:SS (under 1h) or H:MM:SS (1h+).
 */
export function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}
