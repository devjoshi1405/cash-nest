/**
 * Date Utilities for CashNest
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Format date to "DD MMM YYYY" (e.g., "14 Sep 2026")
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const day = d.getDate().toString().padStart(2, "0");
  const month = MONTH_SHORT_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date to "DD MMM YYYY, hh:mm A"
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const datePart = formatDate(d);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours.toString().padStart(2, "0");

  return `${datePart}, ${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Get current Indian formatted date headline, e.g. "Monday, 14 September 2026"
 */
export function getTodayDisplayDate(): string {
  const d = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Get ISO date string "YYYY-MM-DD" for inputs
 */
export function toISODateString(dateInput: Date = new Date()): string {
  const year = dateInput.getFullYear();
  const month = (dateInput.getMonth() + 1).toString().padStart(2, "0");
  const day = dateInput.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get date range { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' } for a given year & month (1-indexed month: 1=Jan, 12=Dec)
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDayStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate: startDayStr, endDate: endDayStr };
}

/**
 * Get current month date range
 */
export function getCurrentMonthDateRange(now: Date = new Date()): { startDate: string; endDate: string } {
  return getMonthDateRange(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Get previous month date range
 */
export function getPreviousMonthDateRange(now: Date = new Date()): { startDate: string; endDate: string } {
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 12 : currentMonth;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  return getMonthDateRange(prevYear, prevMonth);
}

/**
 * Calculate days elapsed in the specified month up to today (or entire month if in the past)
 */
export function getDaysElapsedInMonth(year: number, month: number, now: Date = new Date()): number {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year === currentYear && month === currentMonth) {
    return Math.max(1, now.getDate());
  }
  const totalDays = new Date(year, month, 0).getDate();
  return totalDays;
}

/**
 * Get date range from preset string
 */
export function getDateRangeFromPreset(
  preset: "this-month" | "last-month" | "last-3-months" | "last-6-months" | "this-year" | "all" | string,
  now: Date = new Date()
): { startDate?: string; endDate?: string } {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  switch (preset) {
    case "this-month":
      return getCurrentMonthDateRange(now);
    case "last-month":
      return getPreviousMonthDateRange(now);
    case "last-3-months": {
      const startD = new Date(year, month - 3, 1);
      const endRange = getCurrentMonthDateRange(now);
      return {
        startDate: toISODateString(startD),
        endDate: endRange.endDate,
      };
    }
    case "last-6-months": {
      const startD = new Date(year, month - 6, 1);
      const endRange = getCurrentMonthDateRange(now);
      return {
        startDate: toISODateString(startD),
        endDate: endRange.endDate,
      };
    }
    case "this-year":
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    case "all":
    default:
      return {};
  }
}

/**
 * Returns an array of recent N months metadata (oldest to newest)
 */
export function getRecentMonths(count: number = 6, now: Date = new Date()): Array<{
  key: string; // "2026-09"
  label: string; // "Sep"
  fullLabel: string; // "Sep 2026"
  year: number;
  month: number;
  startDate: string;
  endDate: string;
}> {
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const range = getMonthDateRange(y, m);
    result.push({
      key: `${y}-${String(m).padStart(2, "0")}`,
      label: MONTH_SHORT_NAMES[m - 1],
      fullLabel: `${MONTH_SHORT_NAMES[m - 1]} ${y}`,
      year: y,
      month: m,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  }
  return result;
}

