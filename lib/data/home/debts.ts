import { createClient } from "@/lib/supabase/client";
import {
  BorrowRecord,
  LendRecord,
  LoanPaymentHistory,
  BorrowLendStatus,
  DebtSummary,
} from "@/types/home";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { dbToUiPaymentMethod } from "./transactions";

export interface GetDebtsOptions {
  workspaceId: string;
  direction?: "borrowed" | "lent" | "all";
  status?: "all" | "unpaid" | "partial" | "paid" | "overdue";
  search?: string;
  sortBy?: "newest" | "oldest" | "highest-amount" | "lowest-amount" | "due-soon" | "most-remaining";
  startDate?: string;
  endDate?: string;
}

export interface CreateDebtInput {
  direction: "borrowed" | "lent";
  personName: string;
  phone?: string;
  originalAmount: number;
  debtDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateDebtInput {
  personName?: string;
  phone?: string;
  originalAmount?: number;
  debtDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface CreateDebtPaymentInput {
  amount: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod | string;
  notes?: string;
}

export interface UpdateDebtPaymentInput {
  amount: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod | string;
  notes?: string;
}

/**
 * Pure calculation: Remaining balance
 */
export function calculateRemainingDebt(originalAmount: number, totalPaid: number): number {
  return Math.max(0, Math.round((originalAmount - totalPaid) * 100) / 100);
}

/**
 * Pure calculation: Accurate status derivation
 */
export function calculateDebtStatus(
  originalAmount: number,
  totalPaid: number,
  dueDate?: string | null
): BorrowLendStatus {
  const remaining = calculateRemainingDebt(originalAmount, totalPaid);
  if (remaining <= 0) return "Paid";

  // Check overdue condition
  if (dueDate) {
    const today = toISODateString(new Date());
    if (dueDate < today && remaining > 0) {
      return "Overdue";
    }
  }

  if (totalPaid > 0) return "Partially Paid";
  return "Unpaid";
}

/**
 * Due Date relative status helper
 */
export function getDueStatusInfo(
  dueDate?: string | null,
  remainingAmount: number = 0
): { text: string; isOverdue: boolean; isDueSoon: boolean; color: string } {
  if (remainingAmount <= 0) {
    return { text: "Settled", isOverdue: false, isDueSoon: false, color: "text-emerald-500 dark:text-emerald-400" };
  }
  if (!dueDate) {
    return { text: "No due date", isOverdue: false, isDueSoon: false, color: "text-slate-400" };
  }

  const todayStr = toISODateString(new Date());
  const today = new Date(todayStr);
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      text: daysAgo === 1 ? "1 day overdue" : `${daysAgo} days overdue`,
      isOverdue: true,
      isDueSoon: false,
      color: "text-rose-600 dark:text-rose-400",
    };
  } else if (diffDays === 0) {
    return {
      text: "Due today",
      isOverdue: false,
      isDueSoon: true,
      color: "text-amber-600 dark:text-amber-400",
    };
  } else if (diffDays === 1) {
    return {
      text: "Due tomorrow",
      isOverdue: false,
      isDueSoon: true,
      color: "text-amber-600 dark:text-amber-400",
    };
  } else if (diffDays <= 3) {
    return {
      text: `Due in ${diffDays} days`,
      isOverdue: false,
      isDueSoon: true,
      color: "text-amber-600 dark:text-amber-400",
    };
  } else {
    return {
      text: `Due in ${diffDays} days`,
      isOverdue: false,
      isDueSoon: false,
      color: "text-slate-500 dark:text-slate-400",
    };
  }
}

/**
 * Map DB Payment to UI LoanPaymentHistory
 */
