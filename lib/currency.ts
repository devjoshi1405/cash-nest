/**
 * Indian Rupee (INR) Currency Utilities for CashNest
 */

export interface FormatINROptions {
  showSymbol?: boolean;
  decimals?: number;
  compact?: boolean;
  showSign?: boolean;
}

/**
 * Format a number into standard Indian Rupee format.
 * Example: 25000 -> ₹25,000 | 1500000 -> ₹15,00,000
 */
export function formatINR(
  amount: number | string | null | undefined,
  options: FormatINROptions = {}
): string {
  const {
    showSymbol = true,
    decimals = 0,
    compact = false,
    showSign = false,
  } = options;

  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return showSymbol ? "₹0" : "0";
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (compact) {
    let compactStr = "";
    if (absNum >= 10000000) {
      compactStr = `${(absNum / 10000000).toFixed(decimals > 0 ? decimals : 1)} Cr`;
    } else if (absNum >= 100000) {
      compactStr = `${(absNum / 100000).toFixed(decimals > 0 ? decimals : 1)} L`;
    } else if (absNum >= 1000) {
      compactStr = `${(absNum / 1000).toFixed(decimals > 0 ? decimals : 1)} k`;
    } else {
      compactStr = absNum.toString();
    }

    const sign = isNegative ? "- " : showSign && num > 0 ? "+ " : "";
    return `${sign}${showSymbol ? "₹" : ""}${compactStr}`;
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absNum);

  const sign = isNegative ? "- " : showSign && num > 0 ? "+ " : "";
  const symbol = showSymbol ? "₹" : "";

  return `${sign}${symbol}${formatted}`;
}

/**
 * Parse an INR formatted string or user input string to a clean number.
 */
export function parseINR(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/[^0-9.-]+/g, "");
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
