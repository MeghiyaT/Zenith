/**
 * format.js — standalone formatting utilities
 *
 * formatXLM: converts a stroop integer (or XLM string/number) to a
 * display string with exactly 7 decimal places, no scientific notation.
 *
 * Used by the tracker and send form.  Isolated here so it can be
 * imported by tests without pulling in the full stellar-sdk bundle.
 */

const STROOPS_PER_XLM = 10_000_000;

/**
 * Format stroops as an XLM display string.
 *
 * Rules (from PRD v1.2 D.2 Test 3):
 *  - Always 7 decimal places
 *  - Truncated, not rounded, beyond 7 places
 *  - Never uses scientific notation for any valid stroop value
 *  - Appends " XLM" suffix
 *
 * @param {number|string} stroops  Amount in stroops (integer)
 * @returns {string}  e.g. "1.0000000 XLM"
 */
export function formatXLM(stroops) {
  const n = typeof stroops === 'string' ? parseInt(stroops, 10) : Math.trunc(Number(stroops));

  if (isNaN(n)) return '0.0000000 XLM';

  // Use integer arithmetic to avoid floating-point drift
  const wholePart = Math.trunc(n / STROOPS_PER_XLM);
  const remainder = Math.abs(n % STROOPS_PER_XLM);

  // Pad remainder to 7 digits
  const decimalStr = String(remainder).padStart(7, '0');

  return `${wholePart}.${decimalStr} XLM`;
}
