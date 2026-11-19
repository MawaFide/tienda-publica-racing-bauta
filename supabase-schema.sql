create table if not exists public.store_products (
  id bigint primary key,
  product_name text not null,
  model_name text not null,
  sale_price numeric(12, 2) not null default 0,
  quantity integer not null default 0,
  image_url text not null default '',
  entry_date date,
  updated_at timestamptz not null default now()
);

create index if not exists store_products_available_idx
  on public.store_products (quantity, product_name, model_name);

alter table public.store_products enable row level security;

drop policy if exists "Public can read available products" on public.store_products;
create policy "Public can read available products"
  on public.store_products
  for select
  using (quantity > 0);
