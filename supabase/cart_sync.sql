-- Run in Supabase SQL Editor to enable the shared NISSI web/mobile cart.
-- Clients can read and change only their own cart. Prices and order data remain server-controlled.
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_slug text not null references public.product_variants(slug) on delete cascade,
  quantity integer not null check (quantity between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (cart_id, variant_slug)
);

create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);
-- Include old row values in DELETE events so Supabase can apply cart_id filters.
alter table public.cart_items replica identity full;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists "Customers manage own cart" on public.carts;
create policy "Customers manage own cart" on public.carts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Customers manage own cart items" on public.cart_items;
create policy "Customers manage own cart items" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

grant select, insert, update, delete on public.carts, public.cart_items to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cart_items'
  ) then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end $$;
