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
