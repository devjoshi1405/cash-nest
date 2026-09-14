import { createClient } from "@/lib/supabase/client";
import { Debt, DebtPayment } from "@/lib/supabase/types";

export interface DebtWithPayments extends Debt {
  payments?: DebtPayment[];
  paid_amount?: number;
  remaining_amount?: number;
}

interface DebtJoinedRow extends Debt {
  debt_payments?: DebtPayment[];
}

export async function getDebts(workspaceId: string, direction?: "borrowed" | "lent"): Promise<DebtWithPayments[]> {
  const supabase = createClient();
  try {
    let query = supabase
      .from("debts")
      .select("*, debt_payments(*)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (direction) {
      query = query.eq("direction", direction);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching debts:", error.message);
      return [];
    }

    const rows = (data || []) as unknown as DebtJoinedRow[];

    return rows.map((debt: DebtJoinedRow) => {
      const payments: DebtPayment[] = debt.debt_payments || [];
      const paid_amount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const remaining_amount = Math.max(0, Number(debt.original_amount || 0) - paid_amount);

      return {
        ...debt,
        payments,
        paid_amount,
        remaining_amount,
      };
    });
  } catch (err) {
    console.error("Unexpected error fetching debts:", err);
    return [];
  }
}
