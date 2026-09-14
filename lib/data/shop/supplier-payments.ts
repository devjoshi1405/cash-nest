import { createClient } from "@/lib/supabase/client";
import { SupplierPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";

export interface RecordPaymentPayload {
  supplierId: string;
  purchaseId?: string | null;
  amount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/**
 * Record a payment to a supplier atomically with overpayment prevention.
 */
export async function recordSupplierPayment(
  workspaceId: string,
  payload: RecordPaymentPayload
): Promise<{ success: boolean; payment?: SupplierPayment; remaining?: number; error?: string }> {
  const supabase = createClient();
  const amount = Number(payload.amount);

  if (!amount || amount <= 0) {
    return { success: false, error: "Payment amount must be greater than 0." };
  }

  if (!payload.supplierId) {
    return { success: false, error: "Please specify a supplier." };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("record_supplier_payment", {
      p_workspace_id: workspaceId,
      p_supplier_id: payload.supplierId,
      p_purchase_id: payload.purchaseId || null,
      p_amount: amount,
      p_payment_date: payload.paymentDate || toISODateString(),
      p_payment_method: payload.paymentMethod || "UPI",
      p_notes: payload.notes || null,
    });

    if (rpcError) {
      console.warn("record_supplier_payment RPC error, evaluating fallback:", rpcError.message);

      // If user overpaid and RPC threw an exception:
      if (rpcError.message.includes("exceeds the remaining balance")) {
        return { success: false, error: rpcError.message };
      }

      // Fallback manual check & insert
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return { success: false, error: "Authentication required." };

      if (payload.purchaseId) {
        const { data: pData } = await supabase
          .from("purchases")
          .select("*, supplier_payments(amount)")
          .eq("id", payload.purchaseId)
          .single();

        if (pData) {
          const paid = (pData.supplier_payments || []).reduce(
            (sum: number, sp: any) => sum + Number(sp.amount || 0),
            0
          );
          const remaining = Math.max(0, Number(pData.total_amount || 0) - paid);

          if (amount > remaining) {
            return {
              success: false,
              error: `Payment of ₹${amount} exceeds the remaining bill balance of ₹${remaining}.`,
            };
          }
        }
      }

      const { data: newPay, error: insError } = await supabase
        .from("supplier_payments")
        .insert({
          user_id: userRes.user.id,
          workspace_id: workspaceId,
          supplier_id: payload.supplierId,
          purchase_id: payload.purchaseId || null,
          amount,
          payment_date: payload.paymentDate || toISODateString(),
          payment_method: payload.paymentMethod || "UPI",
          notes: payload.notes || null,
        })
        .select("*")
        .single();

      if (insError) return { success: false, error: insError.message };

      const payment: SupplierPayment = {
        id: newPay.id,
        workspaceId: newPay.workspace_id,
        userId: newPay.user_id,
        supplierId: newPay.supplier_id,
        purchaseId: newPay.purchase_id,
        date: newPay.payment_date,
        amount: Number(newPay.amount || 0),
        paymentMethod: (newPay.payment_method || "UPI") as PaymentMethod,
        notes: newPay.notes || undefined,
        createdAt: newPay.created_at,
      };

      return { success: true, payment };
    }

    const resObj = rpcData as any;
    const payRow = resObj.payment;

    const payment: SupplierPayment = {
      id: payRow.id,
      workspaceId: payRow.workspace_id,
      userId: payRow.user_id,
      supplierId: payRow.supplier_id,
      purchaseId: payRow.purchase_id,
      date: payRow.payment_date,
      amount: Number(payRow.amount || 0),
      paymentMethod: (payRow.payment_method || "UPI") as PaymentMethod,
      notes: payRow.notes || undefined,
      createdAt: payRow.created_at,
    };

    return {
      success: true,
      payment,
      remaining: resObj.remaining_amount,
    };
  } catch (err: any) {
    console.error("Unexpected error in recordSupplierPayment:", err);
    return { success: false, error: err?.message || "Failed to record payment." };
  }
}

/**
 * Fetch all payments for a specific purchase bill.
 */
export async function getPaymentsForPurchase(purchaseId: string): Promise<SupplierPayment[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("supplier_payments")
      .select("*")
      .eq("purchase_id", purchaseId)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching purchase payments:", error.message);
      return [];
    }

    return (data || []).map((sp) => ({
      id: sp.id,
      workspaceId: sp.workspace_id,
      userId: sp.user_id,
      supplierId: sp.supplier_id,
      purchaseId: sp.purchase_id,
      date: sp.payment_date,
      amount: Number(sp.amount || 0),
      paymentMethod: (sp.payment_method || "UPI") as PaymentMethod,
      notes: sp.notes || undefined,
      createdAt: sp.created_at,
    }));
  } catch (err) {
    console.error("Unexpected error in getPaymentsForPurchase:", err);
    return [];
  }
}

/**
 * Delete a supplier payment record safely.
 */
export async function deleteSupplierPayment(
  paymentId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("supplier_payments")
      .delete()
      .eq("id", paymentId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting supplier payment:", err);
    return { success: false, error: err?.message || "Failed to delete payment." };
  }
}
