# Phase 2 — Заказы и оплата

**Дата:** 2026-04-15  
**Валюта:** ₽ (рубли) — заменяет ₸ по всему проекту

---

## Скоп

- Кнопка «+ Заказ» на карточке комнаты (рядом с «Завершить»)
- `SessionSheet` — боковая панель с деталями сессии, заказами и живым итогом
- `AddOrderModal` — выбор позиции из каталога
- `menu_items` таблица — каталог товаров с ценами
- Страница `/dashboard/menu` — UI управления каталогом (CRUD + пин)
- История сессий — **не входит в этот скоп**

---

## База данных

### Новая таблица `menu_items`

```sql
create table menu_items (
  id          uuid primary key default uuid_generate_v4(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  price       numeric(10,2) not null,
  is_pinned   boolean not null default false,
  order_count int not null default 0,
  created_at  timestamptz default now()
);
```

**`order_count`** — инкрементируется при каждом заказе на `quantity`. Используется для автосортировки по популярности.

**`orders` таблица** — без изменений. `item_name` и `price` записываются снапшотом в момент заказа, чтобы изменение цены товара не ломало исторические инвойсы.

### Миграция

Новый файл: `supabase/migrations/0004_menu.sql`

### RLS

- `admin` — видит только `menu_items` своего `club_id`
- `owner` — видит все клубы

---

## UI и компоненты

### RoomCard (изменение)

Когда комната занята, в блоке кнопок появляется «+ Заказ» рядом с «■ Завершить»:

```
[ + Заказ ]  [ ■ Завершить ]
```

Нажатие открывает `SessionSheet`.

### SessionSheet (новый компонент)

Bottom sheet / модал поверх экрана. Показывает:

- Заголовок: название комнаты + имя клиента
- Живой таймер + текущая сумма за время
- Список текущих заказов с ценами
- Кнопка «+ Добавить позицию» → открывает `AddOrderModal`
- Живой итог (время + заказы)
- Кнопка «Завершить сессию» → открывает существующий `EndSessionModal`

### AddOrderModal (новый компонент)

Модал выбора позиции из каталога:

- Секция «Закреплённые» — товары с `is_pinned = true`, сортировка по `order_count DESC`
- Секция «Все позиции» — остальные, сортировка по `order_count DESC`
- Выбор товара → счётчик количества (−/+, минимум 1)
- Кнопка «Добавить»

### Страница `/dashboard/menu` (новая)

Управление каталогом товаров:

- Таблица/список: название, цена, счётчик заказов, кнопка пина, кнопка удаления
- Форма добавления нового товара (name + price)
- Удаление: только если `order_count = 0`; иначе — показать предупреждение
- Ссылка «Меню» добавляется в навигацию дашборда

---

## Поток данных

### Добавление заказа

1. Пользователь выбирает позицию + количество в `AddOrderModal`
2. Server Action `addOrder(sessionId, menuItemId, quantity)`:
   - INSERT в `orders` (снапшот `item_name` + `price` из `menu_items`)
   - INCREMENT `menu_items.order_count` на `quantity`
3. `revalidatePath('/dashboard/rooms')` — Realtime подхватывает, `RoomGrid` рефетчится
4. `SessionSheet` видит обновлённые `session.orders` и пересчитывает живой итог

### Сортировка каталога

```
ORDER BY is_pinned DESC, order_count DESC
```

Закреплённые всегда вверху, внутри каждой группы — по популярности.

### Управление каталогом

Server Actions в `src/app/dashboard/menu/actions.ts`:

| Action | Описание |
|--------|----------|
| `createMenuItem(name, price)` | Создать товар |
| `updateMenuItem(id, name, price)` | Изменить название/цену |
| `deleteMenuItem(id)` | Удалить (только если order_count = 0) |
| `togglePin(id)` | Переключить is_pinned |

---

## Изменения в существующих файлах

| Файл | Изменение |
|------|-----------|
| `src/components/RoomCard.tsx` | Добавить кнопку «+ Заказ», открывает `SessionSheet` |
| `src/app/dashboard/layout.tsx` | Добавить «Меню» в навигацию |
| `src/app/dashboard/rooms/actions.ts` | Добавить `addOrder` |
| `src/lib/types.ts` | Добавить тип `MenuItem` |
| Все компоненты с ₸ | Заменить на ₽ |

## Новые файлы

| Файл | Назначение |
|------|------------|
| `src/components/SessionSheet.tsx` | Детали сессии + список заказов |
| `src/components/AddOrderModal.tsx` | Выбор товара из каталога |
| `src/app/dashboard/menu/page.tsx` | Страница управления каталогом |
| `src/app/dashboard/menu/actions.ts` | Server Actions для каталога |
| `supabase/migrations/0004_menu.sql` | Создание menu_items + RLS |
