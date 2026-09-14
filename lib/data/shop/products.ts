import { createClient } from "@/lib/supabase/client";
import {
  Product,
  ProductInput,
  StockStatus,
  calculateInventoryValue,
  calculateUnitMargin,
  calculateMarginPercentage,
  getStockStatus,
} from "@/types/inventory";

export interface ProductsFilterOptions {
  search?: string;
  category?: string;
  status?: "All" | "In Stock" | "Low Stock" | "Out of Stock" | "Archived";
  sortBy?:
    | "name-asc"
    | "name-desc"
    | "stock-desc"
    | "stock-asc"
    | "value-desc"
    | "value-asc"
    | "low-stock-first"
    | "updated-desc";
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export interface ProductsListResponse {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
}

export function mapDbProductToUi(row: any): Product {
  const purchasePrice = Number(row.purchase_price || 0);
  const sellingPrice = Number(row.selling_price || 0);
  const currentStock = Number(row.current_stock || 0);
  const lowStockThreshold = row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : 5;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    name: row.name,
    category: row.category || "Other",
    unit: row.unit || "Piece",
    purchasePrice,
    sellingPrice,
    currentStock,
    lowStockThreshold,
    isActive: row.is_active ?? true,
    inventoryValue: calculateInventoryValue(currentStock, purchasePrice),
    unitMargin: calculateUnitMargin(sellingPrice, purchasePrice),
    marginPercentage: calculateMarginPercentage(sellingPrice, purchasePrice),
    status: getStockStatus(currentStock, lowStockThreshold),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch filtered & paginated products for the Pan Shop workspace.
 */
export async function getProducts(
  workspaceId: string,
  options: ProductsFilterOptions = {}
): Promise<ProductsListResponse> {
  const supabase = createClient();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 50);

  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId);

    // Archive filter handling
    if (options.status === "Archived") {
      query = query.eq("is_active", false);
    } else if (!options.includeArchived) {
      query = query.eq("is_active", true);
    }

    // Category filter
    if (options.category && options.category !== "all") {
      query = query.eq("category", options.category);
    }

