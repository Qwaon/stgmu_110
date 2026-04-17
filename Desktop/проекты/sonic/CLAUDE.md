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
│   ├── login/page.tsx              — страница входа (поддержка ?next= редиректа)
│   ├── error.tsx                   — глобальный error boundary
│   ├── loading.tsx                 — глобальный loading spinner
│   ├─��� not-found.tsx               — кастомная 404
│   ├── dashboard/
│   │   ├── layout.tsx              — layout: хедер + навигация
│   │   ├── error.tsx               — error boundary для дашборда
│   │   ├── loading.tsx             — loading spinner для дашборда
│   │   ├── rooms/
│   │   │   ├── page.tsx            — Server Component: загрузка комнат
│   │   │   └── actions.ts          — Server Actions: старт/финиш/пауза сессий
│   │   ├── bookings/
│   │   │   ├── page.tsx            — список бронирований
│   │   │   └── actions.ts          — создание/отмена/заселение бронирований
│   │   ├── menu/actions.ts         — CRUD позиций меню
│   │   └── tariffs/actions.ts      — обновление тарифов
│   └── owner/
│       ├── layout.tsx              — layout владельца
│       ├── error.tsx               — error boundary для владельца
│       ├── loading.tsx             — loading spinner для владельца
│       ├── clubs/page.tsx          — обзор клубов (агрегация через RPC)
│       └── analytics/page.tsx      — графики, тепловая карта, CSV
├── components/
│   ├── RoomGrid.tsx                — Client: Realtime подписка, grid комнат
│   ├── RoomCard.tsx                — карточка комнаты (memo, бейдж брони, пульсация)
│   ├── SessionTimer.tsx            — живой таймер (обновляется каждую секунду)
│   ├── StartSessionModal.tsx       — модал: старт сессии одним тапом
│   ├── EndSessionModal.tsx         — модал: инвойс → завершить (тиерные тарифы)
│   ├── SessionSheet.tsx            — боттом-шит активной сессии (заказы, пауза)
│   ├── AddOrderModal.tsx           — добавить позицию из меню к сессии
│   ├── UndoToast.tsx               — 10с undo после завершения сессии
│   ├── BookingsList.tsx            — Client: бронирования (два таба + Realtime)
│   ├── CreateBookingModal.tsx      — форма создания брони
│   ├── TariffSettings.tsx          — редактор тарифов по комнатам
│   ├── ShiftSummaryModal.tsx       — сводка смены (итоги дня + CSV)
│   ├── SessionExpiredDialog.tsx    — попап когда scheduled_end_at истёк
│   └── owner/
│       ├── ClubsOverview.tsx       — два клуба side-by-side, авто-refresh через RPC
│       └── OwnerAnalytics.tsx      — графики выручки (recharts lazy), тепловая карта, CSV
├── lib/
│   ├── env.ts                      — валидация env-переменных при старте
│   ├── bookings.ts                 — валидация окна бронирования (включая проверку на прошлое)
│   ├── supabase/
│   │   ├── client.ts               — createBrowserClient (для Client Components)
│   │   └── server.ts               — createServerClient (для Server Components/Actions)
│   ├── types.ts                    — все TypeScript типы
│   └── session.ts                  — расчёт времени и стоимости (тиерные тарифы)
└── middleware.ts                    — защита роутов, ?next= URL после логина
```

## Роли и доступ

| Роль | Что видит | Доступ к Server Actions |
|------|-----------|------------------------|
| `owner` | Оба клуба — аналитика, обзор, меню, тарифы | menu + tariffs (с targetClubId, проверяется существование клуба) |
| `admin` | Только свой клуб — комнаты, сессии, заказы, бронирования | rooms + bookings + menu + tariffs (только свой club_id) |

- RLS в Supabase обеспечивает изоляцию через `club_id`
- Server Actions проверяют роль явно (`getAuthContext`)
- Owner не может вызвать admin-only actions (rooms, bookings) — получит 403

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

Таблицы: `clubs` → `rooms` → `sessions` → `orders`, `bookings`, `users`, `menu_items`

Ключевое поле: `club_id` — присутствует в каждой таблице, по нему строится RLS.

`paused_duration_ms` — суммарное время паузы в миллисекундах (bigint), не interval.

### Атомарные RPC-функции

Все мутации состояния через `SECURITY DEFINER VOLATILE` функции с `set search_path = ''`:
- `start_session_atomic`, `end_session_atomic`, `undo_end_session_atomic`
- `pause_session_atomic`, `resume_session_atomic`
- `cancel_booking_atomic`, `check_in_booking_atomic`
- `get_rooms_dashboard_payload`, `get_shift_summary_payload`
- `get_clubs_overview`, `get_owner_analytics` — серверная агрегация

### Миграции

Единый файл `supabase/migrations/setup_all.sql` — запускается один раз для нового проекта (базовая схема + RLS + seed). Расширения в отдельных файлах 0004–0017.

## Команды

```bash
npm run dev       # локальный сервер
npm run build     # продакшн-сборка
npm run test      # тесты в watch-режиме
npm run test:run  # тесты один раз
npx tsc --noEmit  # проверка типов
```

## Тесты

- `tests/session.test.ts` — расчёт времени, стоимости, форматирование
- `tests/bookings.test.ts` — валидация окна бронирования, видимость активных броней

## Важные паттерны

**Supabase в Server Component:**
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
Подписка на `rooms`, `sessions`, `orders`, `bookings` по `club_id=eq.{clubId}`.
Гранулярное обновление состояния через `setRooms` / `setBookings` без полного refetch.

## Безопасность

- HTTP-заголовки: CSP, X-Frame-Options: DENY, HSTS, nosniff, Permissions-Policy
- `poweredByHeader: false` в next.config.mjs
- Server Actions: санитизация ошибок (не показывают PG-ошибки клиенту)
- Валидация длин строк: phone ≤30, notes ≤500, menu name 1–100
- Env-переменные валидируются при старте (`src/lib/env.ts`)
- `?next=` URL сохраняется при редиректе на логин (только внутренние пути)

## Настройка Supabase (первый запуск)

1. Создать проект на supabase.com
2. `.env.local` → заполнить `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. SQL Editor → запустить `supabase/migrations/setup_all.sql`
4. Authentication → Users → создать `owner@sonic.stv`, `morozova@sonic.stv`, `tolstogo@sonic.stv`
5. SQL Editor → вставить UID из шага 4 в закомментированный INSERT в `setup_all.sql`
6. Database → Replication → включить таблицы `rooms`, `sessions`, `orders`, `bookings`
7. `npm run dev` → готово

## Текущий прогресс

- ✅ Phase 0: Фундамент (код готов, нужно подключить Supabase)
- ✅ Phase 1: Дашборд администратора
- ✅ Phase 2: Заказы и оплата (история сессий — отложена)
- ✅ Phase 3: Бронирования
- ✅ Phase 4: Панель владельца
- ✅ Phase 5: UX-автоматизации (адаптивность планшет — pending)
- ✅ Аудит: безопасность, баги, производительность, прод-readiness
- ⬜ Phase 6: Масштабирование
