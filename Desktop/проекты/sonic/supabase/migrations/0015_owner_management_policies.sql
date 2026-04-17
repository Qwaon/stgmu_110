-- Allow owner to manage cross-club configuration screens.

do $$ begin
  create policy "owner_all_rooms" on rooms
    for all
    using (get_my_role() = 'owner')
    with check (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;

drop policy if exists "owner_all_menu" on menu_items;

do $$ begin
  create policy "owner_all_menu" on menu_items
    for all
    using (get_my_role() = 'owner')
    with check (get_my_role() = 'owner');
exception when duplicate_object then null; end $$;
