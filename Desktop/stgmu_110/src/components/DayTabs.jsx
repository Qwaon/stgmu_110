import { DAYS } from '../data/schedule'
import { getWeekDate } from '../utils/time'

export default function DayTabs({ active, onSelect, todayKey }) {
  return (
    <nav className="day-tabs">
      {DAYS.map((day) => {
        const date = getWeekDate(day.jsDay)
        return (
          <button
            key={day.key}
            className={[
              'day-tab',
              active === day.key    ? 'day-tab--active' : '',
              todayKey === day.key  ? 'day-tab--today'  : '',
            ].join(' ')}
            onClick={() => onSelect(day.key)}
          >
            <span className="day-tab-short">{date.getDate()}</span>
            <span className="day-tab-full">{day.full}</span>
            {todayKey === day.key && <span className="today-dot" />}
          </button>
        )
      })}
    </nav>
  )
}
