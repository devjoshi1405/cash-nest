-- Migration 004: Central Transactions Table
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
