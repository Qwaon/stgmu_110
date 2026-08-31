import { parseMinutes, getStartEnd } from '../utils/time'

const TYPE_LABEL = {
  'лек.':      { label: 'Лекция',           cls: 'badge--lecture'  },
  'пр.':       { label: 'Практика',         cls: 'badge--practice' },
  'пр., лаб.': { label: 'Практика / лаб.',  cls: 'badge--practice' },
  'лаб., пр.': { label: 'Практика / лаб.',  cls: 'badge--practice' },
}

// SF Symbols: mappin
const RoomIcon = () => (
  <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.60938 2.32617C3.60938 1.04883 4.63477 0 5.92383 0C7.20703 0 8.23828 1.04883 8.23828 2.32617C8.23828 3.39258 7.51758 4.30078 6.52734 4.56445V8.25586C6.52734 9.85547 6.17578 10.834 5.92383 10.834C5.66602 10.834 5.30859 9.84961 5.30859 8.25586V4.56445C4.32422 4.29492 3.60938 3.39258 3.60938 2.32617ZM5.26758 2.45508C5.70117 2.45508 6.05859 2.08594 6.05859 1.6582C6.05859 1.23047 5.70117 0.867188 5.26758 0.867188C4.8457 0.867188 4.4707 1.23047 4.4707 1.6582C4.4707 2.08594 4.8457 2.45508 5.26758 2.45508ZM5.91797 13.125C2.20898 13.125 0 11.877 0 10.4473C0 8.87109 2.41992 7.86328 4.3125 7.78711V8.81836C3.0293 8.87109 1.33008 9.48047 1.33008 10.3301C1.33008 11.3438 3.25781 12.0352 5.91797 12.0352C8.57812 12.0352 10.5117 11.3379 10.5117 10.3301C10.5117 9.48047 8.8125 8.87109 7.52344 8.81836V7.78711C9.42188 7.86328 11.8418 8.87109 11.8418 10.4473C11.8418 11.877 9.63281 13.125 5.91797 13.125Z" />
  </svg>
)

// SF Symbols: person.fill
const PersonIcon = () => (
  <svg width="9" height="10" viewBox="0 0 10 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.95117 5.14453C3.67383 5.14453 2.58984 4.00195 2.58984 2.54883C2.58984 1.11914 3.67969 0 4.95117 0C6.22266 0 7.3125 1.0957 7.3125 2.53711C7.3125 4.00195 6.23438 5.14453 4.95117 5.14453ZM1.04883 10.5879C0.392578 10.5879 0 10.2773 0 9.76172C0 8.25586 1.91016 6.18164 4.95117 6.18164C7.98633 6.18164 9.90234 8.25586 9.90234 9.76172C9.90234 10.2773 9.50391 10.5879 8.84766 10.5879H1.04883Z" />
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
          <div className="lesson-teacher">
            <PersonIcon />
            <span>{lesson.teacher}</span>
          </div>
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
