const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
)

const IconSchedule = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2.5" />
  </svg>
)

export default function BottomNav({ active, onSelect }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${active === 'home' ? 'bottom-nav-item--active' : ''}`}
        onClick={() => onSelect('home')}
      >
        <span className="bottom-nav-icon"><IconHome /></span>
        <span className="bottom-nav-label">Главная</span>
        {active === 'home' && <span className="bottom-nav-pip" />}
      </button>

      <button
        className={`bottom-nav-item ${active === 'schedule' ? 'bottom-nav-item--active' : ''}`}
        onClick={() => onSelect('schedule')}
      >
        <span className="bottom-nav-icon"><IconSchedule /></span>
        <span className="bottom-nav-label">Расписание</span>
        {active === 'schedule' && <span className="bottom-nav-pip" />}
      </button>
    </nav>
  )
}
