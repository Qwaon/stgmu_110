import { parseMinutes, getStartEnd } from '../utils/time'

const TYPE_LABEL = {
  'лек.':      { label: 'Лекция',           cls: 'badge--lecture'  },
  'пр.':       { label: 'Практика',         cls: 'badge--practice' },
  'пр., лаб.': { label: 'Практика / лаб.',  cls: 'badge--practice' },
}

const RoomIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

function calcProgress(timeStr) {
  const [startStr, endStr] = getStartEnd(timeStr)
  const start = parseMinutes(startStr)
  const end   = parseMinutes(endStr)
  const cur   = new Date().getHours() * 60 + new Date().getMinutes()
  return Math.min(100, Math.max(0, ((cur - start) / (end - start)) * 100))
}

export default function LessonCard({ lesson, index, isNow = false, isNext = false, isPast = false }) {
  const badge    = lesson.type ? TYPE_LABEL[lesson.type] : null
  const progress = isNow ? calcProgress(lesson.time) : 0

  const cardClass = [
    'lesson-card',
    isNow  ? 'lesson-card--now'  : '',
    isNext ? 'lesson-card--next' : '',
    isPast ? 'lesson-card--past' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      {isNow && <div className="lesson-now-bar" />}

      <div className="lesson-index">
        <span className="lesson-index-num">{index + 1}</span>
        <span className="lesson-index-label">пара</span>
      </div>

      <div className="lesson-body">
        <div className="lesson-time">{lesson.time}</div>

        <div className="lesson-subject-row">
          <span className="lesson-subject">{lesson.subject}</span>
          {badge && (
            <span className={`lesson-badge ${badge.cls}`}>{badge.label}</span>
          )}
        </div>

        {lesson.teacher && (
          <div className="lesson-teacher">{lesson.teacher}</div>
        )}

        {lesson.room && (
          <div className="lesson-room">
            <RoomIcon />
            <span>{lesson.room}</span>
          </div>
        )}

        {isNow && (
          <div className="lesson-progress">
            <div className="lesson-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
