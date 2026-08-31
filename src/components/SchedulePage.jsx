import { useState } from 'react'
import { DAYS, schedules } from '../data/schedule'
import DayTabs from './DayTabs'
import LessonCard from './LessonCard'
import { getTodayKey, getLessonsForDate, getWeekDate } from '../utils/time'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function formatWeekRange(weekOffset) {
  const mon = getWeekDate(1, weekOffset)
  const fri = getWeekDate(5, weekOffset)
  const d1 = mon.getDate()
  const d2 = fri.getDate()
  const m1 = MONTHS[mon.getMonth()]
  const m2 = MONTHS[fri.getMonth()]
  return m1 === m2 ? `${d1}–${d2} ${m1}` : `${d1} ${m1} – ${d2} ${m2}`
}

export default function SchedulePage({ group }) {
  const todayKey = getTodayKey()
  const [activeDay, setActiveDay] = useState(todayKey || 'monday')
  const [weekOffset, setWeekOffset] = useState(0)

  const dayInfo  = DAYS.find((d) => d.key === activeDay)
  const weekDate = getWeekDate(dayInfo.jsDay, weekOffset)
  const lessons  = getLessonsForDate(activeDay, weekDate, schedules[group][activeDay])

  return (
    <div className="schedule-page">
      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Предыдущая неделя">
          <svg width="9" height="16" viewBox="0 0 6 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 5.18555C0.00585938 4.98633 0.0761719 4.81641 0.234375 4.66406L4.80469 0.193359C4.92773 0.0644531 5.0918 0 5.2793 0C5.66016 0 5.95898 0.292969 5.95898 0.673828C5.95898 0.861328 5.88281 1.03125 5.75391 1.16602L1.63477 5.18555L5.75391 9.20508C5.88281 9.33398 5.95898 9.50391 5.95898 9.69141C5.95898 10.0781 5.66016 10.3711 5.2793 10.3711C5.0918 10.3711 4.92773 10.3066 4.80469 10.1777L0.234375 5.70703C0.0761719 5.55469 0 5.38477 0 5.18555Z" />
          </svg>
        </button>
        <button
          className={`week-nav-label${weekOffset === 0 ? ' week-nav-label--current' : ''}`}
          onClick={() => setWeekOffset(0)}
        >
          {weekOffset === 0 ? 'Эта неделя' : formatWeekRange(weekOffset)}
        </button>
        <button className="week-nav-btn" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Следующая неделя">
          <svg width="9" height="16" viewBox="0 0 6 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.95898 5.18555C5.95898 5.38477 5.88867 5.55469 5.73047 5.70703L1.16016 10.1777C1.03125 10.3066 0.873047 10.3711 0.685547 10.3711C0.304688 10.3711 0 10.0781 0 9.69141C0 9.50391 0.0820312 9.33398 0.205078 9.20508L4.33008 5.18555L0.205078 1.16602C0.0761719 1.03125 0 0.861328 0 0.673828C0 0.292969 0.304688 0 0.685547 0C0.873047 0 1.03125 0.0644531 1.16016 0.193359L5.73047 4.66406C5.88281 4.81641 5.95898 4.98633 5.95898 5.18555Z" />
          </svg>
        </button>
      </div>

      <DayTabs active={activeDay} onSelect={setActiveDay} todayKey={todayKey} weekOffset={weekOffset} />

      <div className="schedule-day-heading">
        <span className="schedule-day-name">{dayInfo?.full}</span>
        {activeDay === todayKey && weekOffset === 0 && (
          <span className="today-badge">Сегодня</span>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="home-empty" style={{ minHeight: '40dvh' }}>
          <p className="home-empty-title">Занятий нет</p>
          <p className="home-empty-sub">На эту дату пар не запланировано</p>
        </div>
      ) : (
        <div className="lessons-list">
          {lessons.map((lesson, i) => (
            <LessonCard key={i} lesson={lesson} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
