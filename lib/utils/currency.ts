/**
 * Currency utilities for PHP (Philippine Peso).
 *
 * All internal amounts are integer centavos. These helpers convert
 * between centavos and display strings.
 *
 * RULE: Never use floating-point arithmetic for money calculations.
 * Use centavos (integers) for all math, convert to display only at render time.
 */

/**
 * Convert centavos to formatted peso string.
 * @example formatPeso(150025) → "₱1,500.25"
 * @example formatPeso(10000) → "₱100.00"
 * @example formatPeso(0) → "₱0.00"
 */
export function formatPeso(centavos: number): string {
  const isNegative = centavos < 0;
  const abs = Math.abs(centavos);
  const pesos = Math.floor(abs / 100);
  const cents = abs % 100;

  const formattedPesos = pesos.toLocaleString("en-PH");
  const formattedCents = cents.toString().padStart(2, "0");

  return `${isNegative ? "-" : ""}₱${formattedPesos}.${formattedCents}`;
}

/**
 * Convert a peso string input (e.g., "1500.25") to centavos.
 * Returns null if the input is invalid.
 * @example pesoInputToCentavos("1500.25") → 150025
 * @example pesoInputToCentavos("100") → 10000
 * @example pesoInputToCentavos("abc") → null
 */
export function pesoInputToCentavos(input: string): number | null {
  // Remove currency symbol, commas, whitespace
  const cleaned = input.replace(/[₱,\s]/g, "");

  if (!cleaned || isNaN(Number(cleaned))) return null;

  // Split on decimal point
  const parts = cleaned.split(".");
  const pesos = parseInt(parts[0], 10);

  if (isNaN(pesos)) return null;

  let centavos = 0;
  if (parts.length === 2) {
    const centStr = parts[1].padEnd(2, "0").slice(0, 2);
    centavos = parseInt(centStr, 10);
    if (isNaN(centavos)) return null;
  }

  return pesos * 100 + centavos;
}

/**
 * Format centavos as a compact display (no decimal when even).
 * @example formatPesoCompact(150000) → "₱1,500"
 * @example formatPesoCompact(150025) → "₱1,500.25"
 */
export function formatPesoCompact(centavos: number): string {
  const abs = Math.abs(centavos);
  if (abs % 100 === 0) {
    const pesos = Math.floor(abs / 100);
    return `${centavos < 0 ? "-" : ""}₱${pesos.toLocaleString("en-PH")}`;
  }
  return formatPeso(centavos);
}

/**
 * Format centavos as just the number portion without the ₱ symbol.
 * Useful for input fields.
 * @example centavosToDecimal(150025) → "1500.25"
 */
export function centavosToDecimal(centavos: number): string {
  const abs = Math.abs(centavos);
  const pesos = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${centavos < 0 ? "-" : ""}${pesos}.${cents.toString().padStart(2, "0")}`;
}