export function mapDbPaymentToUi(row: any): LoanPaymentHistory {
  return {
    id: row.id,
    debtId: row.debt_id,
    date: row.payment_date,
    amount: Number(row.amount),
    paymentMethod: dbToUiPaymentMethod(row.payment_method),
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Map DB Debt + Payments to UI BorrowRecord
 */
export function mapDbDebtToBorrow(row: any): BorrowRecord {
  const payments: LoanPaymentHistory[] = (row.debt_payments || [])
    .map(mapDbPaymentToUi)
    .sort((a: LoanPaymentHistory, b: LoanPaymentHistory) => b.date.localeCompare(a.date));

  const originalAmount = Number(row.original_amount);
  const paidAmount = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingAmount = calculateRemainingDebt(originalAmount, paidAmount);
  const status = calculateDebtStatus(originalAmount, paidAmount, row.due_date);

  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    direction: "borrowed",
    personName: row.person_name,
    phone: row.phone || undefined,
    borrowedAmount: originalAmount,
    paidAmount,
    remainingAmount,
    debtDate: row.debt_date || row.created_at?.slice(0, 10),
    borrowDate: row.debt_date || row.created_at?.slice(0, 10),
    dueDate: row.due_date || undefined,
    status,
    purpose: row.notes || undefined,
    payments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map DB Debt + Payments to UI LendRecord
 */
export function mapDbDebtToLend(row: any): LendRecord {
  const payments: LoanPaymentHistory[] = (row.debt_payments || [])
    .map(mapDbPaymentToUi)
    .sort((a: LoanPaymentHistory, b: LoanPaymentHistory) => b.date.localeCompare(a.date));

  const originalAmount = Number(row.original_amount);
  const receivedAmount = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingAmount = calculateRemainingDebt(originalAmount, receivedAmount);
  const status = calculateDebtStatus(originalAmount, receivedAmount, row.due_date);

  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    direction: "lent",
    personName: row.person_name,
    phone: row.phone || undefined,
    lentAmount: originalAmount,
    receivedAmount,
    remainingAmount,
    debtDate: row.debt_date || row.created_at?.slice(0, 10),
    lendDate: row.debt_date || row.created_at?.slice(0, 10),
    dueDate: row.due_date || undefined,
    status,
    purpose: row.notes || undefined,
    payments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch debts for a workspace with joined payments, filtering, and sorting
 */
export async function getDebts(
  options: GetDebtsOptions
): Promise<{ borrows: BorrowRecord[]; lends: LendRecord[] }> {
  const supabase = createClient();
  try {
    let query = supabase
      .from("debts")
      .select("*, debt_payments(*)")
      .eq("workspace_id", options.workspaceId);

    if (options.direction && options.direction !== "all") {
      query = query.eq("direction", options.direction);
    }

    if (options.startDate) {
      query = query.gte("debt_date", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("debt_date", options.endDate);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching debts:", error.message);
      return { borrows: [], lends: [] };
    }

    const rows = data || [];
    let borrows: BorrowRecord[] = [];
    let lends: LendRecord[] = [];

    for (const row of rows) {
      if (row.direction === "borrowed") {
        borrows.push(mapDbDebtToBorrow(row));
      } else {
        lends.push(mapDbDebtToLend(row));
      }
    }

    // Filter by Search Query
    if (options.search && options.search.trim()) {
      const term = options.search.trim().toLowerCase();
      borrows = borrows.filter(
        (b) =>
          b.personName.toLowerCase().includes(term) ||
          (b.phone && b.phone.toLowerCase().includes(term)) ||
          (b.purpose && b.purpose.toLowerCase().includes(term))
      );
      lends = lends.filter(
        (l) =>
          l.personName.toLowerCase().includes(term) ||
          (l.phone && l.phone.toLowerCase().includes(term)) ||
          (l.purpose && l.purpose.toLowerCase().includes(term))
      );
    }

    // Filter by Status
    if (options.status && options.status !== "all") {
      const target = options.status.toLowerCase();
      const matchStatus = (status: BorrowLendStatus) => {
        if (target === "unpaid") return status === "Unpaid";
        if (target === "partial") return status === "Partially Paid";
        if (target === "paid") return status === "Paid";
        if (target === "overdue") return status === "Overdue";
        return true;
      };
      borrows = borrows.filter((b) => matchStatus(b.status));
      lends = lends.filter((l) => matchStatus(l.status));
    }

    // Sorting
    const sortFn = (
      a: {
        createdAt?: string;
        debtDate?: string;
        borrowedAmount?: number;
        lentAmount?: number;
        remainingAmount: number;
        dueDate?: string | null;
      },
      b: {
        createdAt?: string;
        debtDate?: string;
        borrowedAmount?: number;
        lentAmount?: number;
        remainingAmount: number;
        dueDate?: string | null;
      }
    ) => {
      const aAmount = a.borrowedAmount ?? a.lentAmount ?? 0;
      const bAmount = b.borrowedAmount ?? b.lentAmount ?? 0;
      switch (options.sortBy) {
        case "oldest":
          return (a.debtDate || a.createdAt || "").localeCompare(b.debtDate || b.createdAt || "");
        case "highest-amount":
          return bAmount - aAmount;
        case "lowest-amount":
          return aAmount - bAmount;
        case "most-remaining":
          return b.remainingAmount - a.remainingAmount;
        case "due-soon": {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case "newest":
        default:
          return (b.debtDate || b.createdAt || "").localeCompare(a.debtDate || a.createdAt || "");
      }
    };

    borrows.sort(sortFn);
    lends.sort(sortFn);

    return { borrows, lends };
  } catch (err) {
    console.error("Unexpected error in getDebts:", err);
    return { borrows: [], lends: [] };
  }
}

/**
 * Fetch a single Debt by ID
 */
export async function getDebtById(
  id: string
): Promise<{ record: BorrowRecord | LendRecord; isBorrow: boolean } | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("debts")
      .select("*, debt_payments(*)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    if (data.direction === "borrowed") {
      return { record: mapDbDebtToBorrow(data), isBorrow: true };
    } else {
      return { record: mapDbDebtToLend(data), isBorrow: false };
    }
  } catch {
    return null;
  }
}

/**
 * Create a new Borrow or Lend record
 */
export async function createDebt(
  workspaceId: string,
  input: CreateDebtInput
): Promise<{ success: boolean; data?: BorrowRecord | LendRecord; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    if (!input.personName || input.personName.trim().length < 2) {
      return { success: false, error: "Person name must be at least 2 characters." };
    }

    if (input.originalAmount <= 0) {
      return { success: false, error: "Amount must be greater than 0." };
    }

    const debtDate = input.debtDate || toISODateString(new Date());

    const { data, error } = await supabase
      .from("debts")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        direction: input.direction,
        person_name: input.personName.trim(),
        phone: input.phone ? input.phone.trim() : null,
        original_amount: Number(input.originalAmount),
        debt_date: debtDate,
        due_date: input.dueDate || null,
        notes: input.notes ? input.notes.trim() : null,
        status: "unpaid",
      })
      .select("*, debt_payments(*)")
      .single();

    if (error) {
      console.error("Error creating debt:", error.message);
      return { success: false, error: error.message };
    }

    const createdRecord =
      input.direction === "borrowed" ? mapDbDebtToBorrow(data) : mapDbDebtToLend(data);

    return { success: true, data: createdRecord };
  } catch (err: any) {
    console.error("Unexpected error in createDebt:", err);
    return { success: false, error: err.message || "Failed to create record." };
  }
}

/**
 * Update an existing debt record
 */
export async function updateDebt(
  id: string,
  input: UpdateDebtInput
): Promise<{ success: boolean; data?: BorrowRecord | LendRecord; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    // Check existing payments to validate original_amount constraint
    if (input.originalAmount !== undefined) {
      const { data: payments } = await supabase
        .from("debt_payments")
        .select("amount")
        .eq("debt_id", id);

      const totalPaid = (payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
      if (input.originalAmount < totalPaid) {
        return {
          success: false,
          error: `Original amount cannot be less than total payments already recorded (₹${totalPaid}).`,
        };
      }
    }

    const updatePayload: any = {};
    if (input.personName !== undefined) updatePayload.person_name = input.personName.trim();
    if (input.phone !== undefined) updatePayload.phone = input.phone ? input.phone.trim() : null;
    if (input.originalAmount !== undefined) updatePayload.original_amount = Number(input.originalAmount);
    if (input.debtDate !== undefined) updatePayload.debt_date = input.debtDate;
    if (input.dueDate !== undefined) updatePayload.due_date = input.dueDate || null;
    if (input.notes !== undefined) updatePayload.notes = input.notes ? input.notes.trim() : null;

    const { data, error } = await supabase
      .from("debts")
      .update(updatePayload)
      .eq("id", id)
      .select("*, debt_payments(*)")
      .single();

    if (error) {
      console.error("Error updating debt:", error.message);
      return { success: false, error: error.message };
    }

    const updatedRecord =
      data.direction === "borrowed" ? mapDbDebtToBorrow(data) : mapDbDebtToLend(data);

    return { success: true, data: updatedRecord };
  } catch (err: any) {
    console.error("Unexpected error in updateDebt:", err);
    return { success: false, error: err.message || "Failed to update record." };
  }
}

/**
 * Delete an existing debt record
 */
export async function deleteDebt(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting debt:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in deleteDebt:", err);
    return { success: false, error: err.message || "Failed to delete record." };
  }
}

