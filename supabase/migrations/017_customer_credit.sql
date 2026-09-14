-- Migration 017: Pan Shop Customer Credit / Udhaar Management Improvements
-- Adds soft-archive support, performance indexes, check constraints, strict shop workspace RLS, and atomic RPCs with row-level locking for concurrency and overpayment safety.

-- 1. Ensure `is_archived` column on `customer_credits`
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'customer_credits' and column_name = 'is_archived'
  ) then
    alter table public.customer_credits add column is_archived boolean default false not null;
  end if;
end $$;

-- 2. Ensure constraints on customer_credits & customer_credit_payments
alter table public.customer_credits
  drop constraint if exists chk_customer_credits_original_amount_positive;

alter table public.customer_credits
  add constraint chk_customer_credits_original_amount_positive check (original_amount > 0);

alter table public.customer_credit_payments
  drop constraint if exists chk_cust_credit_payments_amount_positive;

alter table public.customer_credit_payments
  add constraint chk_cust_credit_payments_amount_positive check (amount > 0);

-- 3. Composite Performance Indexes
create index if not exists idx_customer_credits_ws_archived on public.customer_credits(workspace_id, is_archived);
create index if not exists idx_customer_credits_ws_date_desc on public.customer_credits(workspace_id, credit_date desc);
create index if not exists idx_customer_credits_ws_due_date on public.customer_credits(workspace_id, due_date);
create index if not exists idx_customer_credits_ws_status on public.customer_credits(workspace_id, status);
create index if not exists idx_customer_credits_ws_customer on public.customer_credits(workspace_id, customer_name);
create index if not exists idx_customer_credits_user_ws on public.customer_credits(user_id, workspace_id);

create index if not exists idx_cust_credit_payments_credit_date on public.customer_credit_payments(customer_credit_id, payment_date desc);
create index if not exists idx_cust_credit_payments_user_date on public.customer_credit_payments(user_id, payment_date desc);

-- 4. Triggers for updated_at
drop trigger if exists trg_customer_credits_updated_at on public.customer_credits;
create trigger trg_customer_credits_updated_at
  before update on public.customer_credits
  for each row execute function public.set_updated_at();

-- 5. Strict Row Level Security Policies for Customer Credits
alter table public.customer_credits enable row level security;

drop policy if exists "Customer credits are viewable by owner" on public.customer_credits;
create policy "Customer credits are viewable by owner"
  on public.customer_credits for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Customer credits are insertable by owner" on public.customer_credits;
create policy "Customer credits are insertable by owner"
  on public.customer_credits for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Customer credits are updatable by owner" on public.customer_credits;
create policy "Customer credits are updatable by owner"
  on public.customer_credits for update
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

drop policy if exists "Customer credits are deletable by owner" on public.customer_credits;
create policy "Customer credits are deletable by owner"
  on public.customer_credits for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

-- 6. Strict Row Level Security Policies for Customer Credit Payments
alter table public.customer_credit_payments enable row level security;

