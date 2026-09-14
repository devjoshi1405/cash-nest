-- Migration 016: Pan Shop Inventory, Product Management, Atomic Movement RPCs, Stock Reconciliation, and Purchase Items Integration

-- 1. Create purchase_items table if not exists
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Constraints on products and inventory_movements
alter table public.products
  drop constraint if exists chk_products_current_stock_non_negative;
alter table public.products
  add constraint chk_products_current_stock_non_negative check (current_stock >= 0);

alter table public.products
  drop constraint if exists chk_products_purchase_price_non_negative;
alter table public.products
  add constraint chk_products_purchase_price_non_negative check (purchase_price is null or purchase_price >= 0);

alter table public.products
  drop constraint if exists chk_products_selling_price_non_negative;
alter table public.products
  add constraint chk_products_selling_price_non_negative check (selling_price is null or selling_price >= 0);

alter table public.products
  drop constraint if exists chk_products_low_stock_non_negative;
alter table public.products
  add constraint chk_products_low_stock_non_negative check (low_stock_threshold is null or low_stock_threshold >= 0);

alter table public.inventory_movements
  drop constraint if exists chk_inventory_movements_quantity_positive;
alter table public.inventory_movements
  add constraint chk_inventory_movements_quantity_positive check (quantity > 0);

alter table public.inventory_movements
  drop constraint if exists chk_inventory_movements_unit_cost_non_negative;
alter table public.inventory_movements
  add constraint chk_inventory_movements_unit_cost_non_negative check (unit_cost is null or unit_cost >= 0);

-- 3. Indexes for high performance
create unique index if not exists idx_products_ws_normalized_name 
  on public.products (workspace_id, lower(trim(name)));

create index if not exists idx_products_ws_active 
  on public.products (workspace_id, is_active);

create index if not exists idx_products_ws_category 
  on public.products (workspace_id, category);

create index if not exists idx_inventory_movements_prod_date 
  on public.inventory_movements (product_id, movement_date desc);

create index if not exists idx_inventory_movements_ws_type_date 
  on public.inventory_movements (workspace_id, movement_type, movement_date desc);

create index if not exists idx_inventory_movements_ref 
  on public.inventory_movements (reference_type, reference_id);

create index if not exists idx_purchase_items_purchase_id 
  on public.purchase_items (purchase_id);

create index if not exists idx_purchase_items_product_id 
  on public.purchase_items (product_id);

create index if not exists idx_purchase_items_workspace_id 
  on public.purchase_items (workspace_id);

create index if not exists idx_purchase_items_user_id 
  on public.purchase_items (user_id);

-- 4. Trigger for updated_at on purchase_items
drop trigger if exists trg_purchase_items_updated_at on public.purchase_items;
create trigger trg_purchase_items_updated_at
  before update on public.purchase_items
  for each row execute function public.set_updated_at();

-- 5. Strict Shop Workspace Row Level Security Policies

-- Products RLS
alter table public.products enable row level security;

drop policy if exists "Products are viewable by owner" on public.products;
create policy "Products are viewable by owner"
  on public.products for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Products are insertable by owner" on public.products;
create policy "Products are insertable by owner"
  on public.products for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Products are updatable by owner" on public.products;
create policy "Products are updatable by owner"
  on public.products for update
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

drop policy if exists "Products are deletable by owner" on public.products;
create policy "Products are deletable by owner"
  on public.products for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

-- Inventory Movements RLS
alter table public.inventory_movements enable row level security;

drop policy if exists "Inventory movements are viewable by owner" on public.inventory_movements;
create policy "Inventory movements are viewable by owner"
  on public.inventory_movements for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Inventory movements are insertable by owner" on public.inventory_movements;
