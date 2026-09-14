-- ==============================================================================
-- CASHNEST COMPLETE DATABASE FOUNDATION (PHASE 2)
-- Combined schema migration for one-click setup in Supabase SQL Editor
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  currency text default 'INR',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);

-- 2. WORKSPACES TABLE
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  type text not null check (type in ('home', 'shop')),
  icon text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint uq_user_workspace_slug unique (user_id, slug)
);

create index if not exists idx_workspaces_user_id on public.workspaces(user_id);
create index if not exists idx_workspaces_slug on public.workspaces(slug);

-- 3. CATEGORIES TABLE
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_categories_workspace_id on public.categories(workspace_id);
create index if not exists idx_categories_type on public.categories(type);

-- 4. TRANSACTIONS TABLE
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text check (payment_method in ('cash', 'upi', 'bank', 'credit_card', 'debit_card', 'other')),
  transaction_date date not null default current_date,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_workspace_id on public.transactions(workspace_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
create index if not exists idx_transactions_date on public.transactions(transaction_date);
create index if not exists idx_transactions_user_date on public.transactions(user_id, transaction_date);
create index if not exists idx_transactions_ws_date on public.transactions(workspace_id, transaction_date);

-- 5. DEBTS & DEBT PAYMENTS
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  direction text not null check (direction in ('borrowed', 'lent')),
  person_name text not null,
  phone text,
  original_amount numeric(14,2) not null check (original_amount > 0),
  due_date date,
  notes text,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'overdue')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_debts_user_id on public.debts(user_id);
create index if not exists idx_debts_workspace_id on public.debts(workspace_id);
create index if not exists idx_debts_direction on public.debts(direction);
create index if not exists idx_debts_status on public.debts(status);
create index if not exists idx_debt_payments_user_id on public.debt_payments(user_id);
create index if not exists idx_debt_payments_debt_id on public.debt_payments(debt_id);
create index if not exists idx_debt_payments_date on public.debt_payments(payment_date);

-- 6. BUDGETS TABLE
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  month date not null,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index if not exists idx_budgets_unique_cat 
  on public.budgets (user_id, workspace_id, category_id, month) 
  where category_id is not null;

create unique index if not exists idx_budgets_unique_null_cat 
  on public.budgets (user_id, workspace_id, month) 
  where category_id is null;

create index if not exists idx_budgets_user_id on public.budgets(user_id);
create index if not exists idx_budgets_workspace_id on public.budgets(workspace_id);
create index if not exists idx_budgets_month on public.budgets(month);

-- 7. DAILY SALES, SUPPLIERS, PURCHASES & SUPPLIER PAYMENTS
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

-- 8. PRODUCTS & INVENTORY MOVEMENTS
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

