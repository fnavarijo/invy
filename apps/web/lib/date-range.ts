import { fromZonedTime } from 'date-fns-tz';

export type DateRange = { issuedFrom: string; issuedTo: string };

export type DatePreset = 'last-30-days' | 'this-month' | 'last-month' | 'last-3-months' | 'this-year';

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  'last-30-days': 'Últimos 30 días',
  'this-month': 'Este mes',
  'last-month': 'Mes anterior',
  'last-3-months': 'Últimos 3 meses',
  'this-year': 'Este año',
};

/** All invoice "days" are SAT (Guatemala) days, independent of server/viewer timezone. */
export const BUSINESS_TIME_ZONE = 'America/Guatemala';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rejects rollover dates like 2026-02-30, which new Date() silently accepts as March 2. */
function isRealCalendarDate(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function startOfDayInBusinessTz(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00.000`, BUSINESS_TIME_ZONE);
}

function endOfDayInBusinessTz(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, BUSINESS_TIME_ZONE);
}

export function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date();

  switch (preset) {
    case 'last-30-days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { issuedFrom: from.toISOString(), issuedTo: to.toISOString() };
    }
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { issuedFrom: from.toISOString(), issuedTo: to.toISOString() };
    }
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { issuedFrom: from.toISOString(), issuedTo: to.toISOString() };
    }
    case 'last-3-months': {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { issuedFrom: from.toISOString(), issuedTo: to.toISOString() };
    }
    case 'this-year': {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { issuedFrom: from.toISOString(), issuedTo: to.toISOString() };
    }
  }
}

/** Default range shown on the dashboard: last 30 days */
export function defaultRange(): DateRange {
  return getPresetRange('last-30-days');
}

/**
 * Parses `issued_from` / `issued_to` URL search params as YYYY-MM-DD
 * Guatemala calendar dates (inclusive on both ends).
 * Falls back to the default range if params are missing or invalid.
 */
export function parseDateRangeParams(
  from: string | string[] | undefined,
  to: string | string[] | undefined,
): DateRange {
  const fallback = defaultRange();

  const fromStr = Array.isArray(from) ? from[0] : from;
  const toStr = Array.isArray(to) ? to[0] : to;

  if (!fromStr || !toStr) return fallback;
  if (!DATE_ONLY_RE.test(fromStr) || !DATE_ONLY_RE.test(toStr)) return fallback;
  if (!isRealCalendarDate(fromStr) || !isRealCalendarDate(toStr)) return fallback;
  // Lexicographic comparison is chronological for fixed-width ISO dates
  if (toStr < fromStr) return fallback;

  return {
    issuedFrom: startOfDayInBusinessTz(fromStr).toISOString(),
    issuedTo: endOfDayInBusinessTz(toStr).toISOString(),
  };
}

/** Formats a Date for display in es-GT locale */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formats an ISO string as a date-only value for <input type="date"> */
export function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}
