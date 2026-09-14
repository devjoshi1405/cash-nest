-- Migration 005: Debts & Debt Payments Tables
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