/**
 * Fetch payment logs for a debt
 */
export async function getDebtPayments(debtId: string): Promise<LoanPaymentHistory[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("debt_payments")
      .select("*")
      .eq("debt_id", debtId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDbPaymentToUi);
  } catch {
    return [];
  }
}

/**
 * Record a payment against a debt with validation preventing overpayment
 */
export async function createDebtPayment(
  debtId: string,
  input: CreateDebtPaymentInput
): Promise<{ success: boolean; payment?: LoanPaymentHistory; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    if (input.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0." };
    }

    // Try executing the atomic RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc("record_debt_payment", {
      p_debt_id: debtId,
      p_amount: Number(input.amount),
      p_payment_date: input.paymentDate || toISODateString(new Date()),
      p_payment_method: input.paymentMethod,
      p_notes: input.notes || null,
    });

    if (!rpcError && rpcData) {
      return {
        success: true,
        payment: {
          id: (rpcData as any).payment_id,
          debtId,
          amount: Number(input.amount),
          date: input.paymentDate || toISODateString(new Date()),
          paymentMethod: (input.paymentMethod as PaymentMethod) || "UPI",
          notes: input.notes,
        },
      };
    }

    // Fallback transaction-safe client check if RPC is unavailable
    const { data: debt, error: debtError } = await supabase
      .from("debts")
      .select("original_amount, debt_payments(amount)")
      .eq("id", debtId)
      .single();

    if (debtError || !debt) {
      return { success: false, error: "Debt record not found." };
    }

    const currentPaid = (debt.debt_payments || []).reduce(
      (acc: number, p: any) => acc + Number(p.amount),
      0
    );
    const remaining = Number(debt.original_amount) - currentPaid;

    if (Number(input.amount) > remaining) {
      return {
        success: false,
        error: `Payment cannot exceed the remaining balance of ₹${remaining.toLocaleString("en-IN")}.`,
      };
    }

    const { data: newPayment, error: insertError } = await supabase
      .from("debt_payments")
      .insert({
        user_id: user.id,
        debt_id: debtId,
        amount: Number(input.amount),
        payment_date: input.paymentDate || toISODateString(new Date()),
        payment_method: input.paymentMethod,
        notes: input.notes || null,
      })
      .select("*")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, payment: mapDbPaymentToUi(newPayment) };
  } catch (err: any) {
    console.error("Unexpected error in createDebtPayment:", err);
    return { success: false, error: err.message || "Failed to record payment." };
  }
}

