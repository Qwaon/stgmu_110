import { useState } from 'react'
import { DAYS } from '../data/schedule'
import DayTabs from './DayTabs'
import LessonCard from './LessonCard'
import { getTodayKey, getLessonsForDate, getWeekDate } from '../utils/time'

export default function SchedulePage() {
  const todayKey = getTodayKey()
  const [activeDay, setActiveDay] = useState(todayKey || 'monday')

  const dayInfo    = DAYS.find((d) => d.key === activeDay)
  const weekDate   = getWeekDate(dayInfo.jsDay)
  const lessons    = getLessonsForDate(activeDay, weekDate)

  return (
    <div className="schedule-page">
      <DayTabs active={activeDay} onSelect={setActiveDay} todayKey={todayKey} />

      <div className="schedule-day-heading">
        <span className="schedule-day-name">{dayInfo?.full}</span>
        {activeDay === todayKey && (
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
