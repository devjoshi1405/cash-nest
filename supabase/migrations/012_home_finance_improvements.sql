-- Migration 012: Home Finance Module Improvements
-- Adds is_active to categories, unique case-insensitive constraint, improved default provisioning, and query optimization indexes

-- 1. Add is_active column to categories if not exists
alter table public.categories 
  add column if not exists is_active boolean default true not null;

-- 2. Create case-insensitive unique index for categories per workspace and type
-- Prevents duplicate category names like 'Travel', 'travel', 'TRAVEL'
create unique index if not exists idx_categories_unique_name_per_ws
  on public.categories (workspace_id, type, lower(name));

-- 3. Optimization Indexes for transactions filtering by workspace, type, and date range
create index if not exists idx_transactions_ws_type_date 
  on public.transactions (workspace_id, type, transaction_date desc);

create index if not exists idx_transactions_ws_date_desc 
  on public.transactions (workspace_id, transaction_date desc);

create index if not exists idx_transactions_amount
  on public.transactions (amount);

-- 4. Update the default provisioning function to include all standard home categories (including Business Income and complete expense list)
create or replace function public.provision_user_defaults(p_user_id uuid)
returns void as $$
declare
  v_home_ws_id uuid;
  v_shop_ws_id uuid;
begin
  -- 4.1 Provision Home Workspace
  select id into v_home_ws_id
  from public.workspaces
  where user_id = p_user_id and slug = 'home';

  if v_home_ws_id is null then
    insert into public.workspaces (user_id, name, slug, type, icon)
    values (p_user_id, 'Home Finance', 'home', 'home', '🏠')
    returning id into v_home_ws_id;
  end if;

  -- 4.2 Provision Pan Shop Workspace
  select id into v_shop_ws_id
  from public.workspaces
  where user_id = p_user_id and slug = 'pan-shop';

  if v_shop_ws_id is null then
    insert into public.workspaces (user_id, name, slug, type, icon)
    values (p_user_id, 'Pan Shop Finance', 'pan-shop', 'shop', '🏪')
    returning id into v_shop_ws_id;
  end if;

  -- 4.3 Provision Home Income Categories
  insert into public.categories (user_id, workspace_id, name, type, icon, is_default, is_active)
  select p_user_id, v_home_ws_id, cat.name, 'income', cat.icon, true, true
  from (values
    ('Salary', '💼'),
    ('Bonus', '🎁'),
    ('Freelance', '💻'),
    ('Interest', '📈'),
    ('Business Income', '🏬'),
    ('Other Income', '💰')
  ) as cat(name, icon)
  where not exists (
    select 1 from public.categories c
    where c.user_id = p_user_id 
      and c.workspace_id = v_home_ws_id 
      and lower(c.name) = lower(cat.name) 
      and c.type = 'income'
  );

  -- 4.4 Provision Home Expense Categories
  insert into public.categories (user_id, workspace_id, name, type, icon, is_default, is_active)
  select p_user_id, v_home_ws_id, cat.name, 'expense', cat.icon, true, true
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
    where c.user_id = p_user_id 
      and c.workspace_id = v_home_ws_id 
      and lower(c.name) = lower(cat.name) 
      and c.type = 'expense'
  );

  -- 4.5 Provision Pan Shop Expense Categories
  insert into public.categories (user_id, workspace_id, name, type, icon, is_default, is_active)
  select p_user_id, v_shop_ws_id, cat.name, 'expense', cat.icon, true, true
  from (values
    ('Rent', '🏢'),
    ('Electricity', '⚡'),
    ('Transport', '🚚'),
    ('Maintenance', '🛠️'),
    ('Employee', '👥'),
    ('Packaging', '📦'),
    ('Equipment', '⚙️'),
    ('Internet', '📶'),
    ('Tea & Snacks', '☕'),
    ('Taxes & License', '📜'),
    ('Waste / Damages', '🗑️'),
    ('Other', '🏷️')
  ) as cat(name, icon)
  where not exists (
    select 1 from public.categories c
    where c.user_id = p_user_id 
      and c.workspace_id = v_shop_ws_id 
      and lower(c.name) = lower(cat.name) 
      and c.type = 'expense'
  );
end;
$$ language plpgsql security definer;
