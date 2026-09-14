import { createClient } from "@/lib/supabase/client";
import {
  CustomerCredit,
  CustomerCreditPayment,
  CustomerCreditInput,
  CustomerCreditUpdateInput,
  CustomerCreditPaymentInput,
  CustomerCreditPaymentUpdateInput,
  CustomerCreditSummary,
  CustomerOutstandingSummary,
  CustomerCreditStatus,
  CustomerCreditSortOption,
  CustomerCreditFilterStatus,
  CustomerCreditDueFilter,
} from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import {
  toISODateString,
  getCurrentMonthDateRange,
  getRecentMonths,
} from "@/lib/date";

// ==========================================
// Reusable Calculation & Status Helpers
// ==========================================

export function calculateCreditReceived(payments: Array<{ amount: number }> = []): number {
  const sum = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  return Math.round(sum * 100) / 100;
}

export function calculateCreditRemaining(
  originalAmount: number,
  payments: Array<{ amount: number }> = []
): number {
  const received = calculateCreditReceived(payments);
  return Math.max(0, Math.round((originalAmount - received) * 100) / 100);
}

export function isCreditOverdue(
  dueDate: string | null | undefined,
  remainingAmount: number
): boolean {
  if (!dueDate || remainingAmount <= 0) return false;
  const todayStr = toISODateString(new Date());
  return dueDate < todayStr;
}

export function formatDueDateStatus(
  dueDate: string | null | undefined,
  remainingAmount: number
): { label: string; isOverdue: boolean; isDueToday: boolean } {
  if (remainingAmount <= 0) {
    return { label: "Settled in full", isOverdue: false, isDueToday: false };
  }
  if (!dueDate) {
    return { label: "No due date", isOverdue: false, isDueToday: false };
  }

  const todayStr = toISODateString(new Date());
  if (dueDate === todayStr) {
    return { label: "Due today", isOverdue: false, isDueToday: true };
  }

  const today = new Date(todayStr);
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      label: absDays === 1 ? "1 day overdue" : `${absDays} days overdue`,
      isOverdue: true,
      isDueToday: false,
    };
  }

  return {
    label: diffDays === 1 ? "Due tomorrow" : `Due in ${diffDays} days`,
    isOverdue: false,
    isDueToday: false,
  };
}

export function calculateCreditStatus(
  originalAmount: number,
  totalPaid: number,
  dueDate?: string | null
): CustomerCreditStatus {
  const remaining = Math.max(0, originalAmount - totalPaid);
  if (remaining <= 0) {
    return "Paid";
  }
  if (isCreditOverdue(dueDate, remaining)) {
    return "Overdue";
  }
  if (totalPaid > 0) {
    return "Partial";
  }
  return "Pending";
}

