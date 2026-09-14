-- Migration 011: Row Level Security (RLS) & Multi-Tenant Isolation Policies

-- 1. Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.budgets enable row level security;
alter table public.daily_sales enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customer_credits enable row level security;
alter table public.customer_credit_payments enable row level security;

-- ==============================================================================
-- 2. PROFILES POLICIES
-- ==============================================================================
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Profiles are deletable by owner" on public.profiles;
create policy "Profiles are deletable by owner"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 3. WORKSPACES POLICIES
-- ==============================================================================
drop policy if exists "Workspaces are viewable by owner" on public.workspaces;
create policy "Workspaces are viewable by owner"
  on public.workspaces for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Workspaces are insertable by owner" on public.workspaces;
create policy "Workspaces are insertable by owner"
  on public.workspaces for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Workspaces are updatable by owner" on public.workspaces;
create policy "Workspaces are updatable by owner"
  on public.workspaces for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Workspaces are deletable by owner" on public.workspaces;
create policy "Workspaces are deletable by owner"
  on public.workspaces for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 4. CATEGORIES POLICIES
-- ==============================================================================
drop policy if exists "Categories are viewable by owner" on public.categories;
create policy "Categories are viewable by owner"
  on public.categories for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Categories are insertable by owner" on public.categories;
create policy "Categories are insertable by owner"
  on public.categories for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Categories are updatable by owner" on public.categories;
create policy "Categories are updatable by owner"
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Categories are deletable by owner" on public.categories;
create policy "Categories are deletable by owner"
  on public.categories for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 5. TRANSACTIONS POLICIES
-- ==============================================================================
drop policy if exists "Transactions are viewable by owner" on public.transactions;
create policy "Transactions are viewable by owner"
  on public.transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Transactions are insertable by owner" on public.transactions;
create policy "Transactions are insertable by owner"
  on public.transactions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid())))
  );

drop policy if exists "Transactions are updatable by owner" on public.transactions;
create policy "Transactions are updatable by owner"
  on public.transactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid())))
  );

drop policy if exists "Transactions are deletable by owner" on public.transactions;
create policy "Transactions are deletable by owner"
  on public.transactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 6. DEBTS & DEBT PAYMENTS POLICIES
-- ==============================================================================
drop policy if exists "Debts are viewable by owner" on public.debts;
create policy "Debts are viewable by owner"
  on public.debts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Debts are insertable by owner" on public.debts;
create policy "Debts are insertable by owner"
  on public.debts for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Debts are updatable by owner" on public.debts;
create policy "Debts are updatable by owner"
  on public.debts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Debts are deletable by owner" on public.debts;
create policy "Debts are deletable by owner"
  on public.debts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Debt Payments
drop policy if exists "Debt payments are viewable by owner" on public.debt_payments;
create policy "Debt payments are viewable by owner"
  on public.debt_payments for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Debt payments are insertable by owner" on public.debt_payments;
create policy "Debt payments are insertable by owner"
  on public.debt_payments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and debt_id in (select id from public.debts where user_id = (select auth.uid()))
  );

drop policy if exists "Debt payments are updatable by owner" on public.debt_payments;
create policy "Debt payments are updatable by owner"
  on public.debt_payments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and debt_id in (select id from public.debts where user_id = (select auth.uid()))
  );

drop policy if exists "Debt payments are deletable by owner" on public.debt_payments;
create policy "Debt payments are deletable by owner"
  on public.debt_payments for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 7. BUDGETS POLICIES
-- ==============================================================================
drop policy if exists "Budgets are viewable by owner" on public.budgets;
create policy "Budgets are viewable by owner"
  on public.budgets for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Budgets are insertable by owner" on public.budgets;
create policy "Budgets are insertable by owner"
  on public.budgets for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid())))
  );

drop policy if exists "Budgets are updatable by owner" on public.budgets;
create policy "Budgets are updatable by owner"
  on public.budgets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and (category_id is null or category_id in (select id from public.categories where user_id = (select auth.uid())))
  );

drop policy if exists "Budgets are deletable by owner" on public.budgets;
create policy "Budgets are deletable by owner"
  on public.budgets for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 8. SHOP (DAILY SALES, SUPPLIERS, PURCHASES, SUPPLIER PAYMENTS) POLICIES
-- ==============================================================================
-- Daily Sales
drop policy if exists "Daily sales are viewable by owner" on public.daily_sales;
create policy "Daily sales are viewable by owner"
  on public.daily_sales for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Daily sales are insertable by owner" on public.daily_sales;
create policy "Daily sales are insertable by owner"
  on public.daily_sales for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Daily sales are updatable by owner" on public.daily_sales;
create policy "Daily sales are updatable by owner"
  on public.daily_sales for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Daily sales are deletable by owner" on public.daily_sales;
create policy "Daily sales are deletable by owner"
  on public.daily_sales for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Suppliers
drop policy if exists "Suppliers are viewable by owner" on public.suppliers;
create policy "Suppliers are viewable by owner"
  on public.suppliers for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Suppliers are insertable by owner" on public.suppliers;
