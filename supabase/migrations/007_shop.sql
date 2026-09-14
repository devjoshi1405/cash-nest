-- Migration 007: Pan Shop Sales, Suppliers, Purchases, and Supplier Payments
create table if not exists public.daily_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sale_date date not null default current_date,
  cash_amount numeric(14,2) default 0.00 check (cash_amount >= 0),
  upi_amount numeric(14,2) default 0.00 check (upi_amount >= 0),
  card_amount numeric(14,2) default 0.00 check (card_amount >= 0),
  other_amount numeric(14,2) default 0.00 check (other_amount >= 0),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint uq_workspace_sale_date unique (workspace_id, sale_date)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  bill_number text,
  purchase_date date not null default current_date,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_daily_sales_user_id on public.daily_sales(user_id);
create index if not exists idx_daily_sales_workspace_id on public.daily_sales(workspace_id);
create index if not exists idx_daily_sales_date on public.daily_sales(sale_date);
create index if not exists idx_daily_sales_ws_date on public.daily_sales(workspace_id, sale_date);

create index if not exists idx_suppliers_user_id on public.suppliers(user_id);
create index if not exists idx_suppliers_workspace_id on public.suppliers(workspace_id);

create index if not exists idx_purchases_user_id on public.purchases(user_id);
create index if not exists idx_purchases_workspace_id on public.purchases(workspace_id);
create index if not exists idx_purchases_supplier_id on public.purchases(supplier_id);
create index if not exists idx_purchases_date on public.purchases(purchase_date);
create index if not exists idx_purchases_ws_date on public.purchases(workspace_id, purchase_date);

create index if not exists idx_supplier_payments_user_id on public.supplier_payments(user_id);
create index if not exists idx_supplier_payments_workspace_id on public.supplier_payments(workspace_id);
create index if not exists idx_supplier_payments_supplier_id on public.supplier_payments(supplier_id);
create index if not exists idx_supplier_payments_date on public.supplier_payments(payment_date);