/**
 * Edit an existing debt payment
 */
export async function updateDebtPayment(
  paymentId: string,
  debtId: string,
  input: UpdateDebtPaymentInput
): Promise<{ success: boolean; payment?: LoanPaymentHistory; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    if (input.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0." };
    }

    // Verify other payments + new amount does not exceed original amount
    const { data: debt } = await supabase
      .from("debts")
      .select("original_amount, debt_payments(id, amount)")
      .eq("id", debtId)
      .single();

    if (debt) {
      const otherPaymentsTotal = (debt.debt_payments || [])
        .filter((p: any) => p.id !== paymentId)
        .reduce((acc: number, p: any) => acc + Number(p.amount), 0);

      const newTotal = otherPaymentsTotal + Number(input.amount);
      if (newTotal > Number(debt.original_amount)) {
        const allowedMax = Number(debt.original_amount) - otherPaymentsTotal;
        return {
          success: false,
          error: `Updated amount exceeds balance. Maximum allowed is ₹${allowedMax.toLocaleString("en-IN")}.`,
        };
      }
    }

    const { data, error } = await supabase
      .from("debt_payments")
      .update({
        amount: Number(input.amount),
        payment_date: input.paymentDate,
        payment_method: input.paymentMethod,
        notes: input.notes || null,
      })
      .eq("id", paymentId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, payment: mapDbPaymentToUi(data) };
  } catch (err: any) {
    console.error("Unexpected error in updateDebtPayment:", err);
    return { success: false, error: err.message || "Failed to update payment." };
  }
}

/**
 * Delete an existing debt payment
 */
export async function deleteDebtPayment(
  paymentId: string,
  _debtId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { error } = await supabase.from("debt_payments").delete().eq("id", paymentId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in deleteDebtPayment:", err);
    return { success: false, error: err.message || "Failed to delete payment." };
  }
}

/**
 * Calculate Summary Totals for Borrow & Lend
 */
export async function getDebtSummary(workspaceId: string): Promise<DebtSummary> {
  const { borrows, lends } = await getDebts({ workspaceId });

  let totalMoneyToPay = 0;
  let totalMoneyToReceive = 0;
  let overdueAmount = 0;
  let activeBorrowingsCount = 0;
  let activeLendingsCount = 0;

  for (const b of borrows) {
    if (b.remainingAmount > 0) {
      totalMoneyToPay += b.remainingAmount;
      activeBorrowingsCount++;
      if (b.status === "Overdue") {
        overdueAmount += b.remainingAmount;
      }
    }
  }

  for (const l of lends) {
    if (l.remainingAmount > 0) {
      totalMoneyToReceive += l.remainingAmount;
      activeLendingsCount++;
      if (l.status === "Overdue") {
        overdueAmount += l.remainingAmount;
      }
    }
  }

  return {
    totalMoneyToPay: Math.round(totalMoneyToPay),
    totalMoneyToReceive: Math.round(totalMoneyToReceive),
    overdueAmount: Math.round(overdueAmount),
    activeBorrowingsCount,
    activeLendingsCount,
    totalActiveCount: activeBorrowingsCount + activeLendingsCount,
  };
}
