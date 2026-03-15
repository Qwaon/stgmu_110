import { useState } from 'react'
import { DAYS } from '../data/schedule'
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

export default function SchedulePage() {
  const todayKey = getTodayKey()
  const [activeDay, setActiveDay] = useState(todayKey || 'monday')
  const [weekOffset, setWeekOffset] = useState(0)

  const dayInfo  = DAYS.find((d) => d.key === activeDay)
  const weekDate = getWeekDate(dayInfo.jsDay, weekOffset)
  const lessons  = getLessonsForDate(activeDay, weekDate)

  return (
    <div className="schedule-page">
      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Предыдущая неделя">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          className={`week-nav-label${weekOffset === 0 ? ' week-nav-label--current' : ''}`}
          onClick={() => setWeekOffset(0)}
        >
          {weekOffset === 0 ? 'Эта неделя' : formatWeekRange(weekOffset)}
        </button>
        <button className="week-nav-btn" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Следующая неделя">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
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
