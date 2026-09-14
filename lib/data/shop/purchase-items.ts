import { createClient } from "@/lib/supabase/client";
import { PurchaseItemRecord, PurchaseItemInput } from "@/types/inventory";
import { getProductById } from "./products";
import { getShopPurchaseById } from "./purchases";

export interface PurchaseItemsSummary {
  itemsCount: number;
  itemsTotal: number;
  billTotal: number;
  difference: number;
  hasDiscrepancy: boolean;
}

export function mapDbPurchaseItemToUi(row: any): PurchaseItemRecord {
  const quantity = Number(row.quantity || 0);
  const unitCost = Number(row.unit_cost || 0);
  const lineTotal = Math.round(quantity * unitCost * 100) / 100;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    purchaseId: row.purchase_id,
    productId: row.product_id,
    productName: row.products?.name || "Product",
    productUnit: row.products?.unit || "Piece",
    category: row.products?.category || undefined,
    quantity,
    unitCost,
    lineTotal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch all purchase line items attached to a specific wholesale purchase bill.
 */
export async function getPurchaseItems(
  purchaseId: string,
  workspaceId: string
): Promise<PurchaseItemRecord[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("purchase_items")
      .select("*, products(id, name, unit, category, current_stock)")
      .eq("purchase_id", purchaseId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching purchase items:", error.message);
      return [];
    }

    return (data || []).map(mapDbPurchaseItemToUi);
  } catch (err) {
    console.error("Unexpected error in getPurchaseItems:", err);
    return [];
  }
}

/**
 * Fetch purchase items summary comparison with parent bill total.
 */
export async function getPurchaseItemsSummary(
  purchaseId: string,
  workspaceId: string
): Promise<PurchaseItemsSummary> {
  const [items, purchase] = await Promise.all([
    getPurchaseItems(purchaseId, workspaceId),
    getShopPurchaseById(purchaseId, workspaceId),
  ]);

  const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const billTotal = purchase ? purchase.totalAmount : 0;
  const difference = Math.round((billTotal - itemsTotal) * 100) / 100;

  return {
    itemsCount: items.length,
    itemsTotal: Math.round(itemsTotal * 100) / 100,
    billTotal,
    difference,
    hasDiscrepancy: Math.abs(difference) > 0.01,
  };
}

/**
 * Add or update a purchase line item atomically with stock adjustment.
 */
