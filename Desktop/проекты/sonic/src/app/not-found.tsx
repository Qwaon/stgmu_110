import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <p className="text-white/20 text-6xl font-bold mb-4">404</p>
        <h2 className="text-white font-semibold text-lg mb-2">Страница не найдена</h2>
        <p className="text-text-muted text-sm mb-6">
          Такой страницы не существует или она была перемещена.
        </p>
        <Link
          href="/dashboard/rooms"
          className="border border-white/20 hover:border-white/50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors inline-block"
        >
          На главную
        </Link>
      </div>
    </div>
  )
}
