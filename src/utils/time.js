import { DAYS, schedule } from '../data/schedule'

export function getTodayKey() {
  const jsDay = new Date().getDay()
  const found = DAYS.find((d) => d.jsDay === jsDay)
  return found ? found.key : null
}

// Возвращает Date для jsDay (1=Пн...5=Пт) текущей/следующей недели
// В выходные (сб/вс) показывает следующую неделю
export function getWeekDate(jsDay) {
  const today = new Date()
  const dow   = today.getDay() // 0=вс, 1=пн, ..., 6=сб
  const monday = new Date(today)
  if (dow === 0) {
    monday.setDate(today.getDate() + 1)       // вс → следующий пн (+1)
  } else if (dow === 6) {
    monday.setDate(today.getDate() + 2)       // сб → следующий пн (+2)
  } else {
    monday.setDate(today.getDate() - (dow - 1)) // пн–пт → этот пн
  }
  monday.setHours(0, 0, 0, 0)
  const d = new Date(monday)
  d.setDate(monday.getDate() + (jsDay - 1))
  return d
}

// "HH:MM" → минуты
export function parseMinutes(timeStr) {
  const [h, m] = timeStr.trim().split(':').map(Number)
  return h * 60 + m
}

// Извлекает первое начало и последний конец из "HH:MM–HH:MM" или "HH:MM–HH:MM / HH:MM–HH:MM"
export function getStartEnd(timeStr) {
  const parts = timeStr.split(' / ')
  const start = parts[0].split('–')[0].trim()
  const end   = parts[parts.length - 1].split('–')[1].trim()
  return [start, end]
}

// Date → 'YYYY-MM-DD'
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