export async function savePurchaseItem(
  workspaceId: string,
  payload: PurchaseItemInput & { purchaseId: string }
): Promise<{ success: boolean; item?: PurchaseItemRecord; error?: string }> {
  const supabase = createClient();
  const qty = Number(payload.quantity);
  const cost = Number(payload.unitCost);

  if (!qty || qty <= 0) {
    return { success: false, error: "Quantity must be greater than 0." };
  }
  if (cost < 0) {
    return { success: false, error: "Unit cost cannot be negative." };
  }
  if (!payload.productId) {
    return { success: false, error: "Please select a product." };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "save_purchase_item_with_inventory",
      {
        p_workspace_id: workspaceId,
        p_purchase_id: payload.purchaseId,
        p_product_id: payload.productId,
        p_quantity: qty,
        p_unit_cost: cost,
        p_item_id: payload.itemId || null,
      }
    );

    if (rpcError) {
      console.warn("save_purchase_item_with_inventory RPC error, trying direct fallback:", rpcError.message);

      const product = await getProductById(payload.productId, workspaceId);
      if (!product) return { success: false, error: "Product not found." };

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return { success: false, error: "Authentication required." };

      if (!payload.itemId) {
        // Insert item
        const { data: itemRow, error: iErr } = await supabase
          .from("purchase_items")
          .insert({
            user_id: userRes.user.id,
            workspace_id: workspaceId,
            purchase_id: payload.purchaseId,
            product_id: payload.productId,
            quantity: qty,
            unit_cost: cost,
          })
          .select("*, products(name, unit, category)")
          .single();

        if (iErr) return { success: false, error: iErr.message };

        // Insert movement
        await supabase.from("inventory_movements").insert({
          user_id: userRes.user.id,
          workspace_id: workspaceId,
          product_id: payload.productId,
          movement_type: "purchase",
          quantity: qty,
          unit_cost: cost,
          reference_type: "purchase_item",
          reference_id: itemRow.id,
          notes: "Purchase line item",
          movement_date: new Date().toISOString(),
        });

        // Update product stock
        await supabase
          .from("products")
          .update({
            current_stock: product.currentStock + qty,
            purchase_price: cost > 0 ? cost : product.purchasePrice,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.productId);

        return { success: true, item: mapDbPurchaseItemToUi(itemRow) };
      } else {
        // Update item
        const { data: existing } = await supabase
          .from("purchase_items")
          .select("*")
          .eq("id", payload.itemId)
          .single();

        if (!existing) return { success: false, error: "Purchase item not found." };
        const delta = qty - Number(existing.quantity || 0);

        if (delta < 0 && (product.currentStock + delta) < 0) {
          return {
            success: false,
            error: `Cannot reduce quantity by ${Math.abs(delta)}: only ${product.currentStock} units in stock.`,
          };
        }

        const { data: updatedItem, error: uErr } = await supabase
          .from("purchase_items")
          .update({
            quantity: qty,
            unit_cost: cost,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.itemId)
          .select("*, products(name, unit, category)")
          .single();

        if (uErr) return { success: false, error: uErr.message };

        // Update movement
        await supabase
          .from("inventory_movements")
          .update({ quantity: qty, unit_cost: cost })
          .eq("reference_type", "purchase_item")
          .eq("reference_id", payload.itemId);

        // Update product stock
        await supabase
          .from("products")
          .update({
            current_stock: product.currentStock + delta,
            purchase_price: cost > 0 ? cost : product.purchasePrice,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.productId);

        return { success: true, item: mapDbPurchaseItemToUi(updatedItem) };
      }
    }

    const resObj = rpcData as any;
    const itemRow = resObj.item;
    const product = await getProductById(payload.productId, workspaceId);

    const mappedItem: PurchaseItemRecord = {
      id: itemRow.id,
      workspaceId: itemRow.workspace_id,
      userId: itemRow.user_id,
      purchaseId: itemRow.purchase_id,
      productId: itemRow.product_id,
      productName: product?.name || "Product",
      productUnit: product?.unit || "Piece",
      category: product?.category || undefined,
      quantity: Number(itemRow.quantity || 0),
      unitCost: Number(itemRow.unit_cost || 0),
      lineTotal: Math.round(Number(itemRow.quantity || 0) * Number(itemRow.unit_cost || 0) * 100) / 100,
      createdAt: itemRow.created_at,
      updatedAt: itemRow.updated_at,
    };

    return { success: true, item: mappedItem };
  } catch (err: any) {
    console.error("Unexpected error in savePurchaseItem:", err);
    return { success: false, error: err?.message || "Failed to save purchase line item." };
  }
}

/**
 * Delete a purchase line item and safely reverse the inventory stock.
 */
export async function deletePurchaseItem(
  workspaceId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "delete_purchase_item_with_inventory",
      {
        p_workspace_id: workspaceId,
        p_item_id: itemId,
      }
    );

    if (rpcError) {
      console.warn("delete_purchase_item_with_inventory RPC error, trying direct fallback:", rpcError.message);

      const { data: item } = await supabase
        .from("purchase_items")
        .select("*")
        .eq("id", itemId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!item) return { success: false, error: "Purchase item not found." };

      const product = await getProductById(item.product_id, workspaceId);
      if (!product) return { success: false, error: "Associated product not found." };

      if (product.currentStock < item.quantity) {
        return {
          success: false,
          error: `Cannot remove item (${item.quantity} units): available stock is only ${product.currentStock} units.`,
        };
      }

      await supabase
        .from("inventory_movements")
        .delete()
        .eq("reference_type", "purchase_item")
        .eq("reference_id", itemId);

      const { error: dErr } = await supabase
        .from("purchase_items")
        .delete()
        .eq("id", itemId)
        .eq("workspace_id", workspaceId);

      if (dErr) return { success: false, error: dErr.message };

      await supabase
        .from("products")
        .update({
          current_stock: product.currentStock - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.product_id);

      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error deleting purchase item:", err);
    return { success: false, error: err?.message || "Failed to remove purchase item." };
  }
}
