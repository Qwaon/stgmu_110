# Phase 2 — Заказы и оплата: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить управление заказами к активным сессиям — каталог товаров с CRUD, добавление позиций через SessionSheet, автопересчёт итога.

**Architecture:** `RoomCard` открывает `SessionSheet` (детали сессии + заказы); из `SessionSheet` открывается `AddOrderModal` (выбор из каталога); `menu_items` таблица хранит каталог с `is_pinned` и `order_count`; Server Actions атомарно создают заказ и инкрементируют счётчик через SQL RPC.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Realtime)

---

## File Map

**Новые файлы:**
- `supabase/migrations/0004_menu.sql` — таблица menu_items + RLS + RPC
- `src/components/SessionSheet.tsx` — детали сессии, список заказов, кнопки пауза/завершить
- `src/components/AddOrderModal.tsx` — выбор товара из каталога, счётчик количества
- `src/app/dashboard/menu/page.tsx` — Server Component: страница управления каталогом
- `src/app/dashboard/menu/actions.ts` — Server Actions: CRUD для menu_items

**Изменяемые файлы:**
- `src/lib/types.ts` — добавить тип `MenuItem`
- `src/app/dashboard/rooms/actions.ts` — добавить `addOrder`
- `src/components/RoomCard.tsx` — заменить прямой EndSessionModal на SessionSheet, добавить кнопку «+ Заказ»
- `src/components/RoomGrid.tsx` — передать `clubId` в RoomCard, добавить `orders` в Realtime подписку, wire `onEnded`
- `src/app/dashboard/layout.tsx` — добавить «Меню» в навигацию
- `src/components/EndSessionModal.tsx` — ₸ → ₽
- `src/components/RoomCard.tsx` — ₸ → ₽

---

## Task 1: Миграция — таблица menu_items

**Files:**
- Create: `supabase/migrations/0004_menu.sql`

- [ ] **Step 1: Создать файл миграции**

```sql
-- supabase/migrations/0004_menu.sql

create table menu_items (
  id          uuid primary key default uuid_generate_v4(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  price       numeric(10,2) not null,
  is_pinned   boolean not null default false,
  order_count int not null default 0,
  created_at  timestamptz default now()
);

alter table menu_items enable row level security;

-- Админ видит и редактирует только свой клуб
create policy "admin_own_club_menu" on menu_items
  for all
  using (
    club_id = (select club_id from users where id = auth.uid())
  )
  with check (
    club_id = (select club_id from users where id = auth.uid())
  );

-- Владелец читает все клубы
create policy "owner_all_menu" on menu_items
  for select
  using (
    exists (select 1 from users where id = auth.uid() and role = 'owner')
  );

-- RPC для атомарного инкремента order_count
create or replace function increment_order_count(item_id uuid, amount int)
returns void language sql security definer as $$
  update menu_items set order_count = order_count + amount where id = item_id;
$$;
```

- [ ] **Step 2: Запустить миграцию**

Supabase Dashboard → SQL Editor → вставить содержимое `0004_menu.sql` → Run.

Проверить: Database → Tables → таблица `menu_items` появилась.

- [ ] **Step 3: Коммит**

```bash
git add supabase/migrations/0004_menu.sql
git commit -m "feat: add menu_items migration"
```

---

## Task 2: Тип MenuItem

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Добавить интерфейс MenuItem**

В `src/lib/types.ts` после интерфейса `Order` добавить:

```typescript
export interface MenuItem {
  id: string
  club_id: string
  name: string
  price: number
  is_pinned: boolean
  order_count: number
  created_at: string
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/lib/types.ts
git commit -m "feat: add MenuItem type"
```

---

## Task 3: ₸ → ₽

**Files:**
- Modify: `src/components/EndSessionModal.tsx`
- Modify: `src/components/RoomCard.tsx`

- [ ] **Step 1: Заменить в EndSessionModal.tsx**

В `src/components/EndSessionModal.tsx` заменить все `₸` на `₽`.

Строки для замены:
- `<span className="text-white font-medium">{sessionAmount} ₸</span>` → `₽`
- `<span className="text-white font-medium">{order.price * order.quantity} ₸</span>` → `₽`
- `<span className="text-accent-light font-black text-xl">{total} ₸</span>` → `₽`

- [ ] **Step 2: Заменить в RoomCard.tsx**

