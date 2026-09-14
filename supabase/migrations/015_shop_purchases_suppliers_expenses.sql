-- Migration 015: Pan Shop Purchases, Suppliers, Supplier Payments & Shop Expense Improvements
-- Ensures supplier archival support, non-negative amounts, performance indexes, atomic RPCs, and strict shop workspace RLS

-- 1. Ensure `is_active` column on `suppliers` table for safe soft-archiving
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'suppliers' and column_name = 'is_active'
  ) then
    alter table public.suppliers add column is_active boolean default true not null;
  end if;
end $$;

-- 2. Ensure constraints on purchases, supplier_payments, and transactions
alter table public.purchases
  drop constraint if exists chk_purchases_total_amount_positive;

alter table public.purchases
  add constraint chk_purchases_total_amount_positive check (total_amount > 0);

alter table public.supplier_payments
  drop constraint if exists chk_supplier_payments_amount_positive;

alter table public.supplier_payments
  add constraint chk_supplier_payments_amount_positive check (amount > 0);

alter table public.transactions
  drop constraint if exists chk_transactions_amount_positive;

alter table public.transactions
  add constraint chk_transactions_amount_positive check (amount > 0);

-- 3. Composite Performance Indexes
create index if not exists idx_suppliers_ws_active_name on public.suppliers(workspace_id, is_active, name);
create index if not exists idx_suppliers_user_ws on public.suppliers(user_id, workspace_id);

create index if not exists idx_purchases_ws_date_desc on public.purchases(workspace_id, purchase_date desc);
create index if not exists idx_purchases_supplier_date on public.purchases(supplier_id, purchase_date desc);
create index if not exists idx_purchases_user_ws_date on public.purchases(user_id, workspace_id, purchase_date desc);

create index if not exists idx_supplier_payments_purchase_id on public.supplier_payments(purchase_id);
create index if not exists idx_supplier_payments_supplier_date on public.supplier_payments(supplier_id, payment_date desc);
create index if not exists idx_supplier_payments_ws_date on public.supplier_payments(workspace_id, payment_date desc);

create index if not exists idx_transactions_ws_type_date on public.transactions(workspace_id, type, transaction_date desc);

-- 4. Triggers for updated_at
drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_purchases_updated_at on public.purchases;
create trigger trg_purchases_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

-- 5. Strict Row Level Security Policies for Suppliers
alter table public.suppliers enable row level security;

drop policy if exists "Suppliers are viewable by owner" on public.suppliers;
create policy "Suppliers are viewable by owner"
  on public.suppliers for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Suppliers are insertable by owner" on public.suppliers;
create policy "Suppliers are insertable by owner"
  on public.suppliers for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Suppliers are updatable by owner" on public.suppliers;
create policy "Suppliers are updatable by owner"
  on public.suppliers for update
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

drop policy if exists "Suppliers are deletable by owner" on public.suppliers;
create policy "Suppliers are deletable by owner"
  on public.suppliers for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

-- 6. Strict Row Level Security Policies for Purchases
alter table public.purchases enable row level security;

drop policy if exists "Purchases are viewable by owner" on public.purchases;
create policy "Purchases are viewable by owner"
  on public.purchases for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Purchases are insertable by owner" on public.purchases;
create policy "Purchases are insertable by owner"
  on public.purchases for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
    and (
      supplier_id is null 
      or supplier_id in (
        select id from public.suppliers 
        where user_id = (select auth.uid()) and workspace_id in (
          select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
        )
      )
    )
  );

drop policy if exists "Purchases are updatable by owner" on public.purchases;
create policy "Purchases are updatable by owner"
  on public.purchases for update
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
    and (
      supplier_id is null 
      or supplier_id in (
        select id from public.suppliers 
        where user_id = (select auth.uid()) and workspace_id in (
          select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
        )
      )
    )
  );

drop policy if exists "Purchases are deletable by owner" on public.purchases;
create policy "Purchases are deletable by owner"
  on public.purchases for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

-- 7. Strict Row Level Security Policies for Supplier Payments
alter table public.supplier_payments enable row level security;

drop policy if exists "Supplier payments are viewable by owner" on public.supplier_payments;
create policy "Supplier payments are viewable by owner"
  on public.supplier_payments for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Supplier payments are insertable by owner" on public.supplier_payments;
create policy "Supplier payments are insertable by owner"
  on public.supplier_payments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
    and supplier_id in (
      select id from public.suppliers 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
    and (
      purchase_id is null 
      or purchase_id in (
        select id from public.purchases 
        where user_id = (select auth.uid()) and workspace_id in (
          select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
        )
      )
    )
  );

drop policy if exists "Supplier payments are updatable by owner" on public.supplier_payments;
create policy "Supplier payments are updatable by owner"
  on public.supplier_payments for update
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
    and supplier_id in (
      select id from public.suppliers 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
    and (
      purchase_id is null 
      or purchase_id in (
        select id from public.purchases 
        where user_id = (select auth.uid()) and workspace_id in (
          select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
        )
      )
    )
  );

drop policy if exists "Supplier payments are deletable by owner" on public.supplier_payments;
create policy "Supplier payments are deletable by owner"
  on public.supplier_payments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

