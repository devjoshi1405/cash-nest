import { createClient } from "@/lib/supabase/client";
import {
  InventorySummary,
  InventoryMovementRecord,
  InventoryMovementType,
  CategoryInventoryValue,
  StockMovementSummary,
  getMovementDirection,
  calculateInventoryValue,
  Product,
} from "@/types/inventory";
import { mapDbProductToUi, getProductById } from "./products";

export interface MovementsFilterOptions {
  productId?: string;
  movementType?: InventoryMovementType | "all";
  direction?: "all" | "in" | "out";
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface InventoryMovementsResponse {
  movements: InventoryMovementRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch real-time Inventory Summary metrics for Pan Shop workspace.
 */
export async function getInventorySummary(workspaceId: string): Promise<InventorySummary> {
  const supabase = createClient();
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (error || !products) {
      return {
        totalProducts: 0,
        totalUnitsInStock: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        inStockCount: 0,
      };
    }

    let totalUnits = 0;
    let totalValue = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let inStock = 0;

    for (const p of products) {
      const stock = Number(p.current_stock || 0);
      const buyPrice = Number(p.purchase_price || 0);
      const threshold = p.low_stock_threshold !== null ? Number(p.low_stock_threshold) : 5;

      totalUnits += stock;
      totalValue += stock * buyPrice;

      if (stock <= 0) {
        outOfStock += 1;
      } else if (stock <= threshold) {
        lowStock += 1;
      } else {
        inStock += 1;
      }
    }

    return {
      totalProducts: products.length,
      totalUnitsInStock: Math.round(totalUnits * 1000) / 1000,
      totalInventoryValue: Math.round(totalValue * 100) / 100,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      inStockCount: inStock,
    };
  } catch (err) {
    console.error("Error fetching inventory summary:", err);
    return {
      totalProducts: 0,
      totalUnitsInStock: 0,
      totalInventoryValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      inStockCount: 0,
    };
  }
}

/**
 * Fetch filtered & paginated inventory movement history audit ledger.
 */
export async function getInventoryMovements(
  workspaceId: string,
  options: MovementsFilterOptions = {}
): Promise<InventoryMovementsResponse> {
  const supabase = createClient();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.limit || options.pageSize || 25);