create policy "Inventory movements are insertable by owner"
  on public.inventory_movements for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
    and product_id in (
      select id from public.products 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

drop policy if exists "Inventory movements are updatable by owner" on public.inventory_movements;
create policy "Inventory movements are updatable by owner"
  on public.inventory_movements for update
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
    and product_id in (
      select id from public.products 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

drop policy if exists "Inventory movements are deletable by owner" on public.inventory_movements;
create policy "Inventory movements are deletable by owner"
  on public.inventory_movements for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

-- Purchase Items RLS
alter table public.purchase_items enable row level security;

drop policy if exists "Purchase items are viewable by owner" on public.purchase_items;
create policy "Purchase items are viewable by owner"
  on public.purchase_items for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );

drop policy if exists "Purchase items are insertable by owner" on public.purchase_items;
create policy "Purchase items are insertable by owner"
  on public.purchase_items for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
    and purchase_id in (
      select id from public.purchases 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
    and product_id in (
      select id from public.products 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

drop policy if exists "Purchase items are updatable by owner" on public.purchase_items;
create policy "Purchase items are updatable by owner"
  on public.purchase_items for update
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
    and purchase_id in (
      select id from public.purchases 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
    and product_id in (
      select id from public.products 
      where user_id = (select auth.uid()) and workspace_id in (
        select id from public.workspaces where user_id = (select auth.uid()) and type = 'shop'
      )
    )
  );

drop policy if exists "Purchase items are deletable by owner" on public.purchase_items;
create policy "Purchase items are deletable by owner"
  on public.purchase_items for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and workspace_id in (
      select id from public.workspaces 
      where user_id = (select auth.uid()) and type = 'shop'
    )
  );


-- ==============================================================================
-- 6. Atomic RPC: Create Product With Opening Stock
-- ==============================================================================
create or replace function public.create_product_with_opening_stock(
  p_workspace_id uuid,
  p_name text,
  p_category text default null,
  p_unit text default 'Piece',
  p_purchase_price numeric default 0,
  p_selling_price numeric default 0,
  p_opening_stock numeric default 0,
  p_low_stock_threshold numeric default 5,
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_product record;
  v_movement record;
  v_trimmed_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_trimmed_name := trim(coalesce(p_name, ''));
  if v_trimmed_name = '' then
    raise exception 'Product name is required.';
  end if;

  if p_purchase_price < 0 then
    raise exception 'Purchase price cannot be negative.';
  end if;

  if p_selling_price < 0 then
    raise exception 'Selling price cannot be negative.';
  end if;

  if p_opening_stock < 0 then
    raise exception 'Opening stock cannot be negative.';
  end if;

  if p_low_stock_threshold < 0 then
    raise exception 'Low stock threshold cannot be negative.';
  end if;

  -- Validate workspace ownership and type
  if not exists (
    select 1 from public.workspaces 
    where id = p_workspace_id and user_id = v_user_id and type = 'shop'
  ) then
    raise exception 'Invalid shop workspace.';
  end if;

  -- Check duplicate normalized name
  if exists (
    select 1 from public.products 
    where workspace_id = p_workspace_id and lower(trim(name)) = lower(v_trimmed_name)
  ) then
    raise exception 'A product with the name "%" already exists in this shop.', v_trimmed_name;
  end if;

  -- 1. Insert product
  insert into public.products (
    user_id,
    workspace_id,
    name,
    category,
    unit,
    purchase_price,
    selling_price,
    current_stock,
    low_stock_threshold,
    is_active
  ) values (
    v_user_id,
    p_workspace_id,
    v_trimmed_name,
    nullif(trim(p_category), ''),
    coalesce(nullif(trim(p_unit), ''), 'Piece'),
    p_purchase_price,
    p_selling_price,
    p_opening_stock,
    p_low_stock_threshold,
    true
  )
  returning * into v_product;

  -- 2. If opening stock > 0, insert opening stock inventory movement
  if p_opening_stock > 0 then
    insert into public.inventory_movements (
      user_id,
      workspace_id,
      product_id,
      movement_type,
      quantity,
      unit_cost,
      reference_type,
      reference_id,
      notes,
      movement_date
    ) values (
      v_user_id,
      p_workspace_id,
      v_product.id,
      'opening_stock',
      p_opening_stock,
      p_purchase_price,
      'opening_stock',
      v_product.id,
      coalesce(nullif(trim(p_notes), ''), 'Initial opening stock count'),
      now()
    )
    returning * into v_movement;
  end if;

  return json_build_object(
    'product', row_to_json(v_product),
    'movement', case when v_movement.id is not null then row_to_json(v_movement) else null end
  );
end;
$$;


-- ==============================================================================
-- 7. Atomic RPC: Record Inventory Movement
-- ==============================================================================
create or replace function public.record_inventory_movement(
  p_workspace_id uuid,
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_notes text default null,
  p_movement_date timestamptz default now()
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_product record;
  v_movement record;
  v_new_stock numeric;
  v_is_stock_in boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_quantity <= 0 then
    raise exception 'Movement quantity must be greater than 0.';
  end if;

  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'Unit cost cannot be negative.';
  end if;

  -- Validate workspace ownership
  if not exists (
    select 1 from public.workspaces 
    where id = p_workspace_id and user_id = v_user_id and type = 'shop'
  ) then
    raise exception 'Invalid shop workspace.';
  end if;

  -- Lock product row for concurrency safety
  select * into v_product 
  from public.products 
  where id = p_product_id and workspace_id = p_workspace_id and user_id = v_user_id
  for update;

  if v_product.id is null then
    raise exception 'Product not found or unauthorized.';
  end if;

  -- Determine direction
  if p_movement_type in ('opening_stock', 'purchase', 'adjustment_in', 'return_in') then
    v_is_stock_in := true;
    v_new_stock := v_product.current_stock + p_quantity;
  elsif p_movement_type in ('sale', 'adjustment_out', 'return_out') then
    v_is_stock_in := false;
    if p_quantity > v_product.current_stock then
      raise exception 'Stock adjustment of % exceeds current available stock of % %.', 
        p_quantity, v_product.current_stock, coalesce(v_product.unit, 'units');
    end if;
    v_new_stock := v_product.current_stock - p_quantity;
  else
    raise exception 'Invalid inventory movement type: %', p_movement_type;
  end if;

  -- Insert movement
  insert into public.inventory_movements (
    user_id,
    workspace_id,
    product_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    movement_date
  ) values (
    v_user_id,
    p_workspace_id,
    p_product_id,
    p_movement_type,
    p_quantity,
    p_unit_cost,
    nullif(trim(p_reference_type), ''),
    p_reference_id,
    nullif(trim(p_notes), ''),
    coalesce(p_movement_date, now())
  )
  returning * into v_movement;

  -- Update product current stock and latest purchase price if purchase
  update public.products
  set 
    current_stock = v_new_stock,
    purchase_price = case 
      when p_movement_type = 'purchase' and p_unit_cost is not null and p_unit_cost > 0 
      then p_unit_cost 
      else purchase_price 
    end,
    updated_at = now()
  where id = p_product_id
  returning * into v_product;

  return json_build_object(
    'product', row_to_json(v_product),
    'movement', row_to_json(v_movement),
    'previous_stock', v_product.current_stock - (case when v_is_stock_in then p_quantity else -p_quantity end),
    'new_stock', v_new_stock
  );
end;
$$;


-- ==============================================================================
-- 8. Atomic RPC: Record Physical Stock Count Reconciliation
-- ==============================================================================
create or replace function public.record_stock_reconciliation(
  p_workspace_id uuid,
  p_product_id uuid,
  p_physical_stock numeric,
  p_reason text default null,
  p_movement_date timestamptz default now()
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_product record;
  v_movement record;
  v_diff numeric;
  v_movement_type text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_physical_stock < 0 then
    raise exception 'Physical stock count cannot be negative.';
  end if;

  -- Lock product row
  select * into v_product 
  from public.products 
  where id = p_product_id and workspace_id = p_workspace_id and user_id = v_user_id
  for update;

  if v_product.id is null then
    raise exception 'Product not found or unauthorized.';
  end if;

  v_diff := p_physical_stock - v_product.current_stock;

  if v_diff = 0 then
    return json_build_object(
      'product', row_to_json(v_product),
      'movement', null,
      'difference', 0
    );
  end if;

  if v_diff > 0 then
    v_movement_type := 'adjustment_in';
  else
    v_movement_type := 'adjustment_out';
  end if;

  -- Insert adjustment movement
  insert into public.inventory_movements (
    user_id,
    workspace_id,
    product_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    movement_date
  ) values (
    v_user_id,
    p_workspace_id,
    p_product_id,
    v_movement_type,
    abs(v_diff),
    v_product.purchase_price,
    'stock_reconciliation',
    p_product_id,
    coalesce(nullif(trim(p_reason), ''), 'Physical stock count correction (System: ' || v_product.current_stock || ' -> Actual: ' || p_physical_stock || ')'),
    coalesce(p_movement_date, now())
  )
  returning * into v_movement;

  -- Update product current stock
  update public.products
  set 
    current_stock = p_physical_stock,
    updated_at = now()
  where id = p_product_id
  returning * into v_product;

  return json_build_object(
    'product', row_to_json(v_product),
    'movement', row_to_json(v_movement),
    'difference', v_diff
  );
end;
$$;


-- ==============================================================================
-- 9. Atomic RPC: Save Purchase Line Item With Inventory Sync
-- ==============================================================================
create or replace function public.save_purchase_item_with_inventory(
  p_workspace_id uuid,
  p_purchase_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_item_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_purchase record;
  v_product record;
  v_existing_item record;
  v_item record;
  v_movement record;
  v_delta numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_quantity <= 0 then
    raise exception 'Line item quantity must be greater than 0.';
  end if;

  if p_unit_cost < 0 then
    raise exception 'Unit cost cannot be negative.';
  end if;

  -- Validate workspace
  if not exists (
    select 1 from public.workspaces 
    where id = p_workspace_id and user_id = v_user_id and type = 'shop'
  ) then
    raise exception 'Invalid shop workspace.';
  end if;

  -- Validate purchase
  select * into v_purchase 
  from public.purchases 
  where id = p_purchase_id and workspace_id = p_workspace_id and user_id = v_user_id;

  if v_purchase.id is null then
    raise exception 'Purchase record not found or unauthorized.';
  end if;

  -- Lock product
  select * into v_product 
  from public.products 
  where id = p_product_id and workspace_id = p_workspace_id and user_id = v_user_id
  for update;

  if v_product.id is null then
    raise exception 'Product not found or unauthorized.';
  end if;

  if p_item_id is null then
    -- 1. Insert new purchase item
    insert into public.purchase_items (
      user_id,
      workspace_id,
      purchase_id,
      product_id,
      quantity,
      unit_cost
    ) values (
      v_user_id,
      p_workspace_id,
      p_purchase_id,
      p_product_id,
      p_quantity,
      p_unit_cost
    )
    returning * into v_item;

    -- 2. Insert purchase inventory movement
    insert into public.inventory_movements (
      user_id,
      workspace_id,
      product_id,
      movement_type,
      quantity,
      unit_cost,
      reference_type,
      reference_id,
      notes,
      movement_date
    ) values (
      v_user_id,
      p_workspace_id,
      p_product_id,
      'purchase',
      p_quantity,
      p_unit_cost,
      'purchase_item',
      v_item.id,
      'Procured in Purchase Bill ' || coalesce(v_purchase.bill_number, 'N/A'),
      v_purchase.purchase_date::timestamptz
    )
    returning * into v_movement;

    -- 3. Increase product stock & update latest purchase price
    update public.products
    set 
      current_stock = current_stock + p_quantity,
      purchase_price = case when p_unit_cost > 0 then p_unit_cost else purchase_price end,
      updated_at = now()
    where id = p_product_id
    returning * into v_product;

  else
    -- Update existing purchase item
    select * into v_existing_item 
    from public.purchase_items 
    where id = p_item_id and workspace_id = p_workspace_id and user_id = v_user_id
    for update;

    if v_existing_item.id is null then
      raise exception 'Purchase item not found or unauthorized.';
    end if;

    v_delta := p_quantity - v_existing_item.quantity;

    -- If reducing quantity, verify product has enough stock remaining
    if v_delta < 0 and (v_product.current_stock + v_delta) < 0 then
      raise exception 'Cannot reduce purchase quantity by %: only % units currently available in stock.',
        abs(v_delta), v_product.current_stock;
    end if;

    -- Update purchase item
    update public.purchase_items
    set 
      quantity = p_quantity,
      unit_cost = p_unit_cost,
      updated_at = now()
    where id = p_item_id
    returning * into v_item;

    -- Update or insert linked inventory movement
    update public.inventory_movements
    set 
      quantity = p_quantity,
      unit_cost = p_unit_cost,
      movement_date = v_purchase.purchase_date::timestamptz
    where reference_type = 'purchase_item' and reference_id = p_item_id;

    if not found then
      insert into public.inventory_movements (
        user_id,
        workspace_id,
        product_id,
        movement_type,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        notes,
        movement_date
      ) values (
        v_user_id,
        p_workspace_id,
        p_product_id,
        'purchase',
        p_quantity,
        p_unit_cost,
        'purchase_item',
        p_item_id,
        'Procured in Purchase Bill ' || coalesce(v_purchase.bill_number, 'N/A'),
        v_purchase.purchase_date::timestamptz
      );
    end if;

    -- Update product stock by delta
    update public.products
    set 
      current_stock = current_stock + v_delta,
      purchase_price = case when p_unit_cost > 0 then p_unit_cost else purchase_price end,
      updated_at = now()
    where id = p_product_id
    returning * into v_product;

  end if;

  return json_build_object(
    'item', row_to_json(v_item),
    'product', row_to_json(v_product),
    'current_stock', v_product.current_stock
  );
end;
$$;


-- ==============================================================================
-- 10. Atomic RPC: Delete Purchase Line Item With Safe Stock Reversal
-- ==============================================================================
create or replace function public.delete_purchase_item_with_inventory(
  p_workspace_id uuid,
  p_item_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_item record;
  v_product record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Lock purchase item
  select * into v_item 
  from public.purchase_items 
  where id = p_item_id and workspace_id = p_workspace_id and user_id = v_user_id
  for update;

  if v_item.id is null then
    raise exception 'Purchase item not found or unauthorized.';
  end if;

  -- Lock product
  select * into v_product 
  from public.products 
  where id = v_item.product_id and workspace_id = p_workspace_id and user_id = v_user_id
  for update;

  if v_product.id is null then
    raise exception 'Product not found.';
  end if;

  -- Check if enough stock exists to reverse this purchase
  if v_product.current_stock < v_item.quantity then
    raise exception 'Cannot remove purchase item (% units): current stock is only % units (some units may have been adjusted or sold).',
      v_item.quantity, v_product.current_stock;
  end if;

  -- Delete linked inventory movements
  delete from public.inventory_movements
  where reference_type = 'purchase_item' and reference_id = p_item_id;

  -- Delete purchase item
  delete from public.purchase_items
  where id = p_item_id;

  -- Decrement product current stock
  update public.products
  set 
    current_stock = current_stock - v_item.quantity,
    updated_at = now()
  where id = v_item.product_id
  returning * into v_product;

  return json_build_object(
    'deleted_item_id', p_item_id,
    'product_id', v_product.id,
    'current_stock', v_product.current_stock
  );
end;
$$;
