-- Migration 014: Pan Shop Daily Sales Improvements & Security Policies
-- Ensures unique daily closing constraint, non-negative amounts, performance indexes, and strict shop workspace RLS

-- 1. Ensure unique constraint on workspace_id + sale_date
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_workspace_sale_date'
      and conrelid = 'public.daily_sales'::regclass
  ) then
    alter table public.daily_sales
      add constraint uq_workspace_sale_date unique (workspace_id, sale_date);
  end if;
end $$;

-- 2. Ensure non-negative check constraints and sales validity
alter table public.daily_sales
  drop constraint if exists chk_daily_sales_cash,
  drop constraint if exists chk_daily_sales_upi,
  drop constraint if exists chk_daily_sales_card,
  drop constraint if exists chk_daily_sales_other,
  drop constraint if exists chk_daily_sales_total_positive;

alter table public.daily_sales
  add constraint chk_daily_sales_cash check (cash_amount >= 0),
  add constraint chk_daily_sales_upi check (upi_amount >= 0),
  add constraint chk_daily_sales_card check (card_amount >= 0),
  add constraint chk_daily_sales_other check (other_amount >= 0),
  add constraint chk_daily_sales_total_positive check (
    (coalesce(cash_amount, 0) + coalesce(upi_amount, 0) + coalesce(card_amount, 0) + coalesce(other_amount, 0)) > 0
  );

-- 3. Composite Performance Indexes for Daily Sales Timeline & Summaries
create index if not exists idx_daily_sales_user_id on public.daily_sales(user_id);
create index if not exists idx_daily_sales_workspace_id on public.daily_sales(workspace_id);
create index if not exists idx_daily_sales_sale_date_desc on public.daily_sales(sale_date desc);
create index if not exists idx_daily_sales_ws_date_desc on public.daily_sales(workspace_id, sale_date desc);
create index if not exists idx_daily_sales_user_ws_date on public.daily_sales(user_id, workspace_id, sale_date desc);

-- 4. Set updated_at trigger
drop trigger if exists trg_daily_sales_updated_at on public.daily_sales;
create trigger trg_daily_sales_updated_at
  before update on public.daily_sales
  for each row execute function public.set_updated_at();

-- 5. Strict Row-Level Security (RLS) Policies for Daily Sales
alter table public.daily_sales enable row level security;

drop policy if exists "Daily sales are viewable by owner" on public.daily_sales;
create policy "Daily sales are viewable by owner"
  on public.daily_sales for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Daily sales are insertable by owner" on public.daily_sales;
create policy "Daily sales are insertable by owner"
  on public.daily_sales for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Daily sales are updatable by owner" on public.daily_sales;
create policy "Daily sales are updatable by owner"
  on public.daily_sales for update
  to authenticated
  using (
    (select auth.uid()) = user_id
  )
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Daily sales are deletable by owner" on public.daily_sales;
create policy "Daily sales are deletable by owner"
  on public.daily_sales for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );
