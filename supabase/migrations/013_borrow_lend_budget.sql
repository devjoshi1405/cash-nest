-- Migration 013: Borrow & Lend + Budget Management Improvements
-- Adds debt_date, automated status synchronization, payment validation triggers, atomic RPC function, and query performance indexes

-- 1. Add debt_date column to debts table if not exists
alter table public.debts 
  add column if not exists debt_date date not null default current_date;

-- 2. Performance Indexes for Borrow & Lend and Budgets
create index if not exists idx_debts_debt_date on public.debts(debt_date);
create index if not exists idx_debts_due_date on public.debts(due_date);
create index if not exists idx_debts_user_ws_dir on public.debts(user_id, workspace_id, direction);
create index if not exists idx_debt_payments_debt_date on public.debt_payments(debt_id, payment_date desc);
create index if not exists idx_budgets_user_ws_month on public.budgets(user_id, workspace_id, month);

-- 3. Trigger Function: Automatically synchronize debt status on payment change
create or replace function public.sync_debt_status()
returns trigger as $$
declare
  v_debt_id uuid;
  v_original_amount numeric(14,2);
  v_total_paid numeric(14,2);
  v_new_status text;
begin
  if TG_OP = 'DELETE' then
    v_debt_id := OLD.debt_id;
  else
    v_debt_id := NEW.debt_id;
  end if;

  select original_amount into v_original_amount
  from public.debts
  where id = v_debt_id;

  if v_original_amount is not null then
    select coalesce(sum(amount), 0) into v_total_paid
    from public.debt_payments
    where debt_id = v_debt_id;

    if v_total_paid >= v_original_amount then
      v_new_status := 'paid';
    elsif v_total_paid > 0 then
      v_new_status := 'partial';
    else
      v_new_status := 'unpaid';
    end if;

    update public.debts
    set status = v_new_status, updated_at = now()
    where id = v_debt_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_debt_status on public.debt_payments;
create trigger trg_sync_debt_status
  after insert or update or delete on public.debt_payments
  for each row execute function public.sync_debt_status();

-- 4. Trigger Function: Validate original amount cannot be reduced below total recorded payments
create or replace function public.validate_debt_original_amount()
returns trigger as $$
declare
  v_total_paid numeric(14,2);
begin
  select coalesce(sum(amount), 0) into v_total_paid
  from public.debt_payments
  where debt_id = NEW.id;

  if NEW.original_amount < v_total_paid then
    raise exception 'Original amount cannot be less than total payments already recorded (₹%)', v_total_paid;
  end if;

  if v_total_paid >= NEW.original_amount then
    NEW.status := 'paid';
  elsif v_total_paid > 0 then
    NEW.status := 'partial';
  else
    NEW.status := 'unpaid';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_validate_debt_original_amount on public.debts;
create trigger trg_validate_debt_original_amount
  before update on public.debts
  for each row execute function public.validate_debt_original_amount();

-- 5. Atomic RPC function to record a debt payment with concurrency lock & balance check
create or replace function public.record_debt_payment(
  p_debt_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_payment_method text default 'UPI',
  p_notes text default null
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_original_amount numeric(14,2);
  v_total_paid numeric(14,2);
  v_remaining numeric(14,2);
  v_payment_id uuid;
  v_new_status text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0';
  end if;

  -- Lock the debt row to prevent concurrent race conditions
  select original_amount into v_original_amount
  from public.debts
  where id = p_debt_id and user_id = v_user_id
  for update;

  if v_original_amount is null then
    raise exception 'Debt record not found or access denied';
  end if;

  select coalesce(sum(amount), 0) into v_total_paid
  from public.debt_payments
  where debt_id = p_debt_id;

  v_remaining := v_original_amount - v_total_paid;

  if p_amount > v_remaining then
    raise exception 'Payment cannot exceed the remaining balance of ₹%', v_remaining;
  end if;

  insert into public.debt_payments (user_id, debt_id, amount, payment_date, payment_method, notes)
  values (v_user_id, p_debt_id, p_amount, coalesce(p_payment_date, current_date), p_payment_method, p_notes)
  returning id into v_payment_id;

  -- Calculate new total paid & status
  v_total_paid := v_total_paid + p_amount;
  v_remaining := v_original_amount - v_total_paid;
  if v_remaining <= 0 then
    v_new_status := 'paid';
  elsif v_total_paid > 0 then
    v_new_status := 'partial';
  else
    v_new_status := 'unpaid';
  end if;

  update public.debts
  set status = v_new_status, updated_at = now()
  where id = p_debt_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'debt_id', p_debt_id,
    'amount', p_amount,
    'total_paid', v_total_paid,
    'remaining', v_remaining,
    'status', v_new_status
  );
end;
$$ language plpgsql security definer;
