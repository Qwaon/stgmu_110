# PS Club — Инструкция по запуску

## Что потребуется
- Аккаунт на [supabase.com](https://supabase.com) ✅ (уже создан)
- Аккаунт на [vercel.com](https://vercel.com) (для деплоя)

---

## Шаг 1 — SQL Editor: создать схему БД

Supabase Dashboard → **SQL Editor** → New query

Вставить содержимое файла [`supabase/migrations/0001_schema.sql`](../supabase/migrations/0001_schema.sql) → нажать **Run**.

> Создаст таблицы: `clubs`, `users`, `rooms`, `sessions`, `orders`, `bookings`

---

## Шаг 2 — SQL Editor: включить безопасность (RLS)

Новый запрос → вставить [`supabase/migrations/0002_rls.sql`](../supabase/migrations/0002_rls.sql) → **Run**.

> Включит Row Level Security: admin видит только свой клуб, owner видит всё.

---

## Шаг 3 — SQL Editor: добавить клубы и комнаты

Новый запрос → вставить и запустить:

```sql
INSERT INTO clubs (id, name, address, hourly_rate) VALUES
  ('aaaabbbb-0000-0000-0000-000000000001', 'Sonic — Морозова', 'ул. Морозова', 500),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Sonic — Толстого', 'ул. Толстого', 500);

INSERT INTO rooms (club_id, name, type) VALUES
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 4', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 6', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 7', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000001', 'Room 8', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 1', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 2', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 3', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 4', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 5', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 6', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 7', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'Room 8', 'standard'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 1',  'vip'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 2',  'vip'),
  ('aaaabbbb-0000-0000-0000-000000000002', 'VIP 3',  'vip');
```

---

## Шаг 4 — Создать пользователей

Supabase Dashboard → **Authentication → Users → Add user → Create new user**

Создать трёх пользователей (галочку «Auto Confirm User» — включить):

| Email | Пароль |
|-------|--------|
| `owner@sonic.stv` | `sonicstv0709` |
| `morozova@sonic.stv` | `sonicstv0709` |
| `tolstogo@sonic.stv` | `sonicstv0709` |

---

## Шаг 5 — SQL Editor: привязать пользователей к клубам

После создания юзеров в Auth — вставить их профили. **SQL Editor** → новый запрос:

```sql
INSERT INTO users (id, email, role, club_id)
SELECT
  id,
  email,
  CASE
    WHEN email = 'owner@sonic.stv'    THEN 'owner'
    WHEN email = 'morozova@sonic.stv' THEN 'admin'
    WHEN email = 'tolstogo@sonic.stv' THEN 'admin'
  END,
  CASE
    WHEN email = 'morozova@sonic.stv' THEN 'aaaabbbb-0000-0000-0000-000000000001'::uuid
    WHEN email = 'tolstogo@sonic.stv' THEN 'aaaabbbb-0000-0000-0000-000000000002'::uuid
    ELSE null
  END
FROM auth.users
WHERE email IN ('owner@sonic.stv', 'morozova@sonic.stv', 'tolstogo@sonic.stv');
```

> Этот запрос сам берёт UUID из `auth.users` — ничего копировать не нужно.

---

## Шаг 6 — SQL Editor: включить Realtime

Новый запрос → запустить:

```sql
ALTER TABLE rooms    REPLICA IDENTITY FULL;
ALTER TABLE sessions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE rooms, sessions;
```

> После этого изменения в комнатах будут мгновенно обновляться у всех открытых вкладок.

---

## Шаг 7 — Проверить локально

```bash
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000)

Войти как:
- `owner@sonic.stv` → попадёт на `/owner`
- `morozova@sonic.stv` → попадёт на `/dashboard/rooms` (клуб Морозова)
- `tolstogo@sonic.stv` → попадёт на `/dashboard/rooms` (клуб Толстого)

---

## Шаг 8 — Деплой на Vercel

```bash
npx vercel
```

В процессе деплоя Vercel спросит про env variables. Добавить:

| Переменная | Значение |
|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | из `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | из `.env.local` |

Или добавить через Vercel Dashboard → Project → Settings → Environment Variables.

---

## Итог

После всех шагов система полностью готова:

| Роль | Email | Доступ |
|------|-------|--------|
| Владелец | `owner@sonic.stv` | Оба клуба, аналитика (Phase 4) |
| Админ 1 | `morozova@sonic.stv` | Только Sonic — Морозова |
| Админ 2 | `tolstogo@sonic.stv` | Только Sonic — Толстого |

Пароль для всех: `sonicstv0709`
