import { createClient } from "@/lib/supabase/client";
import { DailySale as DbDailySale } from "@/lib/supabase/types";
import { DailySale } from "@/types/shop";
import {
  toISODateString,
  getCurrentMonthDateRange,
  getPreviousMonthDateRange,
  formatDate,
} from "@/lib/date";
import { getAuthenticatedShopWorkspace } from "./workspace";

export interface CreateDailySaleInput {
  date: string;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  otherSales: number;
  notes?: string;
}

export interface UpdateDailySaleInput {
  date?: string;
  cashSales?: number;
  upiSales?: number;
  cardSales?: number;
  otherSales?: number;
  notes?: string;
}

export interface GetDailySalesOptions {
  workspaceId: string;
  page?: number;
  pageSize?: number;
  preset?: "today" | "yesterday" | "this-week" | "this-month" | "last-month" | "custom" | "all" | string;
  startDate?: string;
  endDate?: string;
  month?: string; // Format "YYYY-MM"
  search?: string;
}

export interface DailySalesSummary {
  totalSales: number;
  totalCash: number;
  totalUpi: number;
  totalCard: number;
  totalOther: number;
  totalOnline: number;
  daysRecorded: number;
}

export interface DailySalesResult {
  sales: DailySale[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: DailySalesSummary;
}

/**
 * Derived total sales helper: cash + upi + card + other
 */
export function calculateDailySalesTotal(
  cash: number = 0,
  upi: number = 0,
  card: number = 0,
  other: number = 0
): number {
  return (
    Math.round(
      (Number(cash || 0) + Number(upi || 0) + Number(card || 0) + Number(other || 0)) * 100
    ) / 100
  );
}

/**
 * Online sales calculation helper: UPI + Card + Other
 */
export function calculateOnlineSales(
  upi: number = 0,
  card: number = 0,
  other: number = 0
): number {
  return (
    Math.round((Number(upi || 0) + Number(card || 0) + Number(other || 0)) * 100) / 100
  );
}

/**
 * Map Supabase daily_sales row to UI DailySale model
 */
export function mapDbDailySaleToUi(row: DbDailySale): DailySale {
  const cash = Number(row.cash_amount || 0);
  const upi = Number(row.upi_amount || 0);
  const card = Number(row.card_amount || 0);
  const other = Number(row.other_amount || 0);
  const total = calculateDailySalesTotal(cash, upi, card, other);

  return {
    id: row.id,
    date: row.sale_date,
    cashSales: cash,
    upiSales: upi,
    cardSales: card,
    otherSales: other,
    totalSales: total,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Get date range for preset string
 */
function resolveDateRange(
  preset?: string,
  startDate?: string,
  endDate?: string,
  month?: string
): { start?: string; end?: string } {
  const now = new Date();
  const todayStr = toISODateString(now);

  if (month) {
    const [yStr, mStr] = month.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(y) && !isNaN(m)) {
      const lastDay = new Date(y, m, 0).getDate();
      return {
        start: `${y}-${String(m).padStart(2, "0")}-01`,
        end: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      };
    }
  }

  if (preset === "today") {
    return { start: todayStr, end: todayStr };
  }

  if (preset === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = toISODateString(yesterday);
    return { start: yesterdayStr, end: yesterdayStr };
  }

  if (preset === "this-week") {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7; // Distance to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: toISODateString(monday), end: toISODateString(sunday) };
  }

  if (preset === "this-month") {
    const r = getCurrentMonthDateRange(now);
    return { start: r.startDate, end: r.endDate };
  }

  if (preset === "last-month") {
    const r = getPreviousMonthDateRange(now);
    return { start: r.startDate, end: r.endDate };
  }

  if (preset === "last-3-months") {
    const startD = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endR = getCurrentMonthDateRange(now);
    return { start: toISODateString(startD), end: endR.endDate };
  }

  if (preset === "last-6-months") {
    const startD = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endR = getCurrentMonthDateRange(now);
    return { start: toISODateString(startD), end: endR.endDate };
  }

  if (preset === "this-year") {
    const y = now.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }

  if (startDate || endDate) {
    return { start: startDate, end: endDate };
  }

  return {};
}

/**
 * Fetch paginated daily sales records with filtering, search, and aggregate summary.
 */
export async function getDailySales(
  options: GetDailySalesOptions
): Promise<DailySalesResult> {
  const supabase = createClient();
  const { workspaceId, page = 1, pageSize = 20, preset, startDate, endDate, month, search } =
    options;

  const defaultSummary: DailySalesSummary = {
    totalSales: 0,
    totalCash: 0,
    totalUpi: 0,
    totalCard: 0,
    totalOther: 0,
    totalOnline: 0,
    daysRecorded: 0,
  };

  try {
    const dateRange = resolveDateRange(preset, startDate, endDate, month);

    // Build base query
    let query = supabase
      .from("daily_sales")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspaceId);

    if (dateRange.start) {
      query = query.gte("sale_date", dateRange.start);
    }
    if (dateRange.end) {
      query = query.lte("sale_date", dateRange.end);
    }
    if (search && search.trim()) {
      const s = search.trim();
      query = query.ilike("notes", `%${s}%`);
    }

    // Sort newest date first
    query = query.order("sale_date", { ascending: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching daily sales:", error.message);
      return {
        sales: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        summary: defaultSummary,
      };
    }

    const sales = (data || []).map(mapDbDailySaleToUi);
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    // Fetch aggregate summary for the entire filtered date range without pagination
    let summaryQuery = supabase
      .from("daily_sales")
      .select("cash_amount, upi_amount, card_amount, other_amount")
      .eq("workspace_id", workspaceId);

    if (dateRange.start) {
      summaryQuery = summaryQuery.gte("sale_date", dateRange.start);
    }
    if (dateRange.end) {
      summaryQuery = summaryQuery.lte("sale_date", dateRange.end);
    }
    if (search && search.trim()) {
      summaryQuery = summaryQuery.ilike("notes", `%${search.trim()}%`);
    }

    const { data: summaryData } = await summaryQuery;

    let totalCash = 0;
    let totalUpi = 0;
    let totalCard = 0;
    let totalOther = 0;

    if (summaryData) {
      for (const row of summaryData) {
        totalCash += Number(row.cash_amount || 0);
        totalUpi += Number(row.upi_amount || 0);
        totalCard += Number(row.card_amount || 0);
        totalOther += Number(row.other_amount || 0);
      }
    }

    const totalSales = calculateDailySalesTotal(totalCash, totalUpi, totalCard, totalOther);
    const totalOnline = calculateOnlineSales(totalUpi, totalCard, totalOther);

    return {
      sales,
      totalCount,
      page,
      pageSize,
      totalPages,
      summary: {
        totalSales,
        totalCash,
        totalUpi,
        totalCard,
        totalOther,
        totalOnline,
        daysRecorded: summaryData?.length || totalCount,
      },
    };
  } catch (err) {
    console.error("Unexpected error in getDailySales:", err);
    return {
      sales: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      summary: defaultSummary,
    };
  }
}

/**
 * Fetch a single daily sales record by date.
 */
export async function getDailySaleByDate(
  workspaceId: string,
  date: string
): Promise<DailySale | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("daily_sales")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("sale_date", date)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapDbDailySaleToUi(data);
  } catch {
    return null;
  }
}

