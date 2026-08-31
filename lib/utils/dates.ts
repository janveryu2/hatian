/**
 * Date utilities for billing period calculations.
 */

/**
 * Calculate the number of days a member was present during a billing period.
 * Handles partial months (move-in/move-out mid-period).
 */
export function daysPresent(
  memberMoveIn: string,
  memberMoveOut: string | null,
  periodStart: string,
  periodEnd: string
): number {
  const moveIn = new Date(memberMoveIn);
  const moveOut = memberMoveOut ? new Date(memberMoveOut) : null;
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // Member's effective start in this period
  const effectiveStart = moveIn > start ? moveIn : start;

  // Member's effective end in this period
  const effectiveEnd = moveOut && moveOut < end ? moveOut : end;

  // If member wasn't present at all during this period
  if (effectiveStart > effectiveEnd) return 0;

  // Calculate days (inclusive of both start and end)
  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(0, diffDays);
}

/**
 * Total days in a billing period (inclusive).
 */
export function periodDays(periodStart: string, periodEnd: string): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Format a date as "MMM D" (e.g., "Aug 15").
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

/**
 * Format a date as "MMMM YYYY" (e.g., "August 2026").
 */
export function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

/**
 * Format a billing period range.
 * @example formatPeriod("2026-08-01", "2026-08-31") → "Aug 1 – 31, 2026"
 */
export function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);

  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();

  if (sameMonth) {
    const month = s.toLocaleDateString("en-PH", { month: "short" });
    const year = s.getFullYear();
    return `${month} ${s.getDate()} – ${e.getDate()}, ${year}`;
  }

  return `${formatShortDate(start)} – ${formatShortDate(end)}, ${e.getFullYear()}`;
}

/**
 * Days remaining until a due date.
 * Returns negative if past due.
 */
export function daysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  // Zero out time components
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the greeting based on current time.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Format today's date for the dashboard.
 * @example "Monday, August 31"
 */
export function formatToday(): string {
  return new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
