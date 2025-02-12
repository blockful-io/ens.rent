/**
 * Ensures that the input ENS name ends with ".eth".
 * If the name already ends with ".eth" (case-insensitive),
 * the original name is returned. Otherwise, ".eth" is appended.
 *
 * @param name - The input ENS name.
 * @returns The ENS name with the ".eth" suffix.
 */
export function ensureEthSuffix(
  name: string | null | undefined
): string | null {
  if (!name) return null;

  // Trim any accidental whitespace
  const trimmedName = name.trim();

  // Check if the name already ends with .eth (case-insensitive)
  if (!trimmedName.toLowerCase().endsWith('.eth')) {
    return `${trimmedName}.eth`;
  }
  return trimmedName;
}
