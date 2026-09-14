import { createClient } from "@/lib/supabase/client";
import { PurchaseRecord, PurchasePaymentStatus, SupplierPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";

export interface PurchaseFilterOptions {
  supplierId?: string;
  status?: "All" | "Pending" | "Partially Paid" | "Paid";
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PurchasesListResponse {
  purchases: PurchaseRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalPurchases: number;
    totalPaid: number;
    totalPending: number;
    totalBills: number;
  };
}

export function calculatePurchasePaid(payments: Array<{ amount: number | string | null }>): number {
  return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

export function calculatePurchaseRemaining(totalAmount: number, paidAmount: number): number {
  return Math.max(0, Number(totalAmount || 0) - Number(paidAmount || 0));
}

export function calculatePurchaseStatus(
  totalAmount: number,
  paidAmount: number
): PurchasePaymentStatus {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);

  if (paid >= total && total > 0) {
    return "Paid";
  }
  if (paid > 0) {
    return "Partially Paid";
  }
  return "Pending";
}

/**
 * Fetch filtered & paginated purchases for the Pan Shop workspace with full payment status.
 */
export async function getShopPurchases(
  workspaceId: string,
  options: PurchaseFilterOptions = {}
): Promise<PurchasesListResponse> {
  const supabase = createClient();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 20);

  try {
    let query = supabase
      .from("purchases")
      .select(
        "*, suppliers(id, name, phone), supplier_payments(id, amount, payment_date, payment_method, notes, purchase_id)"
      )
      .eq("workspace_id", workspaceId);

    if (options.supplierId && options.supplierId !== "all") {
      query = query.eq("supplier_id", options.supplierId);
    }

    if (options.startDate) {
      query = query.gte("purchase_date", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("purchase_date", options.endDate);
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`bill_number.ilike.%${term}%,notes.ilike.%${term}%`);
    }

    query = query.order("purchase_date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching purchases:", error.message);
      return {
        purchases: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        summary: { totalPurchases: 0, totalPaid: 0, totalPending: 0, totalBills: 0 },
      };
    }

    let mapped: PurchaseRecord[] = (data || []).map((row: any) => {
      const payments: SupplierPayment[] = (row.supplier_payments || []).map((sp: any) => ({
        id: sp.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        supplierId: sp.supplier_id || row.supplier_id || "",
        purchaseId: row.id,
        date: sp.payment_date,
        amount: Number(sp.amount || 0),
        paymentMethod: (sp.payment_method || "UPI") as PaymentMethod,
        billNumber: row.bill_number || undefined,
        notes: sp.notes || undefined,
      }));

      const totalAmount = Number(row.total_amount || 0);
      const paidAmount = calculatePurchasePaid(payments);
      const remainingAmount = calculatePurchaseRemaining(totalAmount, paidAmount);
      const paymentStatus = calculatePurchaseStatus(totalAmount, paidAmount);

      return {
        id: row.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        supplierId: row.supplier_id || undefined,
        supplierName: row.suppliers?.name || "Unknown Supplier",
        purchaseDate: row.purchase_date,
        billNumber: row.bill_number || "N/A",
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethod: payments[0]?.paymentMethod || "UPI",
        notes: row.notes || undefined,
        payments,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    // If client searched for supplier name
    if (options.search && options.search.trim()) {
      const term = options.search.trim().toLowerCase();
      mapped = mapped.filter(
        (p) =>
          p.billNumber.toLowerCase().includes(term) ||
          p.supplierName.toLowerCase().includes(term) ||
          (p.notes && p.notes.toLowerCase().includes(term))
      );
    }

    // Filter by derived payment status if specified
    if (options.status && options.status !== "All") {
      mapped = mapped.filter((p) => p.paymentStatus === options.status);
    }

    // Summary calculations across matching rows
    const summary = mapped.reduce(
      (acc, curr) => {
        acc.totalPurchases += curr.totalAmount;
        acc.totalPaid += curr.paidAmount;
        acc.totalPending += curr.remainingAmount;
        acc.totalBills += 1;
        return acc;
      },
      { totalPurchases: 0, totalPaid: 0, totalPending: 0, totalBills: 0 }
    );

    const totalCount = mapped.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginated = mapped.slice((page - 1) * pageSize, page * pageSize);

    return {
      purchases: paginated,
      totalCount,
      page,
      pageSize,
      totalPages,
      summary,
    };
  } catch (err) {
    console.error("Unexpected error in getShopPurchases:", err);
    return {
      purchases: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      summary: { totalPurchases: 0, totalPaid: 0, totalPending: 0, totalBills: 0 },
    };
  }
}

/**
 * Fetch a single purchase with all its details and payments.
 */
export async function getShopPurchaseById(
  purchaseId: string,
  workspaceId: string
): Promise<PurchaseRecord | null> {
  const supabase = createClient();
  try {
    const { data: row, error } = await supabase
      .from("purchases")
      .select("*, suppliers(name), supplier_payments(*)")
      .eq("id", purchaseId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !row) return null;

    const payments: SupplierPayment[] = (row.supplier_payments || []).map((sp: any) => ({
      id: sp.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      supplierId: sp.supplier_id || row.supplier_id || "",
      purchaseId: row.id,
      date: sp.payment_date,
      amount: Number(sp.amount || 0),
      paymentMethod: (sp.payment_method || "UPI") as PaymentMethod,
      billNumber: row.bill_number || undefined,
      notes: sp.notes || undefined,
    }));

    const totalAmount = Number(row.total_amount || 0);
    const paidAmount = calculatePurchasePaid(payments);
    const remainingAmount = calculatePurchaseRemaining(totalAmount, paidAmount);
    const paymentStatus = calculatePurchaseStatus(totalAmount, paidAmount);

    return {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      supplierId: row.supplier_id || undefined,
      supplierName: (row.suppliers as any)?.name || "Unknown Supplier",
      purchaseDate: row.purchase_date,
      billNumber: row.bill_number || "N/A",
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus,
      paymentMethod: payments[0]?.paymentMethod || "UPI",
      notes: row.notes || undefined,
      payments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error("Error fetching purchase by ID:", err);
    return null;
  }
}

export interface CreatePurchasePayload {
  supplierId: string;
  billNumber?: string;
  purchaseDate: string;
  totalAmount: number;
  initialPaidAmount?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/**
 * Create a new purchase bill atomically with optional initial payment.
 */
export async function createShopPurchase(
  workspaceId: string,
  payload: CreatePurchasePayload
): Promise<{ success: boolean; purchase?: PurchaseRecord; error?: string }> {
  const supabase = createClient();
  const totalAmount = Number(payload.totalAmount);
  const initialPayment = Math.max(0, Number(payload.initialPaidAmount || 0));

  if (!totalAmount || totalAmount <= 0) {
    return { success: false, error: "Total purchase amount must be greater than 0." };
  }

  if (initialPayment > totalAmount) {
    return {
      success: false,
      error: `Initial payment of ₹${initialPayment} cannot exceed the total bill amount of ₹${totalAmount}.`,
    };
  }

  if (!payload.supplierId) {
    return { success: false, error: "Please select a supplier." };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "create_purchase_with_payment",
      {
        p_workspace_id: workspaceId,
        p_supplier_id: payload.supplierId,
        p_bill_number: payload.billNumber || null,
        p_purchase_date: payload.purchaseDate || toISODateString(),
        p_total_amount: totalAmount,
        p_initial_payment: initialPayment,
        p_payment_method: payload.paymentMethod || "UPI",
        p_notes: payload.notes || null,
      }
    );

    if (rpcError) {
      console.warn("create_purchase_with_payment RPC error, fallback to direct insert:", rpcError.message);
      // Direct insert fallback
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return { success: false, error: "Authentication required." };

      const { data: purchaseRow, error: pError } = await supabase
        .from("purchases")
        .insert({
          user_id: userRes.user.id,
          workspace_id: workspaceId,
          supplier_id: payload.supplierId,
          bill_number: payload.billNumber?.trim() || null,
          purchase_date: payload.purchaseDate || toISODateString(),
          total_amount: totalAmount,
          notes: payload.notes?.trim() || null,
        })
        .select("*, suppliers(name)")
        .single();

      if (pError) return { success: false, error: pError.message };

      if (initialPayment > 0) {
        await supabase.from("supplier_payments").insert({
          user_id: userRes.user.id,
          workspace_id: workspaceId,
          supplier_id: payload.supplierId,
          purchase_id: purchaseRow.id,
          amount: initialPayment,
          payment_date: payload.purchaseDate || toISODateString(),
          payment_method: payload.paymentMethod || "UPI",
          notes: `Initial payment for bill ${purchaseRow.bill_number || "N/A"}`,
        });
      }

      const created = await getShopPurchaseById(purchaseRow.id, workspaceId);
      return { success: true, purchase: created || undefined };
    }

    const resObj = rpcData as any;
    const pRow = resObj.purchase;
    const created = await getShopPurchaseById(pRow.id, workspaceId);

    return { success: true, purchase: created || undefined };
  } catch (err: any) {
    console.error("Unexpected error in createShopPurchase:", err);
    return { success: false, error: err?.message || "Failed to create purchase." };
  }
}

/**
 * Update an existing purchase. Enforces totalAmount >= payments already recorded.
 */
export async function updateShopPurchase(
  purchaseId: string,
  workspaceId: string,
  payload: {
    supplierId?: string;
    billNumber?: string;
    purchaseDate?: string;
    totalAmount?: number;
    notes?: string;
  }
): Promise<{ success: boolean; purchase?: PurchaseRecord; error?: string }> {
  const supabase = createClient();
  try {
    // 1. Fetch current purchase with its payments
    const current = await getShopPurchaseById(purchaseId, workspaceId);
    if (!current) {
      return { success: false, error: "Purchase record not found." };
    }

    const newTotal = payload.totalAmount !== undefined ? Number(payload.totalAmount) : current.totalAmount;

    if (newTotal <= 0) {
      return { success: false, error: "Purchase amount must be greater than 0." };
    }

    if (newTotal < current.paidAmount) {
      return {
        success: false,
        error: `New purchase total (₹${newTotal}) cannot be lower than payments already recorded (₹${current.paidAmount}).`,
      };
    }

    const updateObj: any = {};
    if (payload.supplierId) updateObj.supplier_id = payload.supplierId;
    if (payload.billNumber !== undefined) updateObj.bill_number = payload.billNumber.trim() || null;
    if (payload.purchaseDate) updateObj.purchase_date = payload.purchaseDate;
    if (payload.totalAmount !== undefined) updateObj.total_amount = newTotal;
    if (payload.notes !== undefined) updateObj.notes = payload.notes.trim() || null;

    const { error } = await supabase
      .from("purchases")
      .update(updateObj)
      .eq("id", purchaseId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    const updated = await getShopPurchaseById(purchaseId, workspaceId);
    return { success: true, purchase: updated || undefined };
  } catch (err: any) {
    console.error("Error updating shop purchase:", err);
    return { success: false, error: err?.message || "Failed to update purchase." };
  }
}

/**
 * Delete a purchase. Warns or removes linked payments.
 */
export async function deleteShopPurchase(
  purchaseId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    // Delete payments first (or let FK cascade handle it)
    await supabase
      .from("supplier_payments")
      .delete()
      .eq("purchase_id", purchaseId)
      .eq("workspace_id", workspaceId);

    const { error } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchaseId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error deleting purchase:", err);
    return { success: false, error: err?.message || "Failed to delete purchase." };
  }
}
