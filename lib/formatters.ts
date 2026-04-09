import { format, parseISO, isValid } from 'date-fns';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return formatCurrency(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM');
  } catch {
    return dateStr;
  }
}

export function formatDateRange(startStr: string, endStr?: string | null): string {
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
