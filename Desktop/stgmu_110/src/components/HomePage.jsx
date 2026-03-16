import { useState, useEffect } from 'react'
import { DAYS } from '../data/schedule'
import LessonCard from './LessonCard'
import {
  getTodayKey,
  getLessonsForDate,
  parseMinutes,
  getStartEnd,
  getCurrentIndex,
  getNextIndex,
} from '../utils/time'

function BreakSeparator({ minutes }) {
  return (
    <div className="break-separator">
      <div className="break-line" />
      <span className="break-label">перерыв {minutes} мин</span>
      <div className="break-line" />
    </div>
  )
}

function minutesLabel(n) {
  if (n % 100 >= 11 && n % 100 <= 19) return `${n} минут`
  const r = n % 10
  if (r === 1) return `${n} минута`
  if (r >= 2 && r <= 4) return `${n} минуты`
  return `${n} минут`
}

export default function HomePage() {
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const todayKey = getTodayKey()
  const dayInfo  = DAYS.find((d) => d.key === todayKey)
  const today    = new Date()
  const lessons  = todayKey ? getLessonsForDate(todayKey, today) : []

  const nowIndex  = getCurrentIndex(lessons)
  const nextIndex = nowIndex === -1 ? getNextIndex(lessons) : -1

  if (!todayKey) {
    return (
      <div className="home-empty">
        <div className="home-empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <p className="home-empty-title">Занятий нет</p>
        <p className="home-empty-sub">Сегодня выходной</p>
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="home-page">
        <div className="home-date">
          <span className="home-day-name">{dayInfo.full}</span>
          <span className="home-date-str">
            {today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="home-empty" style={{ minHeight: '40dvh' }}>
          <p className="home-empty-title">Занятий нет</p>
          <p className="home-empty-sub">На сегодня пар не запланировано</p>
        </div>
      </div>
    )
  }

  const cur        = today.getHours() * 60 + today.getMinutes()
  const [, lastEndStr]    = getStartEnd(lessons[lessons.length - 1].time)
  const [firstStartStr]   = getStartEnd(lessons[0].time)
  const lastEnd    = parseMinutes(lastEndStr)
  const firstStart = parseMinutes(firstStartStr)
  const afterAll   = cur > lastEnd
  const beforeAll  = cur < firstStart

  let statusText = null
  if (nowIndex !== -1) {
    const [, endStr] = getStartEnd(lessons[nowIndex].time)
    const remaining  = parseMinutes(endStr) - cur
    statusText = {
      type: 'active',
      text: `Сейчас идёт пара ${nowIndex + 1}`,
      sub:  `осталось ${minutesLabel(remaining)}`,
    }
  } else if (!afterAll && nextIndex !== -1) {
    const [startStr] = getStartEnd(lessons[nextIndex].time)
    const until = parseMinutes(startStr) - cur
    statusText = {
      type: 'next',
      text: `${beforeAll ? 'Первая' : 'Следующая'} пара через ${minutesLabel(until)}`,
      sub:  lessons[nextIndex].time.split('–')[0],
    }
  } else if (afterAll) {
    statusText = { type: 'done', text: 'Занятия на сегодня завершены', sub: null }
  }

  return (
    <div className="home-page">
      <div className="home-date">
        <span className="home-day-name">{dayInfo.full}</span>
        <span className="home-date-str">
          {today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </span>
      </div>

      {statusText && (
        <div className={`home-status home-status--${statusText.type}`}>
          {statusText.type === 'active' && <span className="home-status-dot" />}
          {statusText.type === 'next'   && <span className="home-status-dash" />}
          {statusText.type === 'done'   && <span className="home-status-check" />}
          <div className="home-status-body">
            <span>{statusText.text}</span>
            {statusText.sub && <span className="home-status-sub">{statusText.sub}</span>}
          </div>
        </div>
      )}

      <div className="lessons-list">
        {lessons.map((lesson, i) => {
          const prev = lessons[i - 1]
          let breakMins = 0
          if (prev) {
            const [, prevEndStr]  = getStartEnd(prev.time)
            const [thisStartStr]  = getStartEnd(lesson.time)
            breakMins = parseMinutes(thisStartStr) - parseMinutes(prevEndStr)
          }

          return (
            <div key={i}>
              {breakMins > 0 && <BreakSeparator minutes={breakMins} />}
              <LessonCard
                lesson={lesson}
                index={i}
                isNow={i === nowIndex}
                isNext={nowIndex === -1 && i === nextIndex}
                isPast={afterAll || (nowIndex !== -1 && i < nowIndex)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
