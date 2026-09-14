import { createClient } from "@/lib/supabase/client";
import { Purchase, SupplierPayment } from "@/lib/supabase/types";

export interface PurchaseWithPayments extends Purchase {
  supplier_name?: string;
  payments?: SupplierPayment[];
  paid_amount?: number;
  pending_amount?: number;
}

interface PurchaseJoinedRow extends Purchase {
  suppliers?: { name: string } | null;
  supplier_payments?: SupplierPayment[];
}

export async function getPurchases(workspaceId: string): Promise<PurchaseWithPayments[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("purchases")
      .select("*, suppliers(name), supplier_payments(*)")
      .eq("workspace_id", workspaceId)
      .order("purchase_date", { ascending: false });

    if (error) {
      console.error("Error fetching purchases:", error.message);
      return [];
    }

    const rows = (data || []) as unknown as PurchaseJoinedRow[];

    return rows.map((p: PurchaseJoinedRow) => {
      const payments: SupplierPayment[] = p.supplier_payments || [];
      const paid_amount = payments.reduce((sum, sp) => sum + Number(sp.amount || 0), 0);
      const pending_amount = Math.max(0, Number(p.total_amount || 0) - paid_amount);

      return {
        ...p,
        supplier_name: p.suppliers?.name || "Unknown Supplier",
        payments,
        paid_amount,
        pending_amount,
      };
    });
  } catch (err) {
    console.error("Unexpected error fetching purchases:", err);
    return [];
  }
}