    // Search filter (name or category)
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%`);
    }

    // Sorting at DB level where possible
    if (options.sortBy === "name-asc") {
      query = query.order("name", { ascending: true });
    } else if (options.sortBy === "name-desc") {
      query = query.order("name", { ascending: false });
    } else if (options.sortBy === "stock-desc") {
      query = query.order("current_stock", { ascending: false });
    } else if (options.sortBy === "stock-asc") {
      query = query.order("current_stock", { ascending: true });
    } else if (options.sortBy === "updated-desc") {
      query = query.order("updated_at", { ascending: false });
    } else {
      query = query.order("name", { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching products:", error.message);
      return {
        products: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        categories: [],
      };
    }

    let mapped: Product[] = (data || []).map(mapDbProductToUi);

    // Extract all unique categories present in this shop
    const categoriesSet = new Set<string>();
    mapped.forEach((p) => {
      if (p.category) categoriesSet.add(p.category);
    });
    const categories = Array.from(categoriesSet).sort();

    // Client-side filtering for derived status
    if (options.status && options.status !== "All" && options.status !== "Archived") {
      mapped = mapped.filter((p) => p.status === options.status);
    }

    // Client-side sorting for computed fields
    if (options.sortBy === "value-desc") {
      mapped.sort((a, b) => b.inventoryValue - a.inventoryValue);
    } else if (options.sortBy === "value-asc") {
      mapped.sort((a, b) => a.inventoryValue - b.inventoryValue);
    } else if (options.sortBy === "low-stock-first") {
      mapped.sort((a, b) => {
        const orderMap: Record<StockStatus, number> = {
          "Out of Stock": 0,
          "Low Stock": 1,
          "In Stock": 2,
        };
        const orderDiff = orderMap[a.status] - orderMap[b.status];
        if (orderDiff !== 0) return orderDiff;
        return a.currentStock - b.currentStock;
      });
    }

    const totalCount = mapped.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginated = mapped.slice((page - 1) * pageSize, page * pageSize);

    return {
      products: paginated,
      totalCount,
      page,
      pageSize,
      totalPages,
      categories,
    };
  } catch (err) {
    console.error("Unexpected error in getProducts:", err);
    return {
      products: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      categories: [],
    };
  }
}

/**
 * Fetch a single product by ID with full details.
 */
export async function getProductById(
  productId: string,
  workspaceId: string
): Promise<Product | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !data) return null;
    return mapDbProductToUi(data);
  } catch (err) {
    console.error("Error fetching product by ID:", err);
    return null;
  }
}

/**
 * Create a new product atomically with optional opening stock.
 */
export async function createProduct(
  workspaceId: string,
  input: ProductInput
): Promise<{ success: boolean; product?: Product; error?: string }> {
  const supabase = createClient();

  const trimmedName = input.name?.trim() || "";
  if (!trimmedName) {
    return { success: false, error: "Product name is required." };
  }

  const purchasePrice = Number(input.purchasePrice ?? 0);
  const sellingPrice = Number(input.sellingPrice ?? 0);
  const openingStock = Number(input.openingStock ?? 0);
  const lowStockThreshold = Number(input.lowStockThreshold ?? 5);

  if (purchasePrice < 0) return { success: false, error: "Purchase price cannot be negative." };
  if (sellingPrice < 0) return { success: false, error: "Selling price cannot be negative." };
  if (openingStock < 0) return { success: false, error: "Opening stock cannot be negative." };
  if (lowStockThreshold < 0) return { success: false, error: "Low stock threshold cannot be negative." };

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "create_product_with_opening_stock",
      {
        p_workspace_id: workspaceId,
        p_name: trimmedName,
        p_category: input.category?.trim() || null,
        p_unit: input.unit?.trim() || "Piece",
        p_purchase_price: purchasePrice,
        p_selling_price: sellingPrice,
        p_opening_stock: openingStock,
        p_low_stock_threshold: lowStockThreshold,
        p_notes: input.notes?.trim() || null,
      }
    );

    if (rpcError) {
      console.warn("create_product_with_opening_stock RPC error, attempting fallback:", rpcError.message);

      // Duplicate name error message
      if (rpcError.message.includes("already exists") || rpcError.message.includes("idx_products_ws_normalized_name")) {
        return { success: false, error: `A product with the name "${trimmedName}" already exists in this shop.` };
      }

      // Fallback direct insert
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return { success: false, error: "Authentication required." };

      const { data: pRow, error: pError } = await supabase
        .from("products")
        .insert({
          user_id: userRes.user.id,
          workspace_id: workspaceId,
          name: trimmedName,
          category: input.category?.trim() || null,
          unit: input.unit?.trim() || "Piece",
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          current_stock: openingStock,
          low_stock_threshold: lowStockThreshold,
          is_active: true,
        })
        .select("*")
        .single();

      if (pError) {
        if (pError.message.includes("duplicate") || pError.message.includes("unique")) {
          return { success: false, error: `A product with the name "${trimmedName}" already exists in this shop.` };
        }
        return { success: false, error: pError.message };
      }

      if (openingStock > 0) {
        await supabase.from("inventory_movements").insert({
          user_id: userRes.user.id,
          workspace_id: workspaceId,
          product_id: pRow.id,
          movement_type: "opening_stock",
          quantity: openingStock,
          unit_cost: purchasePrice,
          reference_type: "opening_stock",
          reference_id: pRow.id,
          notes: input.notes?.trim() || "Opening stock count",
          movement_date: new Date().toISOString(),
        });
      }

      return { success: true, product: mapDbProductToUi(pRow) };
    }

    const resObj = rpcData as any;
    const pRow = resObj.product;
    return { success: true, product: mapDbProductToUi(pRow) };
  } catch (err: any) {
    console.error("Unexpected error creating product:", err);
    return { success: false, error: err?.message || "Failed to create product." };
  }
}

/**
 * Update an existing product's details, pricing, and thresholds.
 * Note: Does not mutate current stock directly (stock must go through movements/reconciliation).
 */
export async function updateProduct(
  productId: string,
  workspaceId: string,
  input: Partial<ProductInput>
): Promise<{ success: boolean; product?: Product; error?: string }> {
  const supabase = createClient();
  try {
    const updateObj: any = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) return { success: false, error: "Product name cannot be empty." };
      updateObj.name = trimmed;
    }
    if (input.category !== undefined) {
      updateObj.category = input.category.trim() || null;
    }
    if (input.unit !== undefined) {
      updateObj.unit = input.unit.trim() || "Piece";
    }
    if (input.purchasePrice !== undefined) {
      const pPrice = Number(input.purchasePrice);
      if (pPrice < 0) return { success: false, error: "Purchase price cannot be negative." };
      updateObj.purchase_price = pPrice;
    }
    if (input.sellingPrice !== undefined) {
      const sPrice = Number(input.sellingPrice);
      if (sPrice < 0) return { success: false, error: "Selling price cannot be negative." };
      updateObj.selling_price = sPrice;
    }
    if (input.lowStockThreshold !== undefined) {
      const threshold = Number(input.lowStockThreshold);
      if (threshold < 0) return { success: false, error: "Low stock threshold cannot be negative." };
      updateObj.low_stock_threshold = threshold;
    }

    const { data, error } = await supabase
      .from("products")
      .update(updateObj)
      .eq("id", productId)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        return { success: false, error: `A product with the name "${input.name}" already exists.` };
      }
      return { success: false, error: error.message };
    }

    return { success: true, product: mapDbProductToUi(data) };
  } catch (err: any) {
    console.error("Error updating product:", err);
    return { success: false, error: err?.message || "Failed to update product." };
  }
}

/**
 * Soft-archive a product (is_active = false) to preserve movement history.
 */
export async function archiveProduct(
  productId: string,
  workspaceId: string
): Promise<{ success: boolean; hasRemainingStock?: boolean; stockUnits?: number; error?: string }> {
  const supabase = createClient();
  try {
    const current = await getProductById(productId, workspaceId);
    if (!current) return { success: false, error: "Product not found." };

    const { error } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", productId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      hasRemainingStock: current.currentStock > 0,
      stockUnits: current.currentStock,
    };
  } catch (err: any) {
    console.error("Error archiving product:", err);
    return { success: false, error: err?.message || "Failed to archive product." };
  }
}

/**
 * Restore an archived product (is_active = true).
 */
export async function restoreProduct(
  productId: string,
  workspaceId: string
): Promise<{ success: boolean; product?: Product; error?: string }> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", productId)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, product: mapDbProductToUi(data) };
  } catch (err: any) {
    console.error("Error restoring product:", err);
    return { success: false, error: err?.message || "Failed to restore product." };
  }
}