-- 9. CUSTOMER CREDITS & PAYMENTS (KHATA)
create table if not exists public.customer_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_name text not null,
  phone text,
  original_amount numeric(14,2) not null check (original_amount > 0),
  credit_date date not null default current_date,
  due_date date,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.customer_credit_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_credit_id uuid not null references public.customer_credits(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_customer_credits_user_id on public.customer_credits(user_id);
create index if not exists idx_customer_credits_workspace_id on public.customer_credits(workspace_id);
create index if not exists idx_customer_credits_status on public.customer_credits(status);
create index if not exists idx_customer_credits_date on public.customer_credits(credit_date);

create index if not exists idx_cust_credit_payments_user_id on public.customer_credit_payments(user_id);
create index if not exists idx_cust_credit_payments_credit_id on public.customer_credit_payments(customer_credit_id);
create index if not exists idx_cust_credit_payments_date on public.customer_credit_payments(payment_date);

-- 10. TRIGGERS & AUTOMATION FUNCTIONS
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Triggers for updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();

drop trigger if exists trg_debts_updated_at on public.debts;
create trigger trg_debts_updated_at before update on public.debts for each row execute function public.set_updated_at();

drop trigger if exists trg_budgets_updated_at on public.budgets;
create trigger trg_budgets_updated_at before update on public.budgets for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_sales_updated_at on public.daily_sales;
create trigger trg_daily_sales_updated_at before update on public.daily_sales for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

drop trigger if exists trg_purchases_updated_at on public.purchases;
create trigger trg_purchases_updated_at before update on public.purchases for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_credits_updated_at on public.customer_credits;
create trigger trg_customer_credits_updated_at before update on public.customer_credits for each row execute function public.set_updated_at();

-- Default provisioning function
create or replace function public.provision_user_defaults(p_user_id uuid)
returns void as $$
declare
  v_home_ws_id uuid;
  v_shop_ws_id uuid;
begin
  select id into v_home_ws_id from public.workspaces where user_id = p_user_id and slug = 'home';
  if v_home_ws_id is null then
    insert into public.workspaces (user_id, name, slug, type, icon)
    values (p_user_id, 'Home Finance', 'home', 'home', '🏠')
    returning id into v_home_ws_id;
  end if;

  select id into v_shop_ws_id from public.workspaces where user_id = p_user_id and slug = 'pan-shop';
  if v_shop_ws_id is null then
    insert into public.workspaces (user_id, name, slug, type, icon)
    values (p_user_id, 'Pan Shop Finance', 'pan-shop', 'shop', '🏪')
    returning id into v_shop_ws_id;
  end if;

  -- Home Income Categories
  insert into public.categories (user_id, workspace_id, name, type, icon, is_default)
  select p_user_id, v_home_ws_id, cat.name, 'income', cat.icon, true
  from (values
    ('Salary', '💼'),
    ('Bonus', '🎁'),
    ('Freelance', '💻'),
    ('Interest', '📈'),
    ('Other Income', '💰')
  ) as cat(name, icon)
  where not exists (
    select 1 from public.categories c
    where c.user_id = p_user_id and c.workspace_id = v_home_ws_id and c.name = cat.name and c.type = 'income'
  );

  -- Home Expense Categories
  insert into public.categories (user_id, workspace_id, name, type, icon, is_default)
  select p_user_id, v_home_ws_id, cat.name, 'expense', cat.icon, true
  from (values
    ('Kitchen', '🍳'),
    ('Groceries', '🛒'),
    ('Electricity', '⚡'),
    ('Gas', '🔥'),
    ('Wi-Fi', '📶'),
    ('Mobile Recharge', '📱'),
    ('Petrol', '⛽'),
    ('Vehicle', '🚗'),
    ('EMI', '💳'),
    ('Loan', '🏦'),
    ('Medical', '💊'),
    ('Shopping', '🛍️'),
    ('Entertainment', '🎬'),
    ('Education', '📚'),
    ('Travel', '✈️'),
    ('Other', '🏷️')
  ) as cat(name, icon)
  where not exists (
    select 1 from public.categories c
    where c.user_id = p_user_id and c.workspace_id = v_home_ws_id and c.name = cat.name and c.type = 'expense'
  );

  -- Pan Shop Expense Categories
  insert into public.categories (user_id, workspace_id, name, type, icon, is_default)
  select p_user_id, v_shop_ws_id, cat.name, 'expense', cat.icon, true
  from (values
    ('Rent', '🏢'),
    ('Electricity', '⚡'),
    ('Transport', '🚚'),
    ('Maintenance', '🛠️'),
    ('Employee', '👥'),
    ('Packaging', '📦'),
    ('Equipment', '⚙️'),
    ('Internet', '📶'),
    ('Other', '🏷️')
  ) as cat(name, icon)
  where not exists (
    select 1 from public.categories c
    where c.user_id = p_user_id and c.workspace_id = v_shop_ws_id and c.name = cat.name and c.type = 'expense'
  );

  -- Pan Shop Income Categories
  insert into public.categories (user_id, workspace_id, name, type, icon, is_default)
  select p_user_id, v_shop_ws_id, cat.name, 'income', cat.icon, true
  from (values
    ('Counter Sales', '🏪'),
    ('Bulk Orders', '📦'),
    ('Other Sales', '💰')
  ) as cat(name, icon)
  where not exists (
    select 1 from public.categories c
    where c.user_id = p_user_id and c.workspace_id = v_shop_ws_id and c.name = cat.name and c.type = 'income'
  );
end;
$$ language plpgsql security definer;

-- Trigger on auth.users for signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (user_id, full_name, avatar_url, currency)
  values (
    new.id,
    v_full_name,
    coalesce(new.raw_user_meta_data->>'avatar_url', null),
    'INR'
  )
  on conflict (user_id) do update
  set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  perform public.provision_user_defaults(new.id);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 11. ENABLE RLS & POLICIES ON ALL TABLES
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.budgets enable row level security;
alter table public.daily_sales enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customer_credits enable row level security;
alter table public.customer_credit_payments enable row level security;

-- PROFILES RLS
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Profiles are deletable by owner" on public.profiles;
create policy "Profiles are deletable by owner" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

-- WORKSPACES RLS
drop policy if exists "Workspaces are viewable by owner" on public.workspaces;
create policy "Workspaces are viewable by owner" on public.workspaces for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Workspaces are insertable by owner" on public.workspaces;
create policy "Workspaces are insertable by owner" on public.workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Workspaces are updatable by owner" on public.workspaces;
create policy "Workspaces are updatable by owner" on public.workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Workspaces are deletable by owner" on public.workspaces;
create policy "Workspaces are deletable by owner" on public.workspaces for delete to authenticated using ((select auth.uid()) = user_id);

-- CATEGORIES RLS
drop policy if exists "Categories are viewable by owner" on public.categories;
create policy "Categories are viewable by owner" on public.categories for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Categories are insertable by owner" on public.categories;
create policy "Categories are insertable by owner" on public.categories for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Categories are updatable by owner" on public.categories;
create policy "Categories are updatable by owner" on public.categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Categories are deletable by owner" on public.categories;
create policy "Categories are deletable by owner" on public.categories for delete to authenticated using ((select auth.uid()) = user_id);

-- TRANSACTIONS RLS
drop policy if exists "Transactions are viewable by owner" on public.transactions;
create policy "Transactions are viewable by owner" on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Transactions are insertable by owner" on public.transactions;
create policy "Transactions are insertable by owner" on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid()))));
drop policy if exists "Transactions are updatable by owner" on public.transactions;
create policy "Transactions are updatable by owner" on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid()))));
drop policy if exists "Transactions are deletable by owner" on public.transactions;
create policy "Transactions are deletable by owner" on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

