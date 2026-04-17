'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <h2 className="text-white font-semibold text-lg mb-2">Что-то пошло не так</h2>
        <p className="text-text-muted text-sm mb-6">
          {error.message || 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.'}
        </p>
        <button
          onClick={reset}
          className="border border-white/20 hover:border-white/50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}
