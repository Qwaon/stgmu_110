'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addOrder } from '@/app/dashboard/rooms/actions'
import type { MenuItem } from '@/lib/types'
import { IconX } from './icons'

interface Props {
  sessionId: string
  clubId: string
  onClose: () => void
  onAdded: () => void
}

export default function AddOrderModal({ sessionId, clubId, onClose, onAdded }: Props) {
  const [items, setItems]       = useState<MenuItem[]>([])
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('menu_items')
      .select('*')
      .eq('club_id', clubId)
      .order('is_pinned', { ascending: false })
      .order('order_count', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? [])
        setFetching(false)
      })
  }, [clubId])

  const pinned = items.filter(i => i.is_pinned)
  const rest   = items.filter(i => !i.is_pinned)

  async function handleAdd() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      await addOrder(sessionId, selected.id, quantity)
      onAdded()
      onClose()
    } catch {
      setError('Ошибка при добавлении заказа')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-white/15 rounded-lg w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-white font-semibold text-base">Добавить позицию</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {/* Item list */}
        {fetching ? (
          <div className="p-8 text-center text-text-muted text-sm">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            Каталог пуст. Добавьте позиции в разделе «Меню».
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto p-4 space-y-4">
            {pinned.length > 0 && (
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Закреплённые</p>
                <div className="flex flex-wrap gap-2">
                  {pinned.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setSelected(item); setQuantity(1) }}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                        selected?.id === item.id
                          ? 'border-white/60 text-white'
                          : 'border-white/15 text-text-muted hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {item.name} · {item.price} ₽
                    </button>
                  ))}
                </div>
              </div>
            )}
            {rest.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Все позиции</p>
                )}
                <div className="space-y-1">
                  {rest.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setSelected(item); setQuantity(1) }}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex justify-between ${
                        selected?.id === item.id
                          ? 'border-white/60 text-white'
                          : 'border-white/10 text-white hover:border-white/25'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-text-muted">{item.price} ₽</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quantity + submit */}
        {selected && (
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-sm">Количество</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg border border-white/15 hover:border-white/30 text-white font-bold transition-colors"
                >−</button>
                <span className="text-white font-bold w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-8 h-8 rounded-lg border border-white/15 hover:border-white/30 text-white font-bold transition-colors"
                >+</button>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Итого</span>
              <span className="text-white font-bold">{(selected.price * quantity).toFixed(0)} ₽</span>
            </div>
            {error && <p className="text-status-busy text-xs">{error}</p>}
            <button
              onClick={handleAdd}
              disabled={loading}
              className="w-full border border-white/30 hover:border-white/60 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Добавляем...' : 'Добавить'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
