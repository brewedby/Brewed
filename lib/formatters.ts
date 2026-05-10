import { format, parseISO, isValid } from 'date-fns';

export function formatCurrency(value: number | null | undefined): string {
  const n = value == null || !Number.isFinite(value) ? 0 : value;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatCurrencyCompact(value: number | null | undefined): string {
  const n = value == null || !Number.isFinite(value) ? 0 : value;
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return formatCurrency(n);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  const n = value == null || !Number.isFinite(value) ? 0 : value;
  return `${n.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM');
  } catch {
    return dateStr;
  }
}

export function formatDateRange(startStr: string | null | undefined, endStr?: string | null): string {
  if (!startStr) return '';
  const start = formatDate(startStr);
  if (!endStr) return start;
  try {
    const startDate = parseISO(startStr);
    const endDate = parseISO(endStr);
    if (!isValid(startDate) || !isValid(endDate)) return start;
    if (format(startDate, 'MMM yyyy') === format(endDate, 'MMM yyyy')) {
      return `${format(startDate, 'd')}–${format(endDate, 'd MMM yyyy')}`;
    }
    return `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM yyyy')}`;
  } catch {
    return start;
  }
}

export function formatMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMM');
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