create policy "Suppliers are insertable by owner"
  on public.suppliers for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Suppliers are updatable by owner" on public.suppliers;
create policy "Suppliers are updatable by owner"
  on public.suppliers for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Suppliers are deletable by owner" on public.suppliers;
create policy "Suppliers are deletable by owner"
  on public.suppliers for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Purchases
drop policy if exists "Purchases are viewable by owner" on public.purchases;
create policy "Purchases are viewable by owner"
  on public.purchases for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Purchases are insertable by owner" on public.purchases;
create policy "Purchases are insertable by owner"
  on public.purchases for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and (supplier_id is null or supplier_id in (select id from public.suppliers where user_id = (select auth.uid())))
  );

drop policy if exists "Purchases are updatable by owner" on public.purchases;
create policy "Purchases are updatable by owner"
  on public.purchases for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and (supplier_id is null or supplier_id in (select id from public.suppliers where user_id = (select auth.uid())))
  );

drop policy if exists "Purchases are deletable by owner" on public.purchases;
create policy "Purchases are deletable by owner"
  on public.purchases for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Supplier Payments
drop policy if exists "Supplier payments are viewable by owner" on public.supplier_payments;
create policy "Supplier payments are viewable by owner"
  on public.supplier_payments for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Supplier payments are insertable by owner" on public.supplier_payments;
create policy "Supplier payments are insertable by owner"
  on public.supplier_payments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and supplier_id in (select id from public.suppliers where user_id = (select auth.uid()))
    and (purchase_id is null or purchase_id in (select id from public.purchases where user_id = (select auth.uid())))
  );

drop policy if exists "Supplier payments are updatable by owner" on public.supplier_payments;
create policy "Supplier payments are updatable by owner"
  on public.supplier_payments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and supplier_id in (select id from public.suppliers where user_id = (select auth.uid()))
    and (purchase_id is null or purchase_id in (select id from public.purchases where user_id = (select auth.uid())))
  );

drop policy if exists "Supplier payments are deletable by owner" on public.supplier_payments;
create policy "Supplier payments are deletable by owner"
  on public.supplier_payments for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 9. INVENTORY & PRODUCTS POLICIES
-- ==============================================================================
-- Products
drop policy if exists "Products are viewable by owner" on public.products;
create policy "Products are viewable by owner"
  on public.products for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Products are insertable by owner" on public.products;
create policy "Products are insertable by owner"
  on public.products for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Products are updatable by owner" on public.products;
create policy "Products are updatable by owner"
  on public.products for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Products are deletable by owner" on public.products;
create policy "Products are deletable by owner"
  on public.products for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Inventory Movements
drop policy if exists "Inventory movements are viewable by owner" on public.inventory_movements;
create policy "Inventory movements are viewable by owner"
  on public.inventory_movements for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Inventory movements are insertable by owner" on public.inventory_movements;
create policy "Inventory movements are insertable by owner"
  on public.inventory_movements for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and product_id in (select id from public.products where user_id = (select auth.uid()))
  );

drop policy if exists "Inventory movements are updatable by owner" on public.inventory_movements;
create policy "Inventory movements are updatable by owner"
  on public.inventory_movements for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
    and product_id in (select id from public.products where user_id = (select auth.uid()))
  );

drop policy if exists "Inventory movements are deletable by owner" on public.inventory_movements;
create policy "Inventory movements are deletable by owner"
  on public.inventory_movements for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ==============================================================================
-- 10. CUSTOMER CREDITS & PAYMENTS POLICIES
-- ==============================================================================
-- Customer Credits
drop policy if exists "Customer credits are viewable by owner" on public.customer_credits;
create policy "Customer credits are viewable by owner"
  on public.customer_credits for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Customer credits are insertable by owner" on public.customer_credits;
create policy "Customer credits are insertable by owner"
  on public.customer_credits for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Customer credits are updatable by owner" on public.customer_credits;
create policy "Customer credits are updatable by owner"
  on public.customer_credits for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  );

drop policy if exists "Customer credits are deletable by owner" on public.customer_credits;
create policy "Customer credits are deletable by owner"
  on public.customer_credits for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Customer Credit Payments
drop policy if exists "Customer credit payments are viewable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are viewable by owner"
  on public.customer_credit_payments for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Customer credit payments are insertable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are insertable by owner"
  on public.customer_credit_payments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and customer_credit_id in (select id from public.customer_credits where user_id = (select auth.uid()))
  );

drop policy if exists "Customer credit payments are updatable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are updatable by owner"
  on public.customer_credit_payments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and customer_credit_id in (select id from public.customer_credits where user_id = (select auth.uid()))
  );

drop policy if exists "Customer credit payments are deletable by owner" on public.customer_credit_payments;
create policy "Customer credit payments are deletable by owner"
  on public.customer_credit_payments for delete
  to authenticated
  using ((select auth.uid()) = user_id);