В `src/components/RoomCard.tsx`:
- `<span className="text-text-muted text-xs whitespace-nowrap">{hourlyRate} ₸/ч</span>` → `₽/ч`

- [ ] **Step 3: Коммит**

```bash
git add src/components/EndSessionModal.tsx src/components/RoomCard.tsx
git commit -m "fix: replace ₸ with ₽"
```

---

## Task 4: Server Action addOrder

**Files:**
- Modify: `src/app/dashboard/rooms/actions.ts`

- [ ] **Step 1: Добавить addOrder в конец actions.ts**

```typescript
export async function addOrder(
  sessionId: string,
  menuItemId: string,
  quantity: number
): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  // Снапшот цены и названия на момент заказа
  const { data: item, error: itemErr } = await supabase
    .from('menu_items')
    .select('name, price')
    .eq('id', menuItemId)
    .eq('club_id', clubId)
    .single()

  if (itemErr || !item) throw new Error('Menu item not found')

  const { error: orderErr } = await supabase
    .from('orders')
    .insert({
      session_id: sessionId,
      club_id:    clubId,
      item_name:  item.name,
      price:      item.price,
      quantity,
    })

  if (orderErr) throw new Error(orderErr.message)

  // Атомарный инкремент счётчика популярности
  await supabase.rpc('increment_order_count', { item_id: menuItemId, amount: quantity })

  revalidatePath('/dashboard/rooms')
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/app/dashboard/rooms/actions.ts
git commit -m "feat: add addOrder server action"
```

---

## Task 5: Server Actions для каталога

**Files:**
- Create: `src/app/dashboard/menu/actions.ts`

- [ ] **Step 1: Создать actions.ts**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) throw new Error('No club assigned')
  return { supabase, clubId: profile.club_id as string }
}

export async function createMenuItem(name: string, price: number): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .insert({ club_id: clubId, name: name.trim(), price })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}

export async function updateMenuItem(id: string, name: string, price: number): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .update({ name: name.trim(), price })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}

