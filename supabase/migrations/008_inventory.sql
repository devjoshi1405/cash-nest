-- Migration 008: Products & Inventory Movements
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  category text,
  unit text,
  purchase_price numeric(14,2),
  selling_price numeric(14,2),
  current_stock numeric(14,3) default 0.000 not null,
  low_stock_threshold numeric(14,3),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (
    movement_type in (
      'purchase',
      'sale',
      'adjustment_in',
      'adjustment_out',
      'opening_stock',
      'return_in',
      'return_out'
    )
  ),
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2),
  reference_type text,
  reference_id uuid,
  notes text,
  movement_date timestamptz not null default now(),
  created_at timestamptz default now() not null
);

create index if not exists idx_products_user_id on public.products(user_id);
create index if not exists idx_products_workspace_id on public.products(workspace_id);
create index if not exists idx_products_active on public.products(is_active);

create index if not exists idx_inventory_movements_user_id on public.inventory_movements(user_id);
create index if not exists idx_inventory_movements_workspace_id on public.inventory_movements(workspace_id);
create index if not exists idx_inventory_movements_product_id on public.inventory_movements(product_id);
create index if not exists idx_inventory_movements_date on public.inventory_movements(movement_date);
