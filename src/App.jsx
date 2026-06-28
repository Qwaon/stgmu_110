import { useState, useEffect } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import HomePage from './components/HomePage'
import SchedulePage from './components/SchedulePage'
import { GROUPS, DEFAULT_GROUP } from './data/schedule'

export default function App() {
  const [page, setPage] = useState('home')
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [group, setGroup] = useState(() => {
    const saved = localStorage.getItem('group')
    return GROUPS.includes(saved) ? saved : DEFAULT_GROUP
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('group', group)
  }, [group])

  return (
    <div className="app">
      <Header
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        group={group}
        onSelectGroup={setGroup}
      />

      <main className="main">
        {page === 'home'     && <HomePage group={group} />}
        {page === 'schedule' && <SchedulePage group={group} />}
      </main>

      <BottomNav active={page} onSelect={setPage} />
    </div>
  )
}