export function mapDbCreditToUi(row: {
  id: string;
  workspace_id?: string;
  user_id?: string;
  customer_name: string;
  phone?: string | null;
  credit_date?: string;
  original_amount: number;
  due_date?: string | null;
  notes?: string | null;
  status: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  customer_credit_payments?: Array<{
    id: string;
    user_id?: string;
    customer_credit_id?: string;
    amount: number;
    payment_date: string;
    payment_method?: string | null;
    notes?: string | null;
    created_at?: string;
  }>;
}): CustomerCredit {
  const rawPayments = row.customer_credit_payments || [];
  const payments: CustomerCreditPayment[] = rawPayments
    .map((p) => ({
      id: p.id,
      userId: p.user_id,
      customerCreditId: p.customer_credit_id,
      date: p.payment_date,
      amount: Number(p.amount || 0),
      paymentMethod: (p.payment_method || "Cash") as PaymentMethod,
      notes: p.notes || undefined,
      createdAt: p.created_at,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const originalAmount = Number(row.original_amount || 0);
  const amountReceived = calculateCreditReceived(payments);
  const remainingAmount = Math.max(0, Math.round((originalAmount - amountReceived) * 100) / 100);

  const overdue = isCreditOverdue(row.due_date, remainingAmount);
  const dueStatus = formatDueDateStatus(row.due_date, remainingAmount);

  let status: CustomerCreditStatus = "Pending";
  if (remainingAmount <= 0) {
    status = "Paid";
  } else if (overdue) {
    status = "Overdue";
  } else if (amountReceived > 0) {
    status = "Partial";
  }

  const lastPayment = payments[0];
  const lastPaymentDate = lastPayment ? lastPayment.date : undefined;
  const settledDate = status === "Paid" && lastPayment ? lastPayment.date : undefined;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    customerName: row.customer_name,
    phone: row.phone || undefined,
    creditDate: row.credit_date,
    creditAmount: originalAmount,
    amountReceived,
    remainingAmount,
    lastPaymentDate,
    dueDate: row.due_date || undefined,
    status,
    notes: row.notes || undefined,
    isArchived: row.is_archived || false,
    isOverdue: overdue,
    dueDateStatus: dueStatus.label,
    settledDate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payments,
  };
}

// ==========================================
// Queries & Mutations
// ==========================================

export interface GetCustomerCreditsOptions {
  search?: string;
  status?: CustomerCreditFilterStatus;
  dueFilter?: CustomerCreditDueFilter;
  startDate?: string;
  endDate?: string;
  sortBy?: CustomerCreditSortOption;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export interface CustomerCreditsPaginatedResponse {
  credits: CustomerCredit[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

/**
 * Fetch customer credit records with payments, search, filters, sorting and pagination.
 */
export async function getCustomerCredits(
  workspaceId: string,
  options: GetCustomerCreditsOptions = {}
): Promise<CustomerCreditsPaginatedResponse> {
  const supabase = createClient();
  const page = Math.max(1, options.page || 1);
  const pageSize = options.pageSize || 20;

  try {
    let query = supabase
      .from("customer_credits")
      .select("*, customer_credit_payments(*)", { count: "exact" })
      .eq("workspace_id", workspaceId);

    if (!options.includeArchived) {
      query = query.neq("is_archived", true);
    }

    if (options.startDate) {
      query = query.gte("credit_date", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("credit_date", options.endDate);
    }

    if (options.search && options.search.trim()) {
      const s = options.search.trim();
      query = query.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%,notes.ilike.%${s}%`);
    }

    // Direct database status filtering for paid/pending/partial
    if (options.status && options.status !== "all" && options.status !== "overdue") {
      query = query.eq("status", options.status);
    }

    // Sorting
    switch (options.sortBy) {
      case "oldest":
        query = query.order("credit_date", { ascending: true });
        break;
      case "highest-credit":
        query = query.order("original_amount", { ascending: false });
        break;
      case "lowest-credit":
        query = query.order("original_amount", { ascending: true });
        break;
      case "due-soon":
        query = query.order("due_date", { ascending: true, nullsFirst: false });
        break;
      case "customer-az":
        query = query.order("customer_name", { ascending: true });
        break;
      case "newest":
      default:
        query = query.order("credit_date", { ascending: false }).order("created_at", { ascending: false });
        break;
    }

    const { data, count, error } = await query;
    if (error) {
      console.error("Error fetching customer credits:", error);
      throw error;
    }

    let items: CustomerCredit[] = (data || []).map(mapDbCreditToUi);

    // Derived Status Filtering: Overdue
    if (options.status === "overdue") {
      items = items.filter((c) => c.status === "Overdue" || c.isOverdue);
    }

    // Due filter logic
    if (options.dueFilter && options.dueFilter !== "all") {
      const todayStr = toISODateString(new Date());
      switch (options.dueFilter) {
        case "overdue":
          items = items.filter((c) => c.isOverdue);
          break;
        case "due-today":
          items = items.filter((c) => c.dueDate === todayStr && c.remainingAmount > 0);
          break;
        case "upcoming":
          items = items.filter((c) => c.dueDate && c.dueDate > todayStr && c.remainingAmount > 0);
          break;
        case "no-due-date":
          items = items.filter((c) => !c.dueDate && c.remainingAmount > 0);
          break;
      }
    }

    // In-memory post-sorting for remaining amount if requested
    if (options.sortBy === "highest-remaining") {
      items.sort((a, b) => b.remainingAmount - a.remainingAmount);
    } else if (options.sortBy === "most-overdue") {
      items.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }

    const totalFilteredCount = items.length;
    const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      credits: paginatedItems,
      totalCount: count ?? totalFilteredCount,
      totalPages,
      page,
      pageSize,
    };
  } catch (err) {
    console.error("Failed to get customer credits:", err);
    return {
      credits: [],
      totalCount: 0,
      totalPages: 1,
      page: 1,
      pageSize,
    };
  }
}

/**
 * Fetch a single customer credit by ID with complete payment log.
 */
export async function getCustomerCreditById(
  creditId: string,
  workspaceId: string
): Promise<CustomerCredit | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customer_credits")
      .select("*, customer_credit_payments(*)")
      .eq("id", creditId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) {
      console.error("Error fetching credit by id:", error);
      return null;
    }

    return mapDbCreditToUi(data);
  } catch (err) {
    console.error("Failed to fetch customer credit by id:", err);
    return null;
  }
}

/**
 * Create a customer credit entry with optional atomic initial payment via RPC.
 */
export async function createCustomerCredit(
  input: CustomerCreditInput
): Promise<{ credit: CustomerCredit; payment: CustomerCreditPayment | null }> {
  const supabase = createClient();

  if (!input.customerName || !input.customerName.trim()) {
    throw new Error("Customer name is required.");
  }
  if (!input.creditAmount || input.creditAmount <= 0) {
    throw new Error("Credit amount must be greater than 0.");
  }
  if (input.initialPayment && input.initialPayment < 0) {
    throw new Error("Initial payment cannot be negative.");
  }
  if (input.initialPayment && input.initialPayment > input.creditAmount) {
    throw new Error(
      `Initial payment (₹${input.initialPayment}) cannot exceed the credit amount (₹${input.creditAmount}).`
    );
  }

  const creditDate = input.creditDate || toISODateString(new Date());

  const { data, error } = await supabase.rpc("create_customer_credit_with_payment", {
    p_workspace_id: input.workspaceId,
    p_customer_name: input.customerName.trim(),
    p_phone: input.phone?.trim() || null,
    p_original_amount: input.creditAmount,
    p_credit_date: creditDate,
    p_due_date: input.dueDate || null,
    p_notes: input.notes?.trim() || null,
    p_initial_payment: input.initialPayment || 0,
    p_payment_method: input.paymentMethod || "Cash",
  });

  if (error) {
    console.error("RPC create_customer_credit_with_payment error:", error);
    throw new Error(error.message || "Unable to create customer credit.");
  }

  const raw = data as {
    credit: any;
    payment: any;
    amount_received: number;
    remaining_amount: number;
    status: string;
  };

  const rawCredit = raw.credit;
  if (raw.payment) {
    rawCredit.customer_credit_payments = [raw.payment];
  }

  const uiCredit = mapDbCreditToUi(rawCredit);
  const uiPayment: CustomerCreditPayment | null = raw.payment
    ? {
        id: raw.payment.id,
        userId: raw.payment.user_id,
        customerCreditId: raw.payment.customer_credit_id,
        date: raw.payment.payment_date,
        amount: Number(raw.payment.amount),
        paymentMethod: (raw.payment.payment_method || "Cash") as PaymentMethod,
        notes: raw.payment.notes || undefined,
        createdAt: raw.payment.created_at,
      }
    : null;

  return {
    credit: uiCredit,
    payment: uiPayment,
  };
}

/**
 * Record a customer payment via atomic RPC with row-level locking & overpayment protection.
 */
export async function recordCustomerCreditPayment(
  input: CustomerCreditPaymentInput
): Promise<CustomerCreditPayment> {
  const supabase = createClient();

  if (!input.amount || input.amount <= 0) {
    throw new Error("Payment amount must be greater than 0.");
  }

  const paymentDate = input.date || toISODateString(new Date());

  const { data, error } = await supabase.rpc("record_customer_credit_payment", {
    p_credit_id: input.creditId,
    p_amount: input.amount,
    p_payment_date: paymentDate,
    p_payment_method: input.paymentMethod || "Cash",
    p_notes: input.notes?.trim() || null,
  });

  if (error) {
    console.error("RPC record_customer_credit_payment error:", error);
    throw new Error(error.message || "Unable to record customer payment.");
  }

  const raw = data as {
    payment: any;
    credit_id: string;
    total_paid: number;
    remaining_amount: number;
    status: string;
  };

  return {
    id: raw.payment.id,
    userId: raw.payment.user_id,
    customerCreditId: raw.payment.customer_credit_id,
    date: raw.payment.payment_date,
    amount: Number(raw.payment.amount),
    paymentMethod: (raw.payment.payment_method || "Cash") as PaymentMethod,
    notes: raw.payment.notes || undefined,
    createdAt: raw.payment.created_at,
  };
}

/**
 * Update a customer credit payment via atomic RPC with validation against original credit.
 */
export async function updateCustomerCreditPayment(
  input: CustomerCreditPaymentUpdateInput
): Promise<CustomerCreditPayment> {
  const supabase = createClient();

  if (!input.amount || input.amount <= 0) {
    throw new Error("Payment amount must be greater than 0.");
  }

  const paymentDate = input.date || toISODateString(new Date());

  const { data, error } = await supabase.rpc("update_customer_credit_payment", {
    p_payment_id: input.paymentId,
    p_amount: input.amount,
    p_payment_date: paymentDate,
    p_payment_method: input.paymentMethod || "Cash",
    p_notes: input.notes?.trim() || null,
  });

  if (error) {
    console.error("RPC update_customer_credit_payment error:", error);
    throw new Error(error.message || "Unable to update customer credit payment.");
  }

  const raw = data as {
    payment: any;
    credit_id: string;
    total_paid: number;
    remaining_amount: number;
    status: string;
  };

  return {
    id: raw.payment.id,
    userId: raw.payment.user_id,
    customerCreditId: raw.payment.customer_credit_id,
    date: raw.payment.payment_date,
    amount: Number(raw.payment.amount),
    paymentMethod: (raw.payment.payment_method || "Cash") as PaymentMethod,
    notes: raw.payment.notes || undefined,
    createdAt: raw.payment.created_at,
  };
}

/**
 * Delete a customer credit payment with atomic status sync.
 */
export async function deleteCustomerCreditPayment(paymentId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.rpc("delete_customer_credit_payment", {
    p_payment_id: paymentId,
  });

  if (error) {
    console.error("RPC delete_customer_credit_payment error:", error);
    throw new Error(error.message || "Unable to delete customer credit payment.");
  }

  return true;
}

/**
 * Update a customer credit record via atomic RPC.
 */
export async function updateCustomerCredit(
  input: CustomerCreditUpdateInput
): Promise<CustomerCredit> {
  const supabase = createClient();

  if (!input.customerName || !input.customerName.trim()) {
    throw new Error("Customer name is required.");
  }
  if (!input.creditAmount || input.creditAmount <= 0) {
    throw new Error("Credit amount must be greater than 0.");
  }

  const { data, error } = await supabase.rpc("update_customer_credit", {
    p_credit_id: input.id,
    p_customer_name: input.customerName.trim(),
    p_phone: input.phone?.trim() || null,
    p_original_amount: input.creditAmount,
    p_credit_date: input.creditDate || toISODateString(new Date()),
    p_due_date: input.dueDate || null,
    p_notes: input.notes?.trim() || null,
  });

  if (error) {
    console.error("RPC update_customer_credit error:", error);
    throw new Error(error.message || "Unable to update customer credit.");
  }

  const raw = data as {
    credit: any;
    total_paid: number;
    remaining_amount: number;
    status: string;
  };

  return mapDbCreditToUi(raw.credit);
}

/**
 * Soft-delete / archive or delete a customer credit.
 */
export async function deleteCustomerCredit(
  creditId: string,
  softDelete: boolean = true
): Promise<boolean> {
  const supabase = createClient();

  if (softDelete) {
    const { error } = await supabase
      .from("customer_credits")
      .update({ is_archived: true })
      .eq("id", creditId);

    if (error) {
      console.error("Error archiving customer credit:", error);
      throw new Error(error.message || "Unable to archive customer credit.");
    }
  } else {
    const { error } = await supabase
      .from("customer_credits")
      .delete()
      .eq("id", creditId);

    if (error) {
      console.error("Error deleting customer credit:", error);
      throw new Error(error.message || "Unable to delete customer credit.");
    }
  }

  return true;
}

/**
 * Fetch top summary stats for customer credits in workspace.
 */
export async function getCustomerCreditSummary(
  workspaceId: string
): Promise<CustomerCreditSummary> {
  const supabase = createClient();
  const now = new Date();
  const currentMonth = getCurrentMonthDateRange(now);
  const todayStr = toISODateString(now);

  try {
    const [creditsRes, paymentsMonthRes] = await Promise.all([
      supabase
        .from("customer_credits")
        .select("id, customer_name, original_amount, due_date, status, is_archived, customer_credit_payments(amount)")
        .eq("workspace_id", workspaceId)
        .neq("is_archived", true),

      supabase
        .from("customer_credit_payments")
        .select("amount, customer_credits!inner(workspace_id)")
        .eq("customer_credits.workspace_id", workspaceId)
        .gte("payment_date", currentMonth.startDate)
        .lte("payment_date", currentMonth.endDate),
    ]);

    const rawCredits = creditsRes.data || [];
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalCreditExtended = 0;
    let totalCollected = 0;
    let overdueCreditsCount = 0;
    const pendingCustomersSet = new Set<string>();

    for (const c of rawCredits) {
      const orig = Number(c.original_amount || 0);
      totalCreditExtended += orig;

      const payments = (c.customer_credit_payments || []) as Array<{ amount: number }>;
      const received = calculateCreditReceived(payments);
      totalCollected += received;

      const remaining = Math.max(0, orig - received);
      if (remaining > 0) {
        totalOutstanding += remaining;
        pendingCustomersSet.add(c.customer_name.trim().toLowerCase());

        if (c.due_date && c.due_date < todayStr) {
          totalOverdue += remaining;
          overdueCreditsCount += 1;
        }
      }
    }

    const totalReceivedThisMonth = (paymentsMonthRes.data || []).reduce(
      (acc, curr) => acc + Number(curr.amount || 0),
      0
    );

    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalReceivedThisMonth: Math.round(totalReceivedThisMonth * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      pendingCustomersCount: pendingCustomersSet.size,
      totalCreditExtended: Math.round(totalCreditExtended * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalActiveCredits: rawCredits.length,
      overdueCreditsCount,
    };
  } catch (err) {
    console.error("Failed to get customer credit summary:", err);
    return {
      totalOutstanding: 0,
      totalReceivedThisMonth: 0,
      totalOverdue: 0,
      pendingCustomersCount: 0,
      totalCreditExtended: 0,
      totalCollected: 0,
      totalActiveCredits: 0,
      overdueCreditsCount: 0,
    };
  }
}

/**
 * Fetch grouped customer-level summaries (aggregate multiple credit tabs for the same customer).
 */
export async function getCustomerOutstandingSummary(
  workspaceId: string
): Promise<CustomerOutstandingSummary[]> {
  const supabase = createClient();
  const todayStr = toISODateString(new Date());

  try {
    const { data, error } = await supabase
      .from("customer_credits")
      .select("*, customer_credit_payments(*)")
      .eq("workspace_id", workspaceId)
      .neq("is_archived", true);

    if (error || !data) {
      return [];
    }

    const customerMap = new Map<
      string,
      {
        customerName: string;
        phone?: string;
        totalCredit: number;
        totalReceived: number;
        creditsCount: number;
        oldestDueDate?: string;
        lastPaymentDate?: string;
      }
    >();

    for (const row of data) {
      const uiCredit = mapDbCreditToUi(row);
      const key = `${uiCredit.customerName.trim().toLowerCase()}__${uiCredit.phone || ""}`;

      const existing = customerMap.get(key) || {
        customerName: uiCredit.customerName,
        phone: uiCredit.phone,
        totalCredit: 0,
        totalReceived: 0,
        creditsCount: 0,
        oldestDueDate: undefined,
        lastPaymentDate: undefined,
      };

      existing.totalCredit += uiCredit.creditAmount;
      existing.totalReceived += uiCredit.amountReceived;
      existing.creditsCount += 1;

      if (uiCredit.dueDate && uiCredit.remainingAmount > 0) {
        if (!existing.oldestDueDate || uiCredit.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = uiCredit.dueDate;
        }
      }

      if (uiCredit.lastPaymentDate) {
        if (!existing.lastPaymentDate || uiCredit.lastPaymentDate > existing.lastPaymentDate) {
          existing.lastPaymentDate = uiCredit.lastPaymentDate;
        }
      }

      customerMap.set(key, existing);
    }

    const results: CustomerOutstandingSummary[] = Array.from(customerMap.values()).map((c) => {
      const outstanding = Math.max(0, Math.round((c.totalCredit - c.totalReceived) * 100) / 100);
      let status: CustomerCreditStatus = "Pending";

      if (outstanding <= 0) {
        status = "Paid";
      } else if (c.oldestDueDate && c.oldestDueDate < todayStr) {
        status = "Overdue";
      } else if (c.totalReceived > 0) {
        status = "Partial";
      }

      return {
        customerName: c.customerName,
        phone: c.phone,
        totalCredit: Math.round(c.totalCredit * 100) / 100,
        totalReceived: Math.round(c.totalReceived * 100) / 100,
        outstanding,
        creditsCount: c.creditsCount,
        oldestDueDate: c.oldestDueDate,
        status,
        lastPaymentDate: c.lastPaymentDate,
      };
    });

    // Sort by largest outstanding first
    results.sort((a, b) => b.outstanding - a.outstanding);
    return results;
  } catch (err) {
    console.error("Failed to get customer outstanding summary:", err);
    return [];
  }
}

/**
 * Get distinct customer names & phones for autofill suggestions.
 */
export async function getDistinctCustomerSuggestions(
  workspaceId: string
): Promise<Array<{ name: string; phone?: string }>> {
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from("customer_credits")
      .select("customer_name, phone")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data) return [];

    const map = new Map<string, { name: string; phone?: string }>();
    for (const d of data) {
      const trimmed = d.customer_name?.trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), {
          name: trimmed,
          phone: d.phone?.trim() || undefined,
        });
      }
    }

    return Array.from(map.values());
  } catch (err) {
    console.error("Error getting customer suggestions:", err);
    return [];
  }
}

/**
 * Customer credit analytics for Shop Reports.
 */
export interface CustomerCreditReportsData {
  totalCreditIssued: number;
  totalCreditCollected: number;
  currentOutstandingCredit: number;
  currentOverdueCredit: number;
  creditTrend: Array<{ month: string; issued: number; collected: number }>;
  collectionPaymentMethods: Array<{ name: string; value: number; percentage: number; color: string }>;
  customerOutstandingList: CustomerOutstandingSummary[];
}

export async function getCustomerCreditReports(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<CustomerCreditReportsData> {
  const supabase = createClient();
  const now = new Date();
  const recent6Months = getRecentMonths(6, now);
  const sixMonthsAgoStart = recent6Months[0]?.startDate || "";

  try {
    let creditIssuedQuery = supabase
      .from("customer_credits")
      .select("original_amount, credit_date")
      .eq("workspace_id", workspaceId)
      .neq("is_archived", true);

    let collectionsQuery = supabase
      .from("customer_credit_payments")
      .select("amount, payment_date, payment_method, customer_credits!inner(workspace_id)")
      .eq("customer_credits.workspace_id", workspaceId);

    let trendCreditsQuery = supabase
      .from("customer_credits")
      .select("original_amount, credit_date")
      .eq("workspace_id", workspaceId)
      .gte("credit_date", sixMonthsAgoStart);

    let trendPaymentsQuery = supabase
      .from("customer_credit_payments")
      .select("amount, payment_date, customer_credits!inner(workspace_id)")
      .eq("customer_credits.workspace_id", workspaceId)
      .gte("payment_date", sixMonthsAgoStart);

    if (startDate) {
      creditIssuedQuery = creditIssuedQuery.gte("credit_date", startDate);
      collectionsQuery = collectionsQuery.gte("payment_date", startDate);
    }
    if (endDate) {
      creditIssuedQuery = creditIssuedQuery.lte("credit_date", endDate);
      collectionsQuery = collectionsQuery.lte("payment_date", endDate);
    }

    const [
      issuedRes,
      collectionsRes,
      trendCreditsRes,
      trendPaymentsRes,
      summaryRes,
      customerGroupedRes,
    ] = await Promise.all([
      creditIssuedQuery,
      collectionsQuery,
      trendCreditsQuery,
      trendPaymentsQuery,
      getCustomerCreditSummary(workspaceId),
      getCustomerOutstandingSummary(workspaceId),
    ]);

    const totalCreditIssued = (issuedRes.data || []).reduce(
      (sum, row) => sum + Number(row.original_amount || 0),
      0
    );

    const rawCollections = collectionsRes.data || [];
    let totalCreditCollected = 0;
    const methodTotals: Record<string, number> = {
      Cash: 0,
      UPI: 0,
      Bank: 0,
      "Credit Card": 0,
      "Debit Card": 0,
      Other: 0,
    };

    for (const p of rawCollections) {
      const amt = Number(p.amount || 0);
      totalCreditCollected += amt;
      const m = (p.payment_method || "Cash") as string;
      methodTotals[m] = (methodTotals[m] || 0) + amt;
    }

    const methodColors: Record<string, string> = {
      Cash: "#10B981",
      UPI: "#3B82F6",
      Bank: "#8B5CF6",
      "Credit Card": "#F59E0B",
      "Debit Card": "#EC4899",
      Other: "#64748B",
    };

    const collectionPaymentMethods = Object.entries(methodTotals)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        percentage:
          totalCreditCollected > 0
            ? Math.round((value / totalCreditCollected) * 100)
            : 0,
        color: methodColors[name] || "#64748B",
      }))
      .sort((a, b) => b.value - a.value);

    // 6-Month Monthly Trend (Issued vs Collected)
    const tCredits = trendCreditsRes.data || [];
    const tPayments = trendPaymentsRes.data || [];

    const creditTrend = recent6Months.map((m) => {
      let issued = 0;
      let collected = 0;

      for (const c of tCredits) {
        if (c.credit_date >= m.startDate && c.credit_date <= m.endDate) {
          issued += Number(c.original_amount || 0);
        }
      }

      for (const p of tPayments) {
        if (p.payment_date >= m.startDate && p.payment_date <= m.endDate) {
          collected += Number(p.amount || 0);
        }
      }

      return {
        month: m.label,
        issued: Math.round(issued),
        collected: Math.round(collected),
      };
    });

    return {
      totalCreditIssued: Math.round(totalCreditIssued * 100) / 100,
      totalCreditCollected: Math.round(totalCreditCollected * 100) / 100,
      currentOutstandingCredit: summaryRes.totalOutstanding,
      currentOverdueCredit: summaryRes.totalOverdue,
      creditTrend,
      collectionPaymentMethods,
      customerOutstandingList: customerGroupedRes,
    };
  } catch (err) {
    console.error("Error in getCustomerCreditReports:", err);
    return {
      totalCreditIssued: 0,
      totalCreditCollected: 0,
      currentOutstandingCredit: 0,
      currentOverdueCredit: 0,
      creditTrend: [],
      collectionPaymentMethods: [],
      customerOutstandingList: [],
    };
  }
}
