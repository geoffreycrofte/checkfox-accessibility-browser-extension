// All WCAG 2.2 Success Criteria — used to decode axe's compact tag format (e.g. "wcag143" → "1.4.3").
// Sorted longest-first so the greedy decoder matches "1.4.12" before "1.4.1".
export const WCAG_SC_LIST = [
  // 1.1
  '1.1.1',
  // 1.2
  '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5',
  // 1.3
  '1.3.1', '1.3.2', '1.3.3', '1.3.4', '1.3.5', '1.3.6',
  // 1.4
  '1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5', '1.4.6', '1.4.7',
  '1.4.8', '1.4.9', '1.4.10', '1.4.11', '1.4.12', '1.4.13',
  // 2.1
  '2.1.1', '2.1.2', '2.1.3', '2.1.4',
  // 2.2
  '2.2.1', '2.2.2', '2.2.3', '2.2.4', '2.2.5', '2.2.6',
  // 2.3
  '2.3.1', '2.3.2', '2.3.3',
  // 2.4
  '2.4.1', '2.4.2', '2.4.3', '2.4.4', '2.4.5', '2.4.6', '2.4.7',
  '2.4.8', '2.4.9', '2.4.10', '2.4.11', '2.4.12', '2.4.13',
  // 2.5
  '2.5.1', '2.5.2', '2.5.3', '2.5.4', '2.5.5', '2.5.6', '2.5.7', '2.5.8',
  // 3.1
  '3.1.1', '3.1.2', '3.1.3', '3.1.4', '3.1.5', '3.1.6',
  // 3.2
  '3.2.1', '3.2.2', '3.2.3', '3.2.4', '3.2.5', '3.2.6', '3.2.7',
  // 3.3
  '3.3.1', '3.3.2', '3.3.3', '3.3.4', '3.3.5', '3.3.6', '3.3.7', '3.3.8', '3.3.9',
  // 4.1
  '4.1.1', '4.1.2', '4.1.3',
]

// Pre-build lookup: "143" → "1.4.3", "1412" → "1.4.12", etc.
// Longest-key wins if two SCs share a prefix (e.g. "141" vs "1410").
const _byDigits = new Map(
  // Sort descending by length so longer keys are checked first when iterating
  WCAG_SC_LIST
    .map(sc => [sc.replaceAll('.', ''), sc])
    .sort((a, b) => b[0].length - a[0].length)
)

/**
 * Decode an axe WCAG tag into a WCAG SC string.
 * Returns null for tags that aren't SC references (e.g. "wcag2aa", "best-practice").
 *
 * @param {string} tag  e.g. "wcag143", "wcag1412"
 * @returns {string|null}  e.g. "1.4.3", "1.4.12"
 */
export function decodeWcagTag(tag) {
  if (!tag.startsWith('wcag')) return null
  const digits = tag.slice(4) // strip "wcag"
  // Must be purely numeric and correspond to a known SC
  if (!/^\d+$/.test(digits)) return null
  return _byDigits.get(digits) ?? null
}
