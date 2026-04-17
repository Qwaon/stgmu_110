# PS Club — Roadmap

## Фаза 6 — Масштабирование (пост-MVP)
*Идеи на будущее*

- [ ] Таблица `clients` — история визитов, бонусы, скидки
- [ ] Система лояльности (N визитов → скидка X%)
- [ ] Добавление третьего и последующих клубов без переписывания
- [ ] Push-уведомления для клиентов (бронь подтверждена)
- [ ] Мобильное приложение (React Native + тот же Supabase)
- [ ] Дашборд для клиентов (проверить свою бронь онлайн)

---

## Аудит — готовность к продакшну

### Критичные (блокируют прод)

- [x] `setup_all.sql` рассинхронизирован с миграциями — нет overlap constraint, unique live-session index, CHECK constraints на числовые поля, триггер запрета бронирования в прошлом
- [x] CSP содержит `'unsafe-inline'` и `'unsafe-eval'` — `unsafe-eval` отсутствует, `unsafe-inline` в `style-src` необходим для Next.js
- [x] Open redirect: `/login?next=//evil.com` проходит проверку `startsWith('/')` (`login/page.tsx`)
- [x] `increment_order_count` вызывается без проверки ошибки — статистика молча рассинхронизируется (`rooms/actions.ts`)
- [x] `updateMenuItem` не валидирует name/price, хотя `createMenuItem` — валидирует (`menu/actions.ts`)
- [x] Realtime payloads бронирований не содержат joined `rooms` данные — fallback на `'—'` уже работает (`BookingsList.tsx`)
- [x] Нет RLS policies на INSERT/UPDATE/DELETE для таблицы `users`
- [x] `increment_order_count()` не валидирует club_id и amount > 0
- [x] `.env.local` может быть в git history — добавить в `.gitignore`

### Высокие (рекомендуется до прода)

- [x] `end_session_atomic` ставит комнату `'free'` безусловно, даже если есть активная бронь — исправлено, убраны мёртвые параметры
- [x] Отсутствуют индексы на FK-колонках — добавлен `users_club_id_idx`, остальные покрыты составными индексами
- [x] Нет CHECK constraints на `rooms.status` и `bookings.status` в БД — добавлены CHECK на menu_items, bookings, clubs
- [x] `sessions.started_at` допускает NULL — уже NOT NULL в схеме (`0001_schema.sql`, `setup_all.sql`)
- [x] `updateTariffs` использует `Promise.all` без транзакции — каждая комната сохраняется отдельно, `Promise.all` отсутствует
- [x] Нет валидации UUID формата во всех server actions — добавлен `assertUUID` во все actions
- [x] `AnalyticsSession` тип не содержит `orders_total`, хотя RPC его возвращает (`types.ts`) — добавлен

### Средние

- [x] Нет max quantity ограничения в `AddOrderModal.tsx` — ограничено 1–99 (клиент + сервер)
- [x] `EndSessionModal` показывает потенциально устаревшую сумму инвойса — пересчитывается каждые 10 с
- [x] CSV-экспорт не экранирует спецсимволы (`ShiftSummaryModal`, `OwnerAnalytics`)
- [x] Нет UI-индикатора отключения Realtime (`RoomGrid.tsx`) — добавлен жёлтый баннер при потере связи
- [x] `updateRoomTariff` не валидирует что rates неотрицательные (`tariffs/actions.ts`)
- [x] Null check на env-переменные в middleware при создании Supabase-клиента
- [x] Booking conflict check без LIMIT — добавлен `.limit(1)` к обоим запросам (`bookings/actions.ts`)
- [x] `Bookings.ends_at` nullable, но бизнес-логика непоследовательно обрабатывает null — проверено: обработка консистентна

### Низкие

- [ ] Нет rate limiting на Server Actions (инфраструктурный уровень — Vercel/middleware)
- [x] Нет CHECK на `rooms.type` в БД — добавлена миграция `0019_rooms_type_check.sql`
- [x] `user_metadata.role` может быть undefined в middleware — добавлен guard с fallback на `/dashboard/rooms`
- [x] `UndoToast` — race condition между expire и click
- [x] Realtime publication не включает `bookings` таблицу в `setup_all.sql` — уже была включена

