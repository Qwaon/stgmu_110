'use client'

export default function OwnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center max-w-sm">
        <h2 className="text-white font-semibold text-base mb-2">Ошибка загрузки</h2>
        <p className="text-text-muted text-sm mb-4">
          {error.message || 'Не удалось загрузить данные. Проверьте подключение.'}
        </p>
        <button
          onClick={reset}
          className="border border-white/20 hover:border-white/50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    </div>
  )
}
