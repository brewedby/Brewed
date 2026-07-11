/**
 * Safe event date-range expansion — THE way to turn an event's
 * date..end_date into a list of days.
 *
 * Root-cause context (the "LIV Golf" force-close): end_date is stored as
 * a free string with no relationship validation, and two components
 * rendered one row per day of the raw interval. date-fns v3 does not
 * throw on reversed or huge intervals — a typo'd end-date year quietly
 * returns thousands of Date objects, the screen renders thousands of
 * rows, and iOS's watchdog kills the app with no JS error.
 *
 * This builder is bounded and total: any input produces a small, valid
 * day list plus flags the UI can use to tell the user what happened.
 */

import { eachDayOfInterval, format, isValid, parseISO } from 'date-fns';

export interface EventDayRange {
  /** yyyy-MM-dd strings, oldest first. Never empty when start is valid. */
  days: string[];
  /** True when the requested span exceeded maxDays and was cut. */
  clamped: boolean;
  /** True when either date failed to parse. */
  invalid: boolean;
  /** True when end < start (dates were swapped to recover). */
  reversed: boolean;
  /** The span the data actually asked for, in days (1 = single day). */
  requestedSpanDays: number;
}

const MS_PER_DAY = 86_400_000;

export function safeEventDays(
  startISO: string | null | undefined,
  endISO: string | null | undefined,
  maxDays = 31,
): EventDayRange {
  const start = startISO ? parseISO(startISO) : new Date(NaN);
  const endRaw = endISO ? parseISO(endISO) : start;

  if (!isValid(start)) {
    // No usable start date — nothing safe to expand.
    return { days: [], clamped: false, invalid: true, reversed: false, requestedSpanDays: 0 };
  }

  let end = isValid(endRaw) ? endRaw : start;
  const invalid = !isValid(endRaw) && !!endISO;

  let reversed = false;
  let lo = start;
  let hi = end;
  if (hi.getTime() < lo.getTime()) {
    reversed = true;
    lo = end;
    hi = start;
  }

  const requestedSpanDays = Math.floor((hi.getTime() - lo.getTime()) / MS_PER_DAY) + 1;

  let clamped = false;
  if (requestedSpanDays > maxDays) {
    clamped = true;
    hi = new Date(lo.getTime() + (maxDays - 1) * MS_PER_DAY);
  }

  const days = eachDayOfInterval({ start: lo, end: hi }).map((d) => format(d, 'yyyy-MM-dd'));
  return { days, clamped, invalid, reversed, requestedSpanDays };
}
