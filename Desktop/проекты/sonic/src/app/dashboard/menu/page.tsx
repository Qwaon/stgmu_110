export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createMenuItem, deleteMenuItem, togglePin } from './actions'
import type { MenuItem } from '@/lib/types'

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('club_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.club_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Клуб не назначен. Обратитесь к владельцу.</p>
      </div>
    )
  }

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('club_id', profile.club_id)
    .order('is_pinned', { ascending: false })
    .order('order_count', { ascending: false })

  const menuItems: MenuItem[] = items ?? []
  const pinned = menuItems.filter(i => i.is_pinned)
  const rest   = menuItems.filter(i => !i.is_pinned)

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-white font-semibold text-lg tracking-wide mb-6">Меню</h1>

      {/* Add form */}
      <form
        action={async (formData: FormData) => {
          'use server'
          const name  = formData.get('name') as string
          const price = parseFloat(formData.get('price') as string)
          if (name && !isNaN(price) && price > 0) await createMenuItem(name, price)
        }}
        className="border border-white/10 rounded-lg p-4 mb-6 flex gap-3"
      >
        <input
          name="name"
          placeholder="Название товара"
          required
          className="flex-1 bg-transparent text-white text-sm rounded-lg px-3 py-2 border border-white/15 outline-none focus:border-white/50 transition-colors placeholder:text-text-muted"
        />
        <input
          name="price"
          type="number"
          min="1"
          step="1"
          placeholder="Цена ₽"
          required
          className="w-28 bg-transparent text-white text-sm rounded-lg px-3 py-2 border border-white/15 outline-none focus:border-white/50 transition-colors placeholder:text-text-muted"
        />
        <button
          type="submit"
          className="border border-white/30 hover:border-white/60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Добавить
        </button>
      </form>

      {/* Pinned */}
      {pinned.length > 0 && (
        <section className="mb-6">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">Закреплённые</p>
          <ItemList items={pinned} />
        </section>
      )}

      {/* Rest */}
      <section>
        {pinned.length > 0 && rest.length > 0 && (
          <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">Все позиции</p>
        )}
        {menuItems.length === 0 && (
          <p className="text-text-muted text-sm text-center py-12">
            Каталог пуст. Добавьте первую позицию выше.
          </p>
        )}
        <ItemList items={rest} />
      </section>
    </div>
  )
}

function ItemList({ items }: { items: MenuItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div
          key={item.id}
          className="border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{item.name}</p>
            <p className="text-text-muted text-xs">{item.price} ₽ · заказов: {item.order_count}</p>
          </div>

          <form action={async () => { 'use server'; await togglePin(item.id, item.is_pinned) }}>
            <button
              type="submit"
              title={item.is_pinned ? 'Снять закреп' : 'Закрепить'}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                item.is_pinned
                  ? 'border-white/30 text-white'
                  : 'border-white/10 text-text-muted hover:border-white/25 hover:text-white'
              }`}
            >
              {item.is_pinned ? '— открепить' : '+ закрепить'}
            </button>
          </form>

          <form action={async () => { 'use server'; await deleteMenuItem(item.id) }}>
            <button
              type="submit"
              title="Удалить"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-text-muted hover:border-status-busy/40 hover:text-status-busy transition-colors"
            >
              удалить
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}
