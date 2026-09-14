import { createClient } from "@/lib/supabase/client";
import { CustomerCredit, CustomerCreditPayment } from "@/lib/supabase/types";

export interface CustomerCreditWithPayments extends CustomerCredit {
  payments?: CustomerCreditPayment[];
  paid_amount?: number;
  remaining_amount?: number;
}

interface CustomerCreditJoinedRow extends CustomerCredit {
  customer_credit_payments?: CustomerCreditPayment[];
}

export async function getCustomerCredits(workspaceId: string): Promise<CustomerCreditWithPayments[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customer_credits")
      .select("*, customer_credit_payments(*)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching customer credits:", error.message);
      return [];
    }

    const rows = (data || []) as unknown as CustomerCreditJoinedRow[];

    return rows.map((c: CustomerCreditJoinedRow) => {
      const payments: CustomerCreditPayment[] = c.customer_credit_payments || [];
      const paid_amount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const remaining_amount = Math.max(0, Number(c.original_amount || 0) - paid_amount);

      return {
        ...c,
        payments,
        paid_amount,
        remaining_amount,
      };
    });
  } catch (err) {
    console.error("Unexpected error fetching customer credits:", err);
    return [];
  }
}
