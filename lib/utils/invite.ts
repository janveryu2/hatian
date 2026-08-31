/**
 * Utilities for generating, formatting, and validating dorm invite codes.
 */

// Unambiguous character set (no 0/O, 1/I/L)
const CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a random 6-character invite code.
 * Example output: "K7M9P2"
 */
export function generateInviteCode(length = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARS.length);
    result += CHARS[randomIndex];
  }
  return result;
}

/**
 * Normalizes an entered invite code:
 * - Strips "DORM-" prefix if present
 * - Removes whitespace and hyphens
 * - Converts to uppercase
 */
export function normalizeInviteCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/^DORM[-_]?/, "")
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Formats a code with the standard "DORM-" prefix for display/sharing.
 */
export function formatDisplayCode(code: string): string {
  const clean = normalizeInviteCode(code);
  return `DORM-${clean}`;
}

/**
 * Returns ISO timestamp for invite expiration (default 24 hours from now).
 */
export function getInviteExpirationDate(hours = 24): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

/**
 * Checks whether an invite's expires_at date is in the past.
 */
export function isInviteExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}
