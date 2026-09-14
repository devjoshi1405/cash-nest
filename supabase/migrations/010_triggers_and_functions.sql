-- Migration 010: Database Triggers, Automation Functions, and Default Provisioning

-- 1. Generic updated_at timestamp trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Attach updated_at triggers to all tables with updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_debts_updated_at on public.debts;
create trigger trg_debts_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_budgets_updated_at on public.budgets;
create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_sales_updated_at on public.daily_sales;
create trigger trg_daily_sales_updated_at
  before update on public.daily_sales
  for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_purchases_updated_at on public.purchases;
create trigger trg_purchases_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_credits_updated_at on public.customer_credits;
create trigger trg_customer_credits_updated_at
  before update on public.customer_credits
  for each row execute function public.set_updated_at();


-- 2. Idempotent workspace & default categories provisioning function
create or replace function public.provision_user_defaults(p_user_id uuid)
returns void as $$
declare
  v_home_ws_id uuid;
  v_shop_ws_id uuid;
begin
  -- 2.1 Provision Home Workspace
  select id into v_home_ws_id
  from public.workspaces
  where user_id = p_user_id and slug = 'home';

  if v_home_ws_id is null then
    insert into public.workspaces (user_id, name, slug, type, icon)
    values (p_user_id, 'Home Finance', 'home', 'home', '🏠')
    returning id into v_home_ws_id;
  end if;

  -- 2.2 Provision Pan Shop Workspace
  select id into v_shop_ws_id
  from public.workspaces
  where user_id = p_user_id and slug = 'pan-shop';

  if v_shop_ws_id is null then
    insert into public.workspaces (user_id, name, slug, type, icon)
    values (p_user_id, 'Pan Shop Finance', 'pan-shop', 'shop', '🏪')
    returning id into v_shop_ws_id;
  end if;

  -- 2.3 Provision Home Income Categories
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

  -- 2.4 Provision Home Expense Categories
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

  -- 2.5 Provision Pan Shop Expense Categories
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

  -- 2.6 Provision Pan Shop Income Categories
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


-- 3. Automatic Profile & Workspace Provisioning on auth.users signup
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

  -- Insert profile
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

  -- Provision default workspaces and categories
  perform public.provision_user_defaults(new.id);

  return new;
end;
$$ language plpgsql security definer;

-- Hook into Supabase auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
