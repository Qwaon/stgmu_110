# PS Club Admin — CLAUDE.md

Система управления игровым PlayStation-клубом. Два клуба одного владельца, у каждого свой администратор.

## Стек

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Realtime + Auth)
- **Деплой:** Vercel
- **Тесты:** Vitest + @testing-library/react

## Структура проекта

```
src/
├── app/
│   ├── login/page.tsx          — страница входа
│   ├── dashboard/
│   │   ├── layout.tsx          — layout: хедер + навигация
│   │   ├── rooms/
│   │   │   ├── page.tsx        — Server Component: загрузка комнат
│   │   │   └── actions.ts      — Server Actions: старт/финиш/пауза сессий
│   │   └── bookings/page.tsx   — заглушка (Phase 3)
│   └── owner/page.tsx          — панель владельца (Phase 4)
├── components/
│   ├── RoomGrid.tsx            — Client: Realtime подписка, grid комнат
│   ├── RoomCard.tsx            — карточка комнаты
│   ├── SessionTimer.tsx        — живой таймер (обновляется каждую секунду)
│   ├── StartSessionModal.tsx   — модал: имя клиента → старт
│   ├── EndSessionModal.tsx     — модал: инвойс → завершить
│   └── UndoToast.tsx           — 10с undo после завершения сессии
└── lib/
    ├── supabase/
    │   ├── client.ts           — createBrowserClient (для Client Components)
    │   └── server.ts           — createServerClient (для Server Components/Actions)
    ├── types.ts                — все TypeScript типы
    └── session.ts              — расчёт времени и стоимости
```

## Роли и доступ

| Роль | Что видит |
|------|-----------|
| `owner` | Оба клуба — аналитика, обзор |
| `admin` | Только свой клуб — комнаты, сессии, заказы, бронирования |

RLS в Supabase обеспечивает изоляцию автоматически через `club_id`.

## Цветовая схема

```
bg:           #0f0f1a
surface:      #1a1a2e
surface-2:    #22223b
surface-3:    #2a2a42
accent:       #352F73
accent-light: #4a43a0
```

## База данных

Таблицы: `clubs` → `rooms` → `sessions` → `orders`, `bookings`, `users`

Ключевое поле: `club_id` — присутствует в каждой таблице, по нему строится RLS.

`paused_duration_ms` — суммарное время паузы в миллисекундах (bigint), не interval.

## Команды

```bash
npm run dev       # локальный сервер
npm run build     # продакшн-сборка
npm run test      # тесты в watch-режиме
npm run test:run  # тесты один раз
npx tsc --noEmit  # проверка типов
```

## Тесты

Юнит-тесты в `tests/session.test.ts` покрывают:
- `calculateElapsedMs` — расчёт активного времени с учётом пауз
- `calculateSessionMinutes` — перевод мс в минуты (округление вверх)
- `calculateSessionAmount` — стоимость сессии
- `formatDuration` — форматирование времени (MM:SS / H:MM:SS)

## Важные паттерны

**Суpabase в Server Component:**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**Supabase в Client Component:**
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

**Server Action:**
```typescript
'use server'
import { revalidatePath } from 'next/cache'
// ... мутация данных
revalidatePath('/dashboard/rooms')
```

**Realtime (в RoomGrid.tsx):**
Подписка на `rooms` и `sessions` по `club_id=eq.{clubId}`.
При любом событии вызывает `refetch()` — переполучает все комнаты с активными сессиями.

## Настройка Supabase (первый запуск)

1. Создать проект на supabase.com
2. `.env.local` → заполнить `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. SQL Editor → запустить `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_seed.sql`
4. Authentication → Users → создать `owner@psclub.kz`, `admin1@psclub.kz`, `admin2@psclub.kz`
5. SQL Editor → вставить UID из шага 4 в закомментированный INSERT в `0003_seed.sql`
6. Database → Replication → включить таблицы `rooms` и `sessions`

## Текущий прогресс

- ✅ Phase 0: Фундамент (код готов, нужно подключить Supabase)
- ✅ Phase 1: Дашборд администратора
- ⬜ Phase 2: Заказы и оплата
- ⬜ Phase 3: Бронирования
- ⬜ Phase 4: Панель владельца
- ⬜ Phase 5: UX-автоматизации
- ⬜ Phase 6: Масштабирование
