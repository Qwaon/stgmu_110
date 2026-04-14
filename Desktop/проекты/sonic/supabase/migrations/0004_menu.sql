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
