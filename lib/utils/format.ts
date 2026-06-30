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

/** Format an ISO timestamp as a localized date-time. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(AZ_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/** Format an ISO timestamp / date as a localized date only. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(AZ_LOCALE, { dateStyle: 'medium' }).format(
    date,
  );
}
