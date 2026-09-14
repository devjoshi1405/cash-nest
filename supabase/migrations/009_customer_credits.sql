-- Migration 009: Customer Credits & Payments (Shop Khata / Udhaar)
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