drop policy if exists "Customer credit payments are viewable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are viewable by owner"
  on public.customer_credit_payments for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and customer_credit_id in (
      select id from public.customer_credits 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

drop policy if exists "Customer credit payments are insertable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are insertable by owner"
  on public.customer_credit_payments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and customer_credit_id in (
      select id from public.customer_credits 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

drop policy if exists "Customer credit payments are updatable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are updatable by owner"
  on public.customer_credit_payments for update
  to authenticated
  using (
    (select auth.uid()) = user_id
  )
  with check (
    (select auth.uid()) = user_id
    and customer_credit_id in (
      select id from public.customer_credits 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

drop policy if exists "Customer credit payments are deletable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are deletable by owner"
  on public.customer_credit_payments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and customer_credit_id in (
      select id from public.customer_credits 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

-- 7. Atomic RPC: Create Customer Credit with Optional Initial Payment
create or replace function public.create_customer_credit_with_payment(
  p_workspace_id uuid,
  p_customer_name text,
  p_phone text default null,
  p_original_amount numeric default 0,
  p_credit_date date default current_date,
  p_due_date date default null,
  p_notes text default null,
  p_initial_payment numeric default 0,
  p_payment_method text default 'Cash'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_credit record;
  v_payment record;
  v_status text := 'pending';
  v_remaining numeric;
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

  -- Validate customer name
  if trim(coalesce(p_customer_name, '')) = '' then
    raise exception 'Customer name is required.';
  end if;

  -- Validate amounts
  if p_original_amount <= 0 then
    raise exception 'Credit amount must be greater than 0.';
  end if;

  if p_initial_payment < 0 then
    raise exception 'Initial payment cannot be negative.';
  end if;

  if p_initial_payment > p_original_amount then
    raise exception 'Initial payment of ₹% cannot exceed the credit amount of ₹%.', p_initial_payment, p_original_amount;
  end if;

  -- Derive status
  v_remaining := p_original_amount - p_initial_payment;
  if v_remaining <= 0 then
    v_status := 'paid';
  elsif p_initial_payment > 0 then
    v_status := 'partial';
  else
    v_status := 'pending';
  end if;

  -- Insert customer credit
  insert into public.customer_credits (
    user_id,
    workspace_id,
    customer_name,
    phone,
    original_amount,
    credit_date,
    due_date,
    notes,
    status
  ) values (
    v_user_id,
    p_workspace_id,
    trim(p_customer_name),
    nullif(trim(p_phone), ''),
    p_original_amount,
    p_credit_date,
    p_due_date,
    nullif(trim(p_notes), ''),
    v_status
  )
  returning * into v_credit;

  -- Insert initial payment if > 0
  if p_initial_payment > 0 then
    insert into public.customer_credit_payments (
      user_id,
      customer_credit_id,
      amount,
      payment_date,
      payment_method,
      notes
    ) values (
      v_user_id,
      v_credit.id,
      p_initial_payment,
      p_credit_date,
      coalesce(nullif(trim(p_payment_method), ''), 'Cash'),
      'Initial payment upon credit issuance'
    )
    returning * into v_payment;
  end if;

  v_result := json_build_object(
    'credit', row_to_json(v_credit),
    'payment', row_to_json(v_payment),
    'amount_received', coalesce(p_initial_payment, 0),
    'remaining_amount', v_remaining,
    'status', v_status
  );

  return v_result;
end;
$$;

-- 8. Atomic RPC: Record Customer Credit Payment with Strict Row-Locking & Overpayment Protection
create or replace function public.record_customer_credit_payment(
  p_credit_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_payment_method text default 'Cash',
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_credit record;
  v_payment record;
  v_total_paid numeric := 0;
  v_remaining numeric := 0;
  v_new_total_paid numeric := 0;
  v_new_remaining numeric := 0;
  v_new_status text;
  v_result json;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0.';
  end if;

  -- Fetch & lock the credit record to guarantee concurrency safety
  select * into v_credit from public.customer_credits 
  where id = p_credit_id and user_id = v_user_id
  for update;

  if v_credit.id is null then
    raise exception 'Customer credit record not found or unauthorized.';
  end if;

  -- Validate workspace
  if not exists (
    select 1 from public.workspaces 
    where id = v_credit.workspace_id and user_id = v_user_id and type = 'shop'
  ) then
    raise exception 'Invalid shop workspace.';
  end if;

  -- Calculate existing payments
  select coalesce(sum(amount), 0) into v_total_paid 
  from public.customer_credit_payments 
  where customer_credit_id = p_credit_id;

  v_remaining := v_credit.original_amount - v_total_paid;

  if v_remaining <= 0 then
    raise exception 'This customer credit has already been settled in full.';
  end if;

  if p_amount > v_remaining then
    raise exception 'Payment cannot exceed the remaining balance of ₹%.', v_remaining;
  end if;

  -- Insert payment record
  insert into public.customer_credit_payments (
    user_id,
    customer_credit_id,
    amount,
    payment_date,
    payment_method,
    notes
  ) values (
    v_user_id,
    p_credit_id,
    p_amount,
    p_payment_date,
    coalesce(nullif(trim(p_payment_method), ''), 'Cash'),
    nullif(trim(p_notes), '')
  )
  returning * into v_payment;

  -- Recalculate status & balances
  v_new_total_paid := v_total_paid + p_amount;
  v_new_remaining := v_credit.original_amount - v_new_total_paid;

  if v_new_remaining <= 0 then
    v_new_status := 'paid';
  else
    v_new_status := 'partial';
  end if;

  -- Update stored status on credit record
  update public.customer_credits 
  set status = v_new_status, updated_at = now()
  where id = p_credit_id;

  v_result := json_build_object(
    'payment', row_to_json(v_payment),
    'credit_id', p_credit_id,
    'total_paid', v_new_total_paid,
    'remaining_amount', v_new_remaining,
    'status', v_new_status
  );

  return v_result;
end;
$$;

-- 9. Atomic RPC: Update Customer Credit Payment with Validation
create or replace function public.update_customer_credit_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_payment_method text default 'Cash',
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_payment record;
  v_credit record;
  v_other_paid numeric := 0;
  v_new_total_paid numeric := 0;
  v_new_remaining numeric := 0;
  v_new_status text;
  v_updated_payment record;
  v_result json;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0.';
  end if;

  -- Find payment
  select * into v_payment from public.customer_credit_payments 
  where id = p_payment_id and user_id = v_user_id;

  if v_payment.id is null then
    raise exception 'Customer credit payment not found or unauthorized.';
  end if;

  -- Lock credit row
  select * into v_credit from public.customer_credits 
  where id = v_payment.customer_credit_id and user_id = v_user_id
  for update;

  if v_credit.id is null then
    raise exception 'Associated credit record not found.';
  end if;

  -- Sum other payments
  select coalesce(sum(amount), 0) into v_other_paid 
  from public.customer_credit_payments 
  where customer_credit_id = v_credit.id and id != p_payment_id;

  v_new_total_paid := v_other_paid + p_amount;

  if v_new_total_paid > v_credit.original_amount then
    raise exception 'Updated payment total (₹%) exceeds the original credit amount of ₹%.', v_new_total_paid, v_credit.original_amount;
  end if;

  -- Update payment
  update public.customer_credit_payments 
  set amount = p_amount,
      payment_date = p_payment_date,
      payment_method = coalesce(nullif(trim(p_payment_method), ''), 'Cash'),
      notes = nullif(trim(p_notes), '')
  where id = p_payment_id
  returning * into v_updated_payment;

  -- Recalculate remaining & status
  v_new_remaining := v_credit.original_amount - v_new_total_paid;

  if v_new_remaining <= 0 then
    v_new_status := 'paid';
  elsif v_new_total_paid > 0 then
    v_new_status := 'partial';
  else
    v_new_status := 'pending';
  end if;

  update public.customer_credits 
  set status = v_new_status, updated_at = now()
  where id = v_credit.id;

  v_result := json_build_object(
    'payment', row_to_json(v_updated_payment),
    'credit_id', v_credit.id,
    'total_paid', v_new_total_paid,
    'remaining_amount', v_new_remaining,
    'status', v_new_status
  );

  return v_result;
end;
$$;

-- 10. Atomic RPC: Delete Customer Credit Payment with Status Sync
create or replace function public.delete_customer_credit_payment(
  p_payment_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_payment record;
  v_credit record;
  v_new_total_paid numeric := 0;
  v_new_remaining numeric := 0;
  v_new_status text;
  v_result json;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Find payment
  select * into v_payment from public.customer_credit_payments 
  where id = p_payment_id and user_id = v_user_id;

  if v_payment.id is null then
    raise exception 'Customer credit payment not found or unauthorized.';
  end if;

  -- Lock credit row
  select * into v_credit from public.customer_credits 
  where id = v_payment.customer_credit_id and user_id = v_user_id
  for update;

  if v_credit.id is null then
    raise exception 'Associated credit record not found.';
  end if;

  -- Delete payment
  delete from public.customer_credit_payments where id = p_payment_id;

  -- Recalculate remaining payments
  select coalesce(sum(amount), 0) into v_new_total_paid 
  from public.customer_credit_payments 
  where customer_credit_id = v_credit.id;

  v_new_remaining := v_credit.original_amount - v_new_total_paid;

  if v_new_remaining <= 0 then
    v_new_status := 'paid';
  elsif v_new_total_paid > 0 then
    v_new_status := 'partial';
  else
    v_new_status := 'pending';
  end if;

  update public.customer_credits 
  set status = v_new_status, updated_at = now()
  where id = v_credit.id;

  v_result := json_build_object(
    'deleted_payment_id', p_payment_id,
    'credit_id', v_credit.id,
    'total_paid', v_new_total_paid,
    'remaining_amount', v_new_remaining,
    'status', v_new_status
  );

  return v_result;
end;
$$;

-- 11. Atomic RPC: Update Customer Credit Record with Total Paid Check
create or replace function public.update_customer_credit(
  p_credit_id uuid,
  p_customer_name text,
  p_phone text default null,
  p_original_amount numeric default 0,
  p_credit_date date default current_date,
  p_due_date date default null,
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_credit record;
  v_total_paid numeric := 0;
  v_new_remaining numeric := 0;
  v_new_status text;
  v_updated_credit record;
  v_result json;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if trim(coalesce(p_customer_name, '')) = '' then
    raise exception 'Customer name is required.';
  end if;

  if p_original_amount <= 0 then
    raise exception 'Credit amount must be greater than 0.';
  end if;

  -- Lock credit row
  select * into v_credit from public.customer_credits 
  where id = p_credit_id and user_id = v_user_id
  for update;

  if v_credit.id is null then
    raise exception 'Customer credit record not found or unauthorized.';
  end if;

  -- Calculate existing total paid
  select coalesce(sum(amount), 0) into v_total_paid 
  from public.customer_credit_payments 
  where customer_credit_id = p_credit_id;

  if p_original_amount < v_total_paid then
    raise exception 'New credit amount of ₹% cannot be less than the ₹% already received.', p_original_amount, v_total_paid;
  end if;

  v_new_remaining := p_original_amount - v_total_paid;

  if v_new_remaining <= 0 then
    v_new_status := 'paid';
  elsif v_total_paid > 0 then
    v_new_status := 'partial';
  else
    v_new_status := 'pending';
  end if;

  update public.customer_credits 
  set customer_name = trim(p_customer_name),
      phone = nullif(trim(p_phone), ''),
      original_amount = p_original_amount,
      credit_date = p_credit_date,
      due_date = p_due_date,
      notes = nullif(trim(p_notes), ''),
      status = v_new_status,
      updated_at = now()
  where id = p_credit_id
  returning * into v_updated_credit;

  v_result := json_build_object(
    'credit', row_to_json(v_updated_credit),
    'total_paid', v_total_paid,
    'remaining_amount', v_new_remaining,
    'status', v_new_status
  );

  return v_result;
end;
$$;
