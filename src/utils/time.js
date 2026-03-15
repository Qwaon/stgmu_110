import { DAYS, schedule } from '../data/schedule'

export function getTodayKey() {
  const jsDay = new Date().getDay()
  const found = DAYS.find((d) => d.jsDay === jsDay)
  return found ? found.key : null
}

// Returns Date for jsDay in week with offset (0=current, -1=prev, +1=next)
export function getWeekDate(jsDay, weekOffset = 0) {
  const today = new Date()
  const dow   = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const d = new Date(monday)
  d.setDate(monday.getDate() + (jsDay - 1))
  return d
}

// "HH:MM" -> minutes
export function parseMinutes(timeStr) {
  const [h, m] = timeStr.trim().split(':').map(Number)
  return h * 60 + m
}

// Extracts first start and last end from "HH:MM-HH:MM" or "HH:MM-HH:MM / HH:MM-HH:MM"
export function getStartEnd(timeStr) {
  const parts = timeStr.split(' / ')
  const start = parts[0].split('\u2013')[0].trim()
  const end   = parts[parts.length - 1].split('\u2013')[1].trim()
  return [start, end]
}

// Date -> 'YYYY-MM-DD'
function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isActiveOn(lesson, date) {
  const d = toYMD(date)
  if (lesson.specificDates) {
    return lesson.specificDates.includes(d)
  }
  if (lesson.dateFrom && lesson.dateTo) {
    return d >= lesson.dateFrom && d <= lesson.dateTo
  }
  return true
}

export function getLessonsForDate(dayKey, date) {
  return (schedule[dayKey] || []).filter((l) => isActiveOn(l, date))
}

export function getCurrentIndex(lessons) {
  const cur = new Date().getHours() * 60 + new Date().getMinutes()
  return lessons.findIndex((l) => {
    const [s, e] = getStartEnd(l.time)
    return cur >= parseMinutes(s) && cur <= parseMinutes(e)
  })
}

export function getNextIndex(lessons) {
  const cur = new Date().getHours() * 60 + new Date().getMinutes()
  return lessons.findIndex((l) => {
    const [s] = getStartEnd(l.time)
    return parseMinutes(s) > cur
  })
}
