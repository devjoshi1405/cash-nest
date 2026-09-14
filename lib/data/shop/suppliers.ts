import { createClient } from "@/lib/supabase/client";
import { Supplier, SupplierPayment, PurchaseRecord } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";

export interface SupplierSummary {
  totalProcurement: number;
  totalPaid: number;
  totalPending: number;
  supplierCount: number;
  activeCount: number;
}

export interface GetSuppliersOptions {
  includeArchived?: boolean;
  search?: string;
  sortBy?: "name" | "pending" | "purchases" | "recent";
}

/**
 * Fetch all suppliers for a workspace with computed live balances (purchases, paid, pending).
 */
export async function getShopSuppliers(
  workspaceId: string,
  options: GetSuppliersOptions = {}
): Promise<Supplier[]> {
  const supabase = createClient();
  try {
    let query = supabase
      .from("suppliers")
      .select("*, purchases(id, total_amount, purchase_date), supplier_payments(id, amount, payment_date, payment_method, notes, purchase_id)")
      .eq("workspace_id", workspaceId);

    if (!options.includeArchived) {
      query = query.neq("is_active", false);
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching shop suppliers:", error.message);
      return [];
    }

    const suppliersList: Supplier[] = (data || []).map((sup: any) => {
      const purchases = sup.purchases || [];
      const payments = sup.supplier_payments || [];

      const totalPurchases = purchases.reduce(
        (sum: number, p: any) => sum + Number(p.total_amount || 0),
        0
      );
      const totalPaid = payments.reduce(
        (sum: number, sp: any) => sum + Number(sp.amount || 0),
        0
      );
      const pendingAmount = Math.max(0, totalPurchases - totalPaid);

      // Find last purchase date
      let lastPurchaseDate = sup.created_at;
      if (purchases.length > 0) {
        const sortedPurchases = [...purchases].sort(
          (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
        );
        lastPurchaseDate = sortedPurchases[0]?.purchase_date || sup.created_at;
      }

      // Map payment history sorted newest first
      const paymentHistory: SupplierPayment[] = [...payments]
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
        .map((p: any) => ({
          id: p.id,
          workspaceId: sup.workspace_id,
          userId: sup.user_id,
          supplierId: sup.id,
          purchaseId: p.purchase_id,
          date: p.payment_date,
          amount: Number(p.amount || 0),
          paymentMethod: (p.payment_method || "UPI") as PaymentMethod,
          notes: p.notes,
        }));

      return {
        id: sup.id,
        workspaceId: sup.workspace_id,
        userId: sup.user_id,
        name: sup.name,
        phone: sup.phone || "",
        email: sup.email || undefined,
        address: sup.address || undefined,
        notes: sup.notes || undefined,
        category: "Wholesale Vendor",
        isActive: sup.is_active !== false,
        totalPurchases,
        totalPaid,
        pendingAmount,
        lastPurchaseDate,
        purchasesCount: purchases.length,
        paymentHistory,
        createdAt: sup.created_at,
        updatedAt: sup.updated_at,
      };
    });

    // Client-side sorting
    if (options.sortBy === "pending") {
      suppliersList.sort((a, b) => b.pendingAmount - a.pendingAmount);
    } else if (options.sortBy === "purchases") {
      suppliersList.sort((a, b) => b.totalPurchases - a.totalPurchases);
    } else if (options.sortBy === "recent") {
      suppliersList.sort(
        (a, b) => new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime()
      );
    } else {
      suppliersList.sort((a, b) => a.name.localeCompare(b.name));
    }

    return suppliersList;
  } catch (err) {
    console.error("Unexpected error in getShopSuppliers:", err);
    return [];
  }
}

/**
 * Fetch a single supplier by ID with full purchase and payment records.
 */
export async function getShopSupplierById(
  supplierId: string,
  workspaceId: string
): Promise<{ supplier: Supplier | null; purchases: PurchaseRecord[] }> {
  const supabase = createClient();
  try {
    const { data: sup, error } = await supabase
      .from("suppliers")
      .select("*, purchases(*), supplier_payments(*)")
      .eq("id", supplierId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !sup) {
      return { supplier: null, purchases: [] };
    }

    const rawPurchases = sup.purchases || [];
    const rawPayments = sup.supplier_payments || [];

    const totalPurchases = rawPurchases.reduce(
      (sum: number, p: any) => sum + Number(p.total_amount || 0),
      0
    );
    const totalPaid = rawPayments.reduce(
      (sum: number, sp: any) => sum + Number(sp.amount || 0),
      0
    );
    const pendingAmount = Math.max(0, totalPurchases - totalPaid);

    let lastPurchaseDate = sup.created_at;
    if (rawPurchases.length > 0) {
      const sorted = [...rawPurchases].sort(
        (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
      );
      lastPurchaseDate = sorted[0]?.purchase_date || sup.created_at;
    }

    const paymentHistory: SupplierPayment[] = [...rawPayments]
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .map((p: any) => ({
        id: p.id,
        workspaceId: sup.workspace_id,
        userId: sup.user_id,
        supplierId: sup.id,
        purchaseId: p.purchase_id,
        date: p.payment_date,
        amount: Number(p.amount || 0),
        paymentMethod: (p.payment_method || "UPI") as PaymentMethod,
        notes: p.notes,
      }));

    const mappedPurchases: PurchaseRecord[] = rawPurchases
      .sort((a: any, b: any) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
      .map((p: any) => {
        const linkedPayments = rawPayments.filter((sp: any) => sp.purchase_id === p.id);
        const paidForBill = linkedPayments.reduce(
          (sum: number, sp: any) => sum + Number(sp.amount || 0),
          0
        );
        const billTotal = Number(p.total_amount || 0);
        const remaining = Math.max(0, billTotal - paidForBill);

        let status: "Paid" | "Partially Paid" | "Pending" = "Pending";
        if (paidForBill >= billTotal && billTotal > 0) {
          status = "Paid";
        } else if (paidForBill > 0) {
          status = "Partially Paid";
        }

        return {
          id: p.id,
          workspaceId: p.workspace_id,
          userId: p.user_id,
          supplierId: p.supplier_id,
          supplierName: sup.name,
          purchaseDate: p.purchase_date,
          billNumber: p.bill_number || "N/A",
          totalAmount: billTotal,
          paidAmount: paidForBill,
          remainingAmount: remaining,
          paymentStatus: status,
          paymentMethod: "UPI",
          notes: p.notes,
        };
      });

    const supplier: Supplier = {
      id: sup.id,
      workspaceId: sup.workspace_id,
      userId: sup.user_id,
      name: sup.name,
      phone: sup.phone || "",
      email: sup.email || undefined,
      address: sup.address || undefined,
      notes: sup.notes || undefined,
      category: "Wholesale Vendor",
      isActive: sup.is_active !== false,
      totalPurchases,
      totalPaid,
      pendingAmount,
      lastPurchaseDate,
      purchasesCount: rawPurchases.length,
      paymentHistory,
      createdAt: sup.created_at,
      updatedAt: sup.updated_at,
    };

    return { supplier, purchases: mappedPurchases };
  } catch (err) {
    console.error("Unexpected error in getShopSupplierById:", err);
    return { supplier: null, purchases: [] };
  }
}

/**
 * Check if a normalized supplier name already exists in this workspace.
 */
export async function checkDuplicateSupplierName(
  workspaceId: string,
  name: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; existingName?: string }> {
  const supabase = createClient();
  const normalized = name.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("workspace_id", workspaceId);

    if (error || !data) return { isDuplicate: false };

    const match = data.find(
      (s) => s.id !== excludeId && s.name.trim().toLowerCase() === normalized
    );

    if (match) {
      return { isDuplicate: true, existingName: match.name };
    }
    return { isDuplicate: false };
  } catch (err) {
    return { isDuplicate: false };
  }
}

/**
 * Create a new supplier with duplicate name detection and workspace validation.
 */
export async function createShopSupplier(
  workspaceId: string,
  data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }
): Promise<{ success: boolean; supplier?: Supplier; warning?: string; error?: string }> {
  const supabase = createClient();
  const trimmedName = data.name.trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Supplier name must be at least 2 characters long." };
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    // Check duplicate name warning
    const dupCheck = await checkDuplicateSupplierName(workspaceId, trimmedName);
    let warning: string | undefined;
    if (dupCheck.isDuplicate) {
      warning = `A supplier named "${dupCheck.existingName}" already exists in your workspace.`;
    }

    const { data: newRow, error: insertError } = await supabase
      .from("suppliers")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        name: trimmedName,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        is_active: true,
      })
      .select("*")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    const supplier: Supplier = {
      id: newRow.id,
      workspaceId: newRow.workspace_id,
      userId: newRow.user_id,
      name: newRow.name,
      phone: newRow.phone || "",
      email: newRow.email || undefined,
      address: newRow.address || undefined,
      notes: newRow.notes || undefined,
      category: "Wholesale Vendor",
      isActive: true,
      totalPurchases: 0,
      totalPaid: 0,
      pendingAmount: 0,
      lastPurchaseDate: toISODateString(),
      purchasesCount: 0,
      paymentHistory: [],
      createdAt: newRow.created_at,
      updatedAt: newRow.updated_at,
    };

    return { success: true, supplier, warning };
  } catch (err: any) {
    console.error("Unexpected error in createShopSupplier:", err);
    return { success: false, error: err?.message || "Failed to create supplier." };
  }
}

