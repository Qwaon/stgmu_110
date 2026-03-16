import { useState, useEffect } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import HomePage from './components/HomePage'
import SchedulePage from './components/SchedulePage'

export default function App() {
  const [page, setPage] = useState('home')
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <div className="app">
      <Header darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />

      <main className="main">
        {page === 'home'     && <HomePage />}
        {page === 'schedule' && <SchedulePage />}
      </main>

      <BottomNav active={page} onSelect={setPage} />
    </div>
  )
}