export async function togglePin(id: string, currentPinned: boolean): Promise<void> {
  const { supabase, clubId } = await getAuthContext()

  const { error } = await supabase
    .from('menu_items')
    .update({ is_pinned: !currentPinned })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/app/dashboard/menu/actions.ts
git commit -m "feat: menu catalog server actions"
```

---

## Task 6: Страница /dashboard/menu

**Files:**
- Create: `src/app/dashboard/menu/page.tsx`

- [ ] **Step 1: Создать page.tsx**

```typescript
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

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('club_id', profile!.club_id)
    .order('is_pinned', { ascending: false })
    .order('order_count', { ascending: false })

  const menuItems: MenuItem[] = items ?? []
  const pinned = menuItems.filter(i => i.is_pinned)
  const rest   = menuItems.filter(i => !i.is_pinned)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-white font-bold text-xl mb-6">Меню</h1>

      {/* Форма добавления */}
      <form
        action={async (formData: FormData) => {
          'use server'
          const name  = formData.get('name') as string
          const price = parseFloat(formData.get('price') as string)
          if (name && !isNaN(price) && price > 0) await createMenuItem(name, price)
        }}
        className="bg-surface rounded-2xl p-4 mb-6 flex gap-3 border border-white/10"
      >
        <input
          name="name"
          placeholder="Название товара"
          required
          className="flex-1 bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light placeholder:text-text-muted"
        />
        <input
          name="price"
          type="number"
          min="1"
          step="1"
          placeholder="Цена ₽"
          required
          className="w-28 bg-surface-2 text-white text-sm rounded-xl px-3 py-2 border border-white/10 outline-none focus:border-accent-light placeholder:text-text-muted"
        />
        <button
          type="submit"
          className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Добавить
        </button>
      </form>

      {/* Закреплённые */}
      {pinned.length > 0 && (
        <section className="mb-6">
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-3">📌 Закреплённые</p>
          <ItemList items={pinned} />
        </section>
      )}

      {/* Все остальные */}
      <section>
        {pinned.length > 0 && rest.length > 0 && (
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-3">Все позиции</p>
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
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className="bg-surface rounded-xl px-4 py-3 flex items-center gap-3 border border-white/5"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{item.name}</p>
            <p className="text-text-muted text-xs">{item.price} ₽ · заказов: {item.order_count}</p>
          </div>

          <form action={async () => { 'use server'; await togglePin(item.id, item.is_pinned) }}>
            <button
              type="submit"
              title={item.is_pinned ? 'Снять закреп' : 'Закрепить'}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                item.is_pinned
                  ? 'bg-accent/30 text-accent-light'
                  : 'bg-surface-2 text-text-muted hover:text-white'
              }`}
            >
              📌
            </button>
          </form>

          <form action={async () => { 'use server'; await deleteMenuItem(item.id) }}>
            <button
              type="submit"
              title="Удалить"
              className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 text-text-muted hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/app/dashboard/menu/page.tsx
git commit -m "feat: menu catalog page"
```

---

## Task 7: AddOrderModal

**Files:**
- Create: `src/components/AddOrderModal.tsx`

- [ ] **Step 1: Создать AddOrderModal.tsx**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addOrder } from '@/app/dashboard/rooms/actions'
import type { MenuItem } from '@/lib/types'

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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-white font-bold text-base">Добавить позицию</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white text-xl leading-none">×</button>
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
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">📌 Закреплённые</p>
                <div className="flex flex-wrap gap-2">
                  {pinned.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setSelected(item); setQuantity(1) }}
                      className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${
                        selected?.id === item.id
                          ? 'bg-accent border-accent-light text-white'
                          : 'bg-surface-2 border-white/10 text-white hover:border-accent-light'
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
                  <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">Все позиции</p>
                )}
                <div className="space-y-1">
                  {rest.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setSelected(item); setQuantity(1) }}
                      className={`w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors flex justify-between ${
                        selected?.id === item.id
                          ? 'bg-accent border-accent-light text-white'
                          : 'bg-surface-2 border-white/10 text-white hover:border-accent-light'
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
                  className="w-8 h-8 rounded-lg bg-surface-2 text-white font-bold hover:bg-surface-3 transition-colors"
                >−</button>
                <span className="text-white font-bold w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-8 h-8 rounded-lg bg-surface-2 text-white font-bold hover:bg-surface-3 transition-colors"
                >+</button>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Итого</span>
              <span className="text-white font-bold">{(selected.price * quantity).toFixed(0)} ₽</span>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleAdd}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? 'Добавляем...' : 'Добавить'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/components/AddOrderModal.tsx
git commit -m "feat: AddOrderModal component"
```

---

## Task 8: SessionSheet

**Files:**
- Create: `src/components/SessionSheet.tsx`

- [ ] **Step 1: Создать SessionSheet.tsx**

```typescript
'use client'
import { useState } from 'react'
import { pauseSession, resumeSession } from '@/app/dashboard/rooms/actions'
import {
  calculateElapsedMs,
  calculateSessionAmount,
  calculateSessionMinutes,
} from '@/lib/session'
import type { Room, ActiveSession } from '@/lib/types'
import SessionTimer from './SessionTimer'
import AddOrderModal from './AddOrderModal'
import EndSessionModal from './EndSessionModal'

interface Props {
  room: Room
  session: ActiveSession
  clubId: string
  hourlyRate: number
  onClose: () => void
  onEnded?: (sessionId: string, roomId: string) => void
}

export default function SessionSheet({ room, session, clubId, hourlyRate, onClose, onEnded }: Props) {
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [showEnd, setShowEnd]           = useState(false)
  const [pausing, setPausing]           = useState(false)

  const elapsedMs     = calculateElapsedMs(session.started_at, session.paused_at, session.paused_duration_ms)
  const minutes       = calculateSessionMinutes(elapsedMs)
  const sessionAmount = calculateSessionAmount(minutes, hourlyRate)
  const ordersTotal   = session.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  const total         = Math.round((sessionAmount + ordersTotal) * 100) / 100

  async function handlePauseResume() {
    setPausing(true)
    try {
      if (session.status === 'active') await pauseSession(session.id)
      else await resumeSession(session.id)
    } finally {
      setPausing(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-surface rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl">

          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-start">
            <div>
              <h2 className="text-white font-bold text-base">{room.name}</h2>
              <p className="text-text-muted text-sm">{session.client_name}</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white text-xl leading-none mt-0.5">×</button>
          </div>

          {/* Таймер + предварительная сумма */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <SessionTimer
              startedAt={session.started_at}
              pausedAt={session.paused_at}
              pausedDurationMs={session.paused_duration_ms}
              status={session.status}
            />
            <div className="text-right">
              <p className="text-white font-bold text-lg">{total} ₽</p>
              <p className="text-text-muted text-xs">предварительно</p>
            </div>
          </div>

          {/* Список заказов */}
          <div className="p-4 border-b border-white/10">
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">Заказы</p>
            {session.orders.length === 0 ? (
              <p className="text-text-muted text-sm">Нет заказов</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {session.orders.map(order => (
                  <div key={order.id} className="flex justify-between text-sm">
                    <span className="text-white">{order.item_name} ×{order.quantity}</span>
                    <span className="text-text-muted">{(order.price * order.quantity).toFixed(0)} ₽</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowAddOrder(true)}
              className="mt-1 w-full bg-surface-2 hover:bg-surface-3 text-accent-light text-sm font-semibold py-2 rounded-xl border border-white/5 transition-colors"
            >
              + Добавить позицию
            </button>
          </div>

          {/* Кнопки действий */}
          <div className="p-4 flex gap-2">
            <button
              onClick={handlePauseResume}
              disabled={pausing}
              className="flex-1 bg-surface-2 hover:bg-surface-3 disabled:opacity-50 text-text-muted text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {session.status === 'paused' ? '▶ Возобновить' : '⏸ Пауза'}
            </button>
            <button
              onClick={() => setShowEnd(true)}
              className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              ■ Завершить
            </button>
          </div>
        </div>
      </div>

      {showAddOrder && (
        <AddOrderModal
          sessionId={session.id}
          clubId={clubId}
          onClose={() => setShowAddOrder(false)}
          onAdded={() => setShowAddOrder(false)}
        />
      )}

      {showEnd && (
        <EndSessionModal
          room={room}
          session={session}
          hourlyRate={hourlyRate}
          onClose={() => setShowEnd(false)}
          onEnded={(sid, rid) => { onEnded?.(sid, rid); onClose() }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/components/SessionSheet.tsx
git commit -m "feat: SessionSheet component"
```

---

## Task 9: Обновить RoomCard и RoomGrid

**Files:**
- Modify: `src/components/RoomCard.tsx`
- Modify: `src/components/RoomGrid.tsx`

- [ ] **Step 1: Заменить содержимое RoomCard.tsx**

```typescript
'use client'
import { useState } from 'react'
import type { RoomWithSession } from '@/lib/types'
import SessionTimer from './SessionTimer'
import StartSessionModal from './StartSessionModal'
import SessionSheet from './SessionSheet'

const STATUS_BORDER = { free: 'border-green-500', busy: 'border-red-500', booked: 'border-yellow-500' } as const
const STATUS_TEXT   = { free: 'text-green-400',   busy: 'text-red-400',   booked: 'text-yellow-400'  } as const
const STATUS_LABEL  = { free: 'Свободна',          busy: 'Занята',         booked: 'Забронирована'    } as const

interface Props {
  room: RoomWithSession
  clubId: string
  clubHourlyRate: number
  onEnded?: (sessionId: string, roomId: string) => void
}

export default function RoomCard({ room, clubId, clubHourlyRate, onEnded }: Props) {
  const [showStart, setShowStart] = useState(false)
  const [showSheet, setShowSheet] = useState(false)

  const session    = room.active_session
  const hourlyRate = room.hourly_rate ?? clubHourlyRate

  return (
    <div className={`bg-surface rounded-2xl p-5 border-l-4 ${STATUS_BORDER[room.status]} flex flex-col gap-3 transition-colors hover:bg-surface-2`}>

      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-sm leading-tight">{room.name}</h3>
            {room.type === 'vip' && (
              <span className="text-[10px] font-bold tracking-widest text-accent-light bg-accent/20 px-1.5 py-0.5 rounded uppercase">
                VIP
              </span>
            )}
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${STATUS_TEXT[room.status]}`}>
            {STATUS_LABEL[room.status]}
          </span>
        </div>
        <span className="text-text-muted text-xs whitespace-nowrap">{hourlyRate} ₽/ч</span>
      </div>

      {/* Session info — клик открывает sheet */}
      {session ? (
        <div className="space-y-1 cursor-pointer" onClick={() => setShowSheet(true)}>
          <p className="text-white font-medium text-sm truncate">{session.client_name}</p>
          <SessionTimer
            startedAt={session.started_at}
            pausedAt={session.paused_at}
            pausedDurationMs={session.paused_duration_ms}
            status={session.status}
          />
          {session.orders.length > 0 && (
            <p className="text-text-muted text-xs">
              {session.orders.length} заказ{session.orders.length > 1 ? 'а' : ''}
            </p>
          )}
        </div>
      ) : (
        <p className="text-text-muted text-xs flex-1">Нет активных сессий</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {room.status === 'free' && (
          <button
            onClick={() => setShowStart(true)}
            className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2 px-3 rounded-xl transition-colors"
          >
            ▶ Начать
          </button>
        )}
        {room.status === 'busy' && session && (
          <>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 bg-surface-2 hover:bg-surface-3 text-accent-light text-sm font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              + Заказ
            </button>
            <button
              onClick={() => setShowSheet(true)}
              className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              ■ Завершить
            </button>
          </>
        )}
      </div>

      {showStart && (
        <StartSessionModal room={room} onClose={() => setShowStart(false)} />
      )}
      {showSheet && session && (
        <SessionSheet
          room={room}
          session={session}
          clubId={clubId}
          hourlyRate={hourlyRate}
          onClose={() => setShowSheet(false)}
          onEnded={onEnded}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Обновить RoomGrid.tsx**

В `src/components/RoomGrid.tsx` внести два изменения:

**2a. Добавить `orders` в Realtime подписку** — в блоке `.subscribe()` добавить перед `.subscribe()`:

```typescript
.on('postgres_changes', {
  event: '*', schema: 'public', table: 'orders',
  filter: `club_id=eq.${clubId}`,
}, () => refetch())
```

**2b. Обновить рендер RoomCard** — передать `clubId` и `onEnded`:

```typescript
{rooms.map(room => (
  <RoomCard
    key={room.id}
    room={room}
    clubId={clubId}
    clubHourlyRate={defaultHourlyRate}
    onEnded={(sessionId, roomId) => setUndoPending({ sessionId, roomId })}
  />
))}
```

- [ ] **Step 3: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 4: Коммит**

```bash
git add src/components/RoomCard.tsx src/components/RoomGrid.tsx
git commit -m "feat: RoomCard → SessionSheet, orders Realtime"
```

---

## Task 10: Добавить «Меню» в навигацию

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Добавить ссылку на /dashboard/menu**

В `src/app/dashboard/layout.tsx` в блоке `<nav>` добавить после ссылки «Бронирования»:

```typescript
<Link
  href="/dashboard/menu"
  className="px-4 py-3 text-sm font-medium text-text-muted hover:text-white transition-colors border-b-2 border-transparent"
>
  Меню
</Link>
```

- [ ] **Step 2: Запустить dev-сервер и проверить**

```bash
npm run dev
```

Проверить:
- Навигация показывает «Меню»
- `/dashboard/menu` открывается, форма добавления работает
- На карточке занятой комнаты появились кнопки «+ Заказ» и «■ Завершить»
- Нажатие любой из них открывает `SessionSheet`
- В `SessionSheet` кнопка «+ Добавить позицию» открывает `AddOrderModal`
- `AddOrderModal` грузит список товаров из каталога
- После добавления заказ появляется в `SessionSheet`
- «■ Завершить» в `SessionSheet` открывает `EndSessionModal` с верным итогом (время + заказы)

- [ ] **Step 3: Коммит**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: add Меню nav link"
```

---

## Self-review

- `MenuItem` тип: Task 2 → используется в Tasks 5, 6, 7 ✓
- `addOrder(sessionId, menuItemId, quantity)`: Task 4 → вызывается в Task 7 ✓
- `togglePin(id, currentPinned)`: Task 5 → вызывается в Task 6 ✓
- `SessionSheet` получает `clubId` prop → передаётся в `AddOrderModal` ✓
- `RoomCard` получает `clubId` prop → `RoomGrid` передаёт его в Task 9 ✓
- `onEnded` пробрасывается: `RoomGrid` → `RoomCard` → `SessionSheet` → `EndSessionModal` ✓
- ₸ → ₽ покрыто в Task 3 ✓
- `increment_order_count` RPC создаётся в `0004_menu.sql` в Task 1 ✓
- Realtime для таблицы `orders` добавлен в Task 9 ✓
