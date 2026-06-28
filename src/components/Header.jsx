const IconSun = () => (
  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

const IconMoon = () => (
  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

import { GROUPS } from '../data/schedule'

export default function Header({ darkMode, onToggleDark, group, onSelectGroup }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-title">
          <span className="header-dot" />
          <h1>Расписание</h1>
        </div>

        <div className="header-actions">
          <div className="group-switch" role="group" aria-label="Группа">
            {GROUPS.map((g) => (
              <button
                key={g}
                className={`group-switch-btn${g === group ? ' group-switch-btn--active' : ''}`}
                onClick={() => onSelectGroup(g)}
                aria-pressed={g === group}
              >
                {g}
              </button>
            ))}
          </div>
          <button
            className="theme-toggle"
            onClick={onToggleDark}
            aria-label="Переключить тему"
          >
            {darkMode ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>
    </header>
  )
}