/**
 * Update an existing supplier.
 */
export async function updateShopSupplier(
  supplierId: string,
  workspaceId: string,
  data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }
): Promise<{ success: boolean; supplier?: Supplier; warning?: string; error?: string }> {
  const supabase = createClient();
  const trimmedName = data.name.trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Supplier name must be at least 2 characters long." };
  }

  try {
    const dupCheck = await checkDuplicateSupplierName(workspaceId, trimmedName, supplierId);
    let warning: string | undefined;
    if (dupCheck.isDuplicate) {
      warning = `Another supplier named "${dupCheck.existingName}" already exists.`;
    }

    const { data: updatedRow, error } = await supabase
      .from("suppliers")
      .update({
        name: trimmedName,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .eq("id", supplierId)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const res = await getShopSupplierById(supplierId, workspaceId);

    return { success: true, supplier: res.supplier || undefined, warning };
  } catch (err: any) {
    console.error("Error updating shop supplier:", err);
    return { success: false, error: err?.message || "Failed to update supplier." };
  }
}

/**
 * Archive or delete supplier safely.
 * If purchases or payments exist, soft-archive (is_active = false) to protect financial history.
 */
export async function deleteShopSupplier(
  supplierId: string,
  workspaceId: string
): Promise<{ success: boolean; archived?: boolean; error?: string }> {
  const supabase = createClient();
  try {
    // Check if supplier has purchases or payments
    const [purchasesCountRes, paymentsCountRes] = await Promise.all([
      supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId),
      supabase
        .from("supplier_payments")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId),
    ]);

    const hasHistory =
      (purchasesCountRes.count && purchasesCountRes.count > 0) ||
      (paymentsCountRes.count && paymentsCountRes.count > 0);

    if (hasHistory) {
      // Soft-archive
      const { error } = await supabase
        .from("suppliers")
        .update({ is_active: false })
        .eq("id", supplierId)
        .eq("workspace_id", workspaceId);

      if (error) return { success: false, error: error.message };
      return { success: true, archived: true };
    } else {
      // Hard delete
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplierId)
        .eq("workspace_id", workspaceId);

      if (error) {
        // Fallback to soft archive if FK constraint is tripped
        await supabase
          .from("suppliers")
          .update({ is_active: false })
          .eq("id", supplierId)
          .eq("workspace_id", workspaceId);
        return { success: true, archived: true };
      }
      return { success: true, archived: false };
    }
  } catch (err: any) {
    console.error("Error deleting supplier:", err);
    return { success: false, error: err?.message || "Failed to delete supplier." };
  }
}

/**
 * Calculate workspace supplier summary metrics.
 */
export async function getShopSupplierSummary(workspaceId: string): Promise<SupplierSummary> {
  const suppliers = await getShopSuppliers(workspaceId, { includeArchived: true });

  const totalProcurement = suppliers.reduce((acc, s) => acc + s.totalPurchases, 0);
  const totalPaid = suppliers.reduce((acc, s) => acc + s.totalPaid, 0);
  const totalPending = suppliers.reduce((acc, s) => acc + s.pendingAmount, 0);
  const activeCount = suppliers.filter((s) => s.isActive).length;

  return {
    totalProcurement,
    totalPaid,
    totalPending,
    supplierCount: suppliers.length,
    activeCount,
  };
}