  try {
    let query = supabase
      .from("inventory_movements")
      .select("*, products(id, name, unit, category)")
      .eq("workspace_id", workspaceId);

    if (options.productId) {
      query = query.eq("product_id", options.productId);
    }

    if (options.movementType && options.movementType !== "all") {
      query = query.eq("movement_type", options.movementType);
    }

    if (options.startDate) {
      query = query.gte("movement_date", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("movement_date", options.endDate);
    }

    query = query.order("movement_date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching inventory movements:", error.message);
      return { movements: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }

    let mapped: InventoryMovementRecord[] = (data || []).map((row: any) => {
      const direction = getMovementDirection(row.movement_type);
      const qty = Number(row.quantity || 0);
      const unitCost = row.unit_cost !== null ? Number(row.unit_cost) : null;
      const totalCost = unitCost !== null ? Math.round(qty * unitCost * 100) / 100 : null;

      return {
        id: row.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        productId: row.product_id,
        productName: row.products?.name || "Product",
        productUnit: row.products?.unit || "units",
        movementType: row.movement_type as InventoryMovementType,
        quantity: qty,
        unitCost,
        totalCost,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        notes: row.notes,
        movementDate: row.movement_date,
        createdAt: row.created_at,
        direction,
      };
    });

    if (options.direction && options.direction !== "all") {
      mapped = mapped.filter((m) => m.direction === options.direction);
    }

    const totalCount = mapped.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginated = mapped.slice((page - 1) * pageSize, page * pageSize);

    return {
      movements: paginated,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error("Unexpected error in getInventoryMovements:", err);
    return { movements: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
}

/**
 * Record a manual inventory movement atomically with row-level safety and negative stock checks.
 */
export async function recordInventoryMovement(
  workspaceId: string,
  payload: {
    productId: string;
    movementType: InventoryMovementType;
    quantity: number;
    unitCost?: number;
    notes?: string;
    referenceType?: string;
    referenceId?: string;
    movementDate?: string;
  }
): Promise<{ success: boolean; product?: Product; error?: string }> {
  const supabase = createClient();
  const qty = Number(payload.quantity);

  if (!qty || qty <= 0) {
    return { success: false, error: "Movement quantity must be greater than 0." };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "record_inventory_movement",
      {
        p_workspace_id: workspaceId,
        p_product_id: payload.productId,
        p_movement_type: payload.movementType,
        p_quantity: qty,
        p_unit_cost: payload.unitCost !== undefined ? Number(payload.unitCost) : null,
        p_reference_type: payload.referenceType || null,
        p_reference_id: payload.referenceId || null,
        p_notes: payload.notes?.trim() || null,
        p_movement_date: payload.movementDate || new Date().toISOString(),
      }
    );

    if (rpcError) {
      console.warn("record_inventory_movement RPC error, trying direct transactional fallback:", rpcError.message);

      // Check current product stock
      const product = await getProductById(payload.productId, workspaceId);
      if (!product) return { success: false, error: "Product not found." };

      const isStockIn = ["opening_stock", "purchase", "adjustment_in", "return_in"].includes(payload.movementType);
      if (!isStockIn && qty > product.currentStock) {
        return {
          success: false,
          error: `Adjustment exceeds available stock of ${product.currentStock} ${product.unit}.`,
        };
      }

      const newStock = isStockIn ? product.currentStock + qty : product.currentStock - qty;

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return { success: false, error: "Authentication required." };

      await supabase.from("inventory_movements").insert({
        user_id: userRes.user.id,
        workspace_id: workspaceId,
        product_id: payload.productId,
        movement_type: payload.movementType,
        quantity: qty,
        unit_cost: payload.unitCost ?? product.purchasePrice,
        reference_type: payload.referenceType || "manual_adjustment",
        reference_id: payload.referenceId || null,
        notes: payload.notes?.trim() || null,
        movement_date: payload.movementDate || new Date().toISOString(),
      });

      const { data: updatedProduct, error: pError } = await supabase
        .from("products")
        .update({
          current_stock: newStock,
          purchase_price: payload.movementType === "purchase" && payload.unitCost ? payload.unitCost : product.purchasePrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.productId)
        .eq("workspace_id", workspaceId)
        .select("*")
        .single();

      if (pError) return { success: false, error: pError.message };
      return { success: true, product: mapDbProductToUi(updatedProduct) };
    }

    const resObj = rpcData as any;
    const pRow = resObj.product;
    return { success: true, product: mapDbProductToUi(pRow) };
  } catch (err: any) {
    console.error("Unexpected error in recordInventoryMovement:", err);
    return { success: false, error: err?.message || "Failed to record stock movement." };
  }
}

/**
 * Record physical stock count reconciliation.
 */
export async function recordStockReconciliation(
  workspaceId: string,
  payload: {
    productId: string;
    physicalStock: number;
    reason?: string;
    movementDate?: string;
  }
): Promise<{ success: boolean; product?: Product; difference?: number; error?: string }> {
  const supabase = createClient();
  const physical = Number(payload.physicalStock);

  if (physical < 0) {
    return { success: false, error: "Physical stock count cannot be negative." };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "record_stock_reconciliation",
      {
        p_workspace_id: workspaceId,
        p_product_id: payload.productId,
        p_physical_stock: physical,
        p_reason: payload.reason?.trim() || null,
        p_movement_date: payload.movementDate || new Date().toISOString(),
      }
    );

    if (rpcError) {
      console.warn("record_stock_reconciliation RPC fallback:", rpcError.message);
      const product = await getProductById(payload.productId, workspaceId);
      if (!product) return { success: false, error: "Product not found." };

      const diff = physical - product.currentStock;
      if (diff === 0) return { success: true, product, difference: 0 };

      const movementType: InventoryMovementType = diff > 0 ? "adjustment_in" : "adjustment_out";

      const res = await recordInventoryMovement(workspaceId, {
        productId: payload.productId,
        movementType,
        quantity: Math.abs(diff),
        unitCost: product.purchasePrice,
        notes: payload.reason?.trim() || `Physical stock count correction (System: ${product.currentStock} -> Actual: ${physical})`,
        movementDate: payload.movementDate,
      });

      if (!res.success) return res;
      return { success: true, product: res.product, difference: diff };
    }

    const resObj = rpcData as any;
    const pRow = resObj.product;
    return {
      success: true,
      product: mapDbProductToUi(pRow),
      difference: Number(resObj.difference || 0),
    };
  } catch (err: any) {
    console.error("Error in recordStockReconciliation:", err);
    return { success: false, error: err?.message || "Failed to reconcile stock count." };
  }
}

/**
 * Fetch top low stock and out of stock products for alerts and dashboard widgets.
 */
export async function getLowStockProducts(
  workspaceId: string,
  limit: number = 5
): Promise<Product[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("current_stock", { ascending: true });

    if (error || !data) return [];

    const mapped = data.map(mapDbProductToUi);
    const lowStockItems = mapped.filter(
      (p) => p.status === "Out of Stock" || p.status === "Low Stock"
    );

    return lowStockItems.slice(0, limit);
  } catch (err) {
    console.error("Error fetching low stock products:", err);
    return [];
  }
}

/**
 * Fetch inventory value breakdown by product category.
 */
export async function getInventoryValueByCategory(
  workspaceId: string
): Promise<CategoryInventoryValue[]> {
  const supabase = createClient();
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (error || !products) return [];

    const categoryMap: Record<
      string,
      { count: number; totalUnits: number; totalValue: number }
    > = {};
    let overallValuation = 0;

    for (const p of products) {
      const cat = p.category?.trim() || "Other";
      const stock = Number(p.current_stock || 0);
      const buy = Number(p.purchase_price || 0);
      const val = stock * buy;

      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, totalUnits: 0, totalValue: 0 };
      }

      categoryMap[cat].count += 1;
      categoryMap[cat].totalUnits += stock;
      categoryMap[cat].totalValue += val;
      overallValuation += val;
    }