-- DEBTS & DEBT PAYMENTS RLS
drop policy if exists "Debts are viewable by owner" on public.debts;
create policy "Debts are viewable by owner" on public.debts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Debts are insertable by owner" on public.debts;
create policy "Debts are insertable by owner" on public.debts for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Debts are updatable by owner" on public.debts;
create policy "Debts are updatable by owner" on public.debts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Debts are deletable by owner" on public.debts;
create policy "Debts are deletable by owner" on public.debts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Debt payments are viewable by owner" on public.debt_payments;
create policy "Debt payments are viewable by owner" on public.debt_payments for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Debt payments are insertable by owner" on public.debt_payments;
create policy "Debt payments are insertable by owner" on public.debt_payments for insert to authenticated with check ((select auth.uid()) = user_id and debt_id in (select id from public.debts where user_id = (select auth.uid())));
drop policy if exists "Debt payments are updatable by owner" on public.debt_payments;
create policy "Debt payments are updatable by owner" on public.debt_payments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and debt_id in (select id from public.debts where user_id = (select auth.uid())));
drop policy if exists "Debt payments are deletable by owner" on public.debt_payments;
create policy "Debt payments are deletable by owner" on public.debt_payments for delete to authenticated using ((select auth.uid()) = user_id);

-- BUDGETS RLS
drop policy if exists "Budgets are viewable by owner" on public.budgets;
create policy "Budgets are viewable by owner" on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Budgets are insertable by owner" on public.budgets;
create policy "Budgets are insertable by owner" on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid()))));
drop policy if exists "Budgets are updatable by owner" on public.budgets;
create policy "Budgets are updatable by owner" on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid()))));
drop policy if exists "Budgets are deletable by owner" on public.budgets;
create policy "Budgets are deletable by owner" on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);

-- DAILY SALES RLS
drop policy if exists "Daily sales are viewable by owner" on public.daily_sales;
create policy "Daily sales are viewable by owner" on public.daily_sales for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Daily sales are insertable by owner" on public.daily_sales;
create policy "Daily sales are insertable by owner" on public.daily_sales for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Daily sales are updatable by owner" on public.daily_sales;
create policy "Daily sales are updatable by owner" on public.daily_sales for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Daily sales are deletable by owner" on public.daily_sales;
create policy "Daily sales are deletable by owner" on public.daily_sales for delete to authenticated using ((select auth.uid()) = user_id);

-- SUPPLIERS RLS
drop policy if exists "Suppliers are viewable by owner" on public.suppliers;
create policy "Suppliers are viewable by owner" on public.suppliers for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Suppliers are insertable by owner" on public.suppliers;
create policy "Suppliers are insertable by owner" on public.suppliers for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Suppliers are updatable by owner" on public.suppliers;
create policy "Suppliers are updatable by owner" on public.suppliers for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Suppliers are deletable by owner" on public.suppliers;
create policy "Suppliers are deletable by owner" on public.suppliers for delete to authenticated using ((select auth.uid()) = user_id);

