/**
 * Formatting helpers (Azerbaijani locale). Used across modules for money,
 * numbers and dates per SRS NUMERIC conventions (§3.5).
 */

const AZ_LOCALE = 'az-AZ';

/** Format a money amount as AZN (₼) — values are NUMERIC(15,2) on the backend. */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat(AZ_LOCALE, {
    style: 'currency',
    currency: 'AZN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Format a plain number with grouping. */
export function formatNumber(
  value: number | string | null | undefined,
  fractionDigits = 0,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat(AZ_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(num);
}

/**
 * Platform date standard: **dd.mm.yyyy**, everywhere, no exceptions.
 *
 * Built by hand rather than via `Intl` because the az-AZ locale renders months as "M08" and
 * abbreviates them in long formats ("avq", "iyn") — both are banned here. Where a written month
 * is genuinely wanted, {@link formatDateLong} spells it out in full ("3 avqust 2026").
 */
const AZ_MONTHS_FULL = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];

/** Parses an ISO date/timestamp, returning null when it isn't a usable date. */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** dd.mm.yyyy HH:mm */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDate(value)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** dd.mm.yyyy */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** "3 avqust 2026" — month spelled in full, never abbreviated. */
export function formatDateLong(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return `${date.getDate()} ${AZ_MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`;
}
