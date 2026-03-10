// ============================================
// PSX Portfolio Tracker — Formatting Utilities
// ============================================

/**
 * Format a number as PKR currency
 * @example formatPKR(125000) → "PKR 125,000"
 * @example formatPKR(125000.50) → "PKR 125,000.50"
 */
export function formatPKR(value: number, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) return 'PKR 0';
  const formatted = Math.abs(value).toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `-PKR ${formatted}` : `PKR ${formatted}`;
}

/**
 * Format compact PKR for large numbers
 * @example formatPKRCompact(1250000) → "PKR 1.25M"
 */
export function formatPKRCompact(value: number): string {
  if (Math.abs(value) >= 10000000) return `PKR ${(value / 10000000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 100000) return `PKR ${(value / 100000).toFixed(2)}L`;
  if (Math.abs(value) >= 1000) return `PKR ${(value / 1000).toFixed(1)}K`;
  return formatPKR(value);
}

/**
 * Format a number as percentage
 * @example formatPercent(0.1523) → "15.23%"
 * @example formatPercent(15.23, false) → "15.23%" (already percentage)
 */
export function formatPercent(value: number, isDecimal: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  const pct = isDecimal ? value * 100 : value;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

/**
 * Format a date string
 * @example formatDate('2025-03-15') → "15 Mar 2025"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date as month-year
 * @example formatMonthYear('2025-03-15') → "March 2025"
 */
export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a plain number with commas
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Get quarter string from a date
 * @example getQuarter('2025-03-15') → "Q1 2025"
 */
export function getQuarter(dateStr: string): string {
  const date = new Date(dateStr);
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

/**
 * Return color class based on positive/negative value
 */
export function plColor(value: number): string {
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
}

/**
 * Return background color class based on positive/negative
 */
export function plBgColor(value: number): string {
  if (value > 0) return 'bg-emerald-50 dark:bg-emerald-950/30';
  if (value < 0) return 'bg-red-50 dark:bg-red-950/30';
  return 'bg-gray-50 dark:bg-gray-800';
}