/**
 * Fetch a single daily sales record by ID.
 */
export async function getDailySaleById(
  workspaceId: string,
  id: string
): Promise<DailySale | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("daily_sales")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapDbDailySaleToUi(data);
  } catch {
    return null;
  }
}

/**
 * Get today's sales summary and status for the shop.
 */
export async function getTodaySales(workspaceId: string): Promise<{
  todaySale: DailySale | null;
  isRecorded: boolean;
  totalSales: number;
  cashSales: number;
  onlineSales: number;
}> {
  const todayStr = toISODateString(new Date());
  const todaySale = await getDailySaleByDate(workspaceId, todayStr);

  if (!todaySale) {
    return {
      todaySale: null,
      isRecorded: false,
      totalSales: 0,
      cashSales: 0,
      onlineSales: 0,
    };
  }

  return {
    todaySale,
    isRecorded: true,
    totalSales: todaySale.totalSales,
    cashSales: todaySale.cashSales,
    onlineSales: calculateOnlineSales(
      todaySale.upiSales,
      todaySale.cardSales,
      todaySale.otherSales
    ),
  };
}

/**
 * Create a new Daily Sale entry.
 * Validates authenticated shop workspace, amounts, and prevents duplicate date entries.
 */
export async function createDailySale(
  input: CreateDailySaleInput
): Promise<{ data: DailySale | null; error: string | null }> {
  const authWs = await getAuthenticatedShopWorkspace();
  if (!authWs) {
    return { data: null, error: "Unauthorized or shop workspace not found." };
  }

  const { userId, workspaceId } = authWs;
  const cash = Number(input.cashSales || 0);
  const upi = Number(input.upiSales || 0);
  const card = Number(input.cardSales || 0);
  const other = Number(input.otherSales || 0);

  if (cash < 0 || upi < 0 || card < 0 || other < 0) {
    return { data: null, error: "Sales amounts cannot be negative." };
  }

  const total = calculateDailySalesTotal(cash, upi, card, other);
  if (total <= 0) {
    return { data: null, error: "Enter at least one sales amount greater than 0." };
  }

  if (!input.date) {
    return { data: null, error: "Sales date is required." };
  }

  const supabase = createClient();

  // 1. Check for duplicate closing entry on this date
  const existing = await getDailySaleByDate(workspaceId, input.date);
  if (existing) {
    return {
      data: null,
      error: `Sales for ${formatDate(input.date)} already exist. Edit the existing entry instead.`,
    };
  }

  try {
    const { data, error } = await supabase
      .from("daily_sales")
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        sale_date: input.date,
        cash_amount: cash,
        upi_amount: upi,
        card_amount: card,
        other_amount: other,
        notes: input.notes?.trim() || null,
      })
      .select("*")
      .single();

    if (error || !data) {
      if (error?.code === "23505" || error?.message?.includes("duplicate") || error?.message?.includes("unique")) {
        return {
          data: null,
          error: `Sales for this date already exist. Edit the existing entry instead.`,
        };
      }
      return { data: null, error: error?.message || "Failed to record daily sales." };
    }

    return { data: mapDbDailySaleToUi(data), error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { data: null, error: message };
  }
}

