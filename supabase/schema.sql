-- NISSI MVP schema. Apply in Supabase SQL editor before enabling checkout.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null default '',
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  slug text not null unique,
  name text not null,
  unit_label text not null,
  unit_price_ugx integer not null check (unit_price_ugx >= 0),
  stock_quantity integer not null default 100 check (stock_quantity >= 0),
  is_active boolean not null default true
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('NS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','confirmed','processing','dispatched','delivered','cancelled')),
  payment_method text not null check (payment_method in ('cash_on_delivery','momo_sandbox')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','not_applicable','refunded')),
  currency text not null default 'UGX' check (currency = 'UGX'),
  subtotal_ugx integer not null check (subtotal_ugx >= 0),
  delivery_fee_ugx integer not null default 0 check (delivery_fee_ugx >= 0),
  total_ugx integer not null check (total_ugx >= 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_district text not null,
  delivery_city text not null,
  delivery_address text not null,
  delivery_notes text,
  provider_reference text,
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed','not_configured')),
  created_at timestamptz not null default now()
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id),
  product_name text not null,
  variant_name text not null,
  unit_price_ugx integer not null check (unit_price_ugx >= 0),
  quantity integer not null check (quantity between 1 and 100),
  line_total_ugx integer not null check (line_total_ugx >= 0)
);
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_reference text,
  event text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_reference, event)
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "Customers read own profile" on public.profiles;
create policy "Customers read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "Customers update own profile" on public.profiles;
create policy "Customers update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "Public reads active products" on public.products;
create policy "Public reads active products" on public.products for select to anon, authenticated using (is_active);
drop policy if exists "Public reads active variants" on public.product_variants;
create policy "Public reads active variants" on public.product_variants for select to anon, authenticated using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));
drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Customers read own order items" on public.order_items;
create policy "Customers read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
-- No client write policies for prices, stock, orders, order items, or payment events.

insert into public.products (slug,name,category,description) values
 ('stick-briquettes','Stick briquettes','Briquettes','Long-burning clean-cooking fuel for everyday cooking.'),
 ('honeycomb-briquettes','Honeycomb briquettes','Briquettes','Honeycomb briquettes sold by piece or bag of ten.'),
 ('pellets','Pellets','Pellets','Uniform clean-cooking fuel pellets in practical sizes.'),
 ('industrial-stove','Industrial stove','Stoves','A stove designed for high-volume cooking.'),
 ('domestic-stove','Domestic stove','Stoves','An everyday cooking stove for the home.'),
 ('fire-lighters','Fire lighters','Accessories','Fire lighters for getting your cooking started.')
on conflict (slug) do update set name=excluded.name,category=excluded.category,description=excluded.description;

insert into public.product_variants (product_id,slug,name,unit_label,unit_price_ugx)
select p.id,v.slug,v.name,v.unit_label,v.price from (values
 ('stick-briquettes','stick-10','10 kg','bag',15000),('stick-briquettes','stick-20','20 kg','bag',40000),('stick-briquettes','stick-50','50 kg','bag',80000),
 ('honeycomb-briquettes','honey-one','1 piece','piece',2000),('honeycomb-briquettes','honey-ten','Bag of 10 pieces','bag',20000),
 ('pellets','pellets-10','10 kg','bag',10000),('pellets','pellets-20','20 kg','bag',20000),('pellets','pellets-50','50 kg','bag',50000),
 ('industrial-stove','stove-industrial','One stove','stove',2700000),('domestic-stove','stove-domestic','One stove','stove',50000),('fire-lighters','firelighters-one','One pack','pack',10000)
) as v(product_slug,slug,name,unit_label,price) join public.products p on p.slug=v.product_slug
on conflict (slug) do update set name=excluded.name,unit_label=excluded.unit_label,unit_price_ugx=excluded.unit_price_ugx;

-- Server-only service-role RPC: validates current price/stock and commits order + snapshots atomically.
create or replace function public.create_order(p_user_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text,
 p_delivery_district text, p_delivery_city text, p_delivery_address text, p_delivery_notes text,
 p_payment_method text, p_items jsonb)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_variant public.product_variants;
  v_product public.products;
  v_qty integer;
  v_subtotal integer := 0;
begin
  if p_payment_method not in ('cash_on_delivery','momo_sandbox') then raise exception 'Invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then raise exception 'Invalid items'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 100 then raise exception 'Invalid quantity'; end if;
    select * into v_variant from product_variants where slug=v_item->>'variant_slug' and is_active for update;
    if not found then raise exception 'An item is unavailable'; end if;
    select * into v_product from products where id=v_variant.product_id and is_active;
    if not found or v_variant.stock_quantity < v_qty then raise exception 'An item is unavailable in that quantity'; end if;
    v_subtotal := v_subtotal + v_variant.unit_price_ugx * v_qty;
  end loop;
  insert into orders(user_id,payment_method,payment_status,subtotal_ugx,delivery_fee_ugx,total_ugx,customer_name,customer_email,customer_phone,delivery_district,delivery_city,delivery_address,delivery_notes)
  values(p_user_id,p_payment_method,'pending',v_subtotal,0,v_subtotal,p_customer_name,p_customer_email,p_customer_phone,p_delivery_district,p_delivery_city,p_delivery_address,nullif(p_delivery_notes,'')) returning * into v_order;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_variant from product_variants where slug=v_item->>'variant_slug' and is_active for update;
    select * into v_product from products where id=v_variant.product_id;
    insert into order_items(order_id,product_variant_id,product_name,variant_name,unit_price_ugx,quantity,line_total_ugx)
    values(v_order.id,v_variant.id,v_product.name,v_variant.name,v_variant.unit_price_ugx,v_qty,v_variant.unit_price_ugx*v_qty);
    update product_variants set stock_quantity=stock_quantity-v_qty where id=v_variant.id;
  end loop;
  return v_order;
end; $$;
revoke all on function public.create_order(uuid,text,text,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid,text,text,text,text,text,text,text,text,jsonb) to service_role;
