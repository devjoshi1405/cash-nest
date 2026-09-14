-- Migration 006: Budgets Table
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