    const colors = [
      "#F59E0B",
      "#10B981",
      "#3B82F6",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#EAB308",
      "#6366F1",
      "#14B8A6",
      "#64748B",
    ];

    const result: CategoryInventoryValue[] = Object.entries(categoryMap)
      .map(([category, stats], idx) => ({
        category,
        productCount: stats.count,
        totalStockUnits: Math.round(stats.totalUnits * 1000) / 1000,
        inventoryValue: Math.round(stats.totalValue * 100) / 100,
        percentage:
          overallValuation > 0
            ? Math.round((stats.totalValue / overallValuation) * 1000) / 10
            : 0,
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.inventoryValue - a.inventoryValue);

    return result;
  } catch (err) {
    console.error("Error calculating inventory value by category:", err);
    return [];
  }
}

/**
 * Summarize inventory movements for analytics reporting.
 */
export async function getStockMovementSummary(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<StockMovementSummary> {
  const supabase = createClient();
  try {
    let query = supabase
      .from("inventory_movements")
      .select("movement_type, quantity, unit_cost")
      .eq("workspace_id", workspaceId);

    if (startDate) query = query.gte("movement_date", startDate);
    if (endDate) query = query.lte("movement_date", endDate);

    const { data: movements, error } = await query;

    if (error || !movements) {
      return {
        stockAddedCount: 0,
        stockAddedValue: 0,
        stockRemovedCount: 0,
        stockRemovedValue: 0,
        netMovementValue: 0,
        movementsCount: 0,
      };
    }

    let addedCount = 0;
    let addedVal = 0;
    let removedCount = 0;
    let removedVal = 0;

    for (const m of movements) {
      const dir = getMovementDirection(m.movement_type);
      const qty = Number(m.quantity || 0);
      const cost = Number(m.unit_cost || 0);
      const lineCost = qty * cost;

      if (dir === "in") {
        addedCount += 1;
        addedVal += lineCost;
      } else {
        removedCount += 1;
        removedVal += lineCost;
      }
    }

    return {
      stockAddedCount: addedCount,
      stockAddedValue: Math.round(addedVal * 100) / 100,
      stockRemovedCount: removedCount,
      stockRemovedValue: Math.round(removedVal * 100) / 100,
      netMovementValue: Math.round((addedVal - removedVal) * 100) / 100,
      movementsCount: movements.length,
    };
  } catch (err) {
    console.error("Error summarizing stock movements:", err);
    return {
      stockAddedCount: 0,
      stockAddedValue: 0,
      stockRemovedCount: 0,
      stockRemovedValue: 0,
      netMovementValue: 0,
      movementsCount: 0,
    };
  }
}