-- 8. Atomic RPC: Create Purchase with Optional Initial Payment
create or replace function public.create_purchase_with_payment(
  p_workspace_id uuid,
  p_supplier_id uuid,
  p_bill_number text,
  p_purchase_date date,
  p_total_amount numeric,
  p_initial_payment numeric default 0,
  p_payment_method text default 'UPI',
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_supplier record;
  v_purchase record;
  v_payment record;
  v_result json;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Validate workspace ownership & type
  if not exists (
    select 1 from public.workspaces 
    where id = p_workspace_id and user_id = v_user_id and type = 'shop'
  ) then
    raise exception 'Invalid shop workspace.';
  end if;

  -- Validate supplier ownership
  select * into v_supplier from public.suppliers 
  where id = p_supplier_id and user_id = v_user_id and workspace_id = p_workspace_id;

  if v_supplier.id is null then
    raise exception 'Supplier not found or unauthorized.';
  end if;

  -- Validate amounts
  if p_total_amount <= 0 then
    raise exception 'Total purchase amount must be greater than 0.';
  end if;

  if p_initial_payment < 0 then
    raise exception 'Initial payment cannot be negative.';
  end if;

  if p_initial_payment > p_total_amount then
    raise exception 'Initial payment cannot exceed the purchase total of %', p_total_amount;
  end if;

  -- Insert purchase
  insert into public.purchases (
    user_id,
    workspace_id,
    supplier_id,
    bill_number,
    purchase_date,
    total_amount,
    notes
  ) values (
    v_user_id,
    p_workspace_id,
    p_supplier_id,
    nullif(trim(p_bill_number), ''),
    p_purchase_date,
    p_total_amount,
    nullif(trim(p_notes), '')
  )
  returning * into v_purchase;

  -- Insert initial payment if > 0
  if p_initial_payment > 0 then
    insert into public.supplier_payments (
      user_id,
      workspace_id,
      supplier_id,
      purchase_id,
      amount,
      payment_date,
      payment_method,
      notes
    ) values (
      v_user_id,
      p_workspace_id,
      p_supplier_id,
      v_purchase.id,
      p_initial_payment,
      p_purchase_date,
      coalesce(nullif(trim(p_payment_method), ''), 'UPI'),
      'Initial payment for bill ' || coalesce(v_purchase.bill_number, 'N/A')
    )
    returning * into v_payment;
  end if;

  v_result := json_build_object(
    'purchase', row_to_json(v_purchase),
    'payment', row_to_json(v_payment),
    'paid_amount', coalesce(p_initial_payment, 0),
    'remaining_amount', p_total_amount - coalesce(p_initial_payment, 0)
  );

  return v_result;
end;
$$;

-- 9. Atomic RPC: Record Supplier Payment with Overpayment Safety
create or replace function public.record_supplier_payment(
  p_workspace_id uuid,
  p_supplier_id uuid,
  p_purchase_id uuid default null,
  p_amount numeric default 0,
  p_payment_date date default current_date,
  p_payment_method text default 'UPI',
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_purchase record;
  v_payment record;
  v_total_paid numeric := 0;
  v_remaining numeric := 0;
  v_result json;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0.';
  end if;

  -- Validate workspace ownership
  if not exists (
    select 1 from public.workspaces 
    where id = p_workspace_id and user_id = v_user_id and type = 'shop'
  ) then
    raise exception 'Invalid shop workspace.';
  end if;

  -- Validate supplier ownership
  if not exists (
    select 1 from public.suppliers 
    where id = p_supplier_id and user_id = v_user_id and workspace_id = p_workspace_id
  ) then
    raise exception 'Supplier not found or unauthorized.';
  end if;

  -- If purchase_id is provided, lock purchase and enforce overpayment check
  if p_purchase_id is not null then
    select * into v_purchase from public.purchases 
    where id = p_purchase_id and user_id = v_user_id and workspace_id = p_workspace_id
    for update;

    if v_purchase.id is null then
      raise exception 'Purchase record not found or unauthorized.';
    end if;

    select coalesce(sum(amount), 0) into v_total_paid 
    from public.supplier_payments 
    where purchase_id = p_purchase_id;

    v_remaining := v_purchase.total_amount - v_total_paid;

    if p_amount > v_remaining then
      raise exception 'Payment amount of % exceeds the remaining balance of % for this bill.', p_amount, v_remaining;
    end if;
  end if;

  -- Insert payment record
  insert into public.supplier_payments (
    user_id,
    workspace_id,
    supplier_id,
    purchase_id,
    amount,
    payment_date,
    payment_method,
    notes
  ) values (
    v_user_id,
    p_workspace_id,
    p_supplier_id,
    p_purchase_id,
    p_amount,
    p_payment_date,
    coalesce(nullif(trim(p_payment_method), ''), 'UPI'),
    nullif(trim(p_notes), '')
  )
  returning * into v_payment;

  -- Recalculate remaining if purchase was targeted
  if p_purchase_id is not null then
    v_remaining := v_remaining - p_amount;
  end if;

  v_result := json_build_object(
    'payment', row_to_json(v_payment),
    'purchase_id', p_purchase_id,
    'remaining_amount', v_remaining
  );

  return v_result;
end;
$$;