-- PURCHASES RLS
drop policy if exists "Purchases are viewable by owner" on public.purchases;
create policy "Purchases are viewable by owner" on public.purchases for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Purchases are insertable by owner" on public.purchases;
create policy "Purchases are insertable by owner" on public.purchases for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and (supplier_id is null or supplier_id in (select id from public.suppliers where user_id = (select auth.uid()))));
drop policy if exists "Purchases are updatable by owner" on public.purchases;
create policy "Purchases are updatable by owner" on public.purchases for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and (supplier_id is null or supplier_id in (select id from public.suppliers where user_id = (select auth.uid()))));
drop policy if exists "Purchases are deletable by owner" on public.purchases;
create policy "Purchases are deletable by owner" on public.purchases for delete to authenticated using ((select auth.uid()) = user_id);

-- SUPPLIER PAYMENTS RLS
drop policy if exists "Supplier payments are viewable by owner" on public.supplier_payments;
create policy "Supplier payments are viewable by owner" on public.supplier_payments for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Supplier payments are insertable by owner" on public.supplier_payments;
create policy "Supplier payments are insertable by owner" on public.supplier_payments for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and supplier_id in (select id from public.suppliers where user_id = (select auth.uid())) and (purchase_id is null or purchase_id in (select id from public.purchases where user_id = (select auth.uid()))));
drop policy if exists "Supplier payments are updatable by owner" on public.supplier_payments;
create policy "Supplier payments are updatable by owner" on public.supplier_payments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and supplier_id in (select id from public.suppliers where user_id = (select auth.uid())) and (purchase_id is null or purchase_id in (select id from public.purchases where user_id = (select auth.uid()))));
drop policy if exists "Supplier payments are deletable by owner" on public.supplier_payments;
create policy "Supplier payments are deletable by owner" on public.supplier_payments for delete to authenticated using ((select auth.uid()) = user_id);

-- PRODUCTS RLS
drop policy if exists "Products are viewable by owner" on public.products;
create policy "Products are viewable by owner" on public.products for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Products are insertable by owner" on public.products;
create policy "Products are insertable by owner" on public.products for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Products are updatable by owner" on public.products;
create policy "Products are updatable by owner" on public.products for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Products are deletable by owner" on public.products;
create policy "Products are deletable by owner" on public.products for delete to authenticated using ((select auth.uid()) = user_id);

-- INVENTORY MOVEMENTS RLS
drop policy if exists "Inventory movements are viewable by owner" on public.inventory_movements;
create policy "Inventory movements are viewable by owner" on public.inventory_movements for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Inventory movements are insertable by owner" on public.inventory_movements;
create policy "Inventory movements are insertable by owner" on public.inventory_movements for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and product_id in (select id from public.products where user_id = (select auth.uid())));
drop policy if exists "Inventory movements are updatable by owner" on public.inventory_movements;
create policy "Inventory movements are updatable by owner" on public.inventory_movements for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())) and product_id in (select id from public.products where user_id = (select auth.uid())));
drop policy if exists "Inventory movements are deletable by owner" on public.inventory_movements;
create policy "Inventory movements are deletable by owner" on public.inventory_movements for delete to authenticated using ((select auth.uid()) = user_id);

-- CUSTOMER CREDITS RLS
drop policy if exists "Customer credits are viewable by owner" on public.customer_credits;
create policy "Customer credits are viewable by owner" on public.customer_credits for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Customer credits are insertable by owner" on public.customer_credits;
create policy "Customer credits are insertable by owner" on public.customer_credits for insert to authenticated with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Customer credits are updatable by owner" on public.customer_credits;
create policy "Customer credits are updatable by owner" on public.customer_credits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and workspace_id in (select id from public.workspaces where user_id = (select auth.uid())));
drop policy if exists "Customer credits are deletable by owner" on public.customer_credits;
create policy "Customer credits are deletable by owner" on public.customer_credits for delete to authenticated using ((select auth.uid()) = user_id);

-- CUSTOMER CREDIT PAYMENTS RLS
drop policy if exists "Customer credit payments are viewable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are viewable by owner" on public.customer_credit_payments for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Customer credit payments are insertable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are insertable by owner" on public.customer_credit_payments for insert to authenticated with check ((select auth.uid()) = user_id and customer_credit_id in (select id from public.customer_credits where user_id = (select auth.uid())));
drop policy if exists "Customer credit payments are updatable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are updatable by owner" on public.customer_credit_payments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and customer_credit_id in (select id from public.customer_credits where user_id = (select auth.uid())));
drop policy if exists "Customer credit payments are deletable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are deletable by owner" on public.customer_credit_payments for delete to authenticated using ((select auth.uid()) = user_id);