/**
 * Update an existing Daily Sale entry.
 * Validates amounts and prevents duplicate date collision if date changed.
 */
export async function updateDailySale(
  id: string,
  input: UpdateDailySaleInput
): Promise<{ data: DailySale | null; error: string | null }> {
  const authWs = await getAuthenticatedShopWorkspace();
  if (!authWs) {
    return { data: null, error: "Unauthorized or shop workspace not found." };
  }

  const { workspaceId } = authWs;
  const supabase = createClient();

  // 1. Fetch current record
  const current = await getDailySaleById(workspaceId, id);
  if (!current) {
    return { data: null, error: "Sales record not found." };
  }

  const newDate = input.date !== undefined ? input.date : current.date;
  const cash = input.cashSales !== undefined ? Number(input.cashSales) : current.cashSales;
  const upi = input.upiSales !== undefined ? Number(input.upiSales) : current.upiSales;
  const card = input.cardSales !== undefined ? Number(input.cardSales) : current.cardSales;
  const other = input.otherSales !== undefined ? Number(input.otherSales) : current.otherSales;

  if (cash < 0 || upi < 0 || card < 0 || other < 0) {
    return { data: null, error: "Sales amounts cannot be negative." };
  }

  const total = calculateDailySalesTotal(cash, upi, card, other);
  if (total <= 0) {
    return { data: null, error: "Enter at least one sales amount greater than 0." };
  }

  // 2. If date changed, check collision
  if (newDate !== current.date) {
    const { data: dateCollision } = await supabase
      .from("daily_sales")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("sale_date", newDate)
      .neq("id", id)
      .maybeSingle();

    if (dateCollision) {
      return {
        data: null,
        error: `A sales entry already exists for ${formatDate(newDate)}.`,
      };
    }
  }

  try {
    const { data, error } = await supabase
      .from("daily_sales")
      .update({
        sale_date: newDate,
        cash_amount: cash,
        upi_amount: upi,
        card_amount: card,
        other_amount: other,
        notes: input.notes !== undefined ? input.notes?.trim() || null : current.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (error || !data) {
      if (error?.code === "23505" || error?.message?.includes("duplicate") || error?.message?.includes("unique")) {
        return {
          data: null,
          error: `A sales entry already exists for ${formatDate(newDate)}.`,
        };
      }
      return { data: null, error: error?.message || "Failed to update daily sales." };
    }

    return { data: mapDbDailySaleToUi(data), error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { data: null, error: message };
  }
}

/**
 * Delete a Daily Sale entry.
 */
export async function deleteDailySale(
  id: string,
  workspaceId?: string
): Promise<{ success: boolean; error: string | null }> {
  const authWs = await getAuthenticatedShopWorkspace();
  if (!authWs) {
    return { success: false, error: "Unauthorized or shop workspace not found." };
  }

  const targetWsId = workspaceId || authWs.workspaceId;
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from("daily_sales")
      .delete()
      .eq("id", id)
      .eq("workspace_id", targetWsId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete sales record.";
    return { success: false, error: message };
  }
}
