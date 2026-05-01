import { decodeWcagTag } from './wcag-sc-list.js'
import { WCAG_TO_RGAA } from './wcag-to-rgaa.js'
import { WCAG_TO_RAWEB } from './wcag-to-raweb.js'

/**
 * Decode axe wcag* tags into WCAG SC strings, deduplicated and sorted.
 *
 * @param {string[]} wcagTags  e.g. ["wcag111", "wcag412", "wcag2a", "best-practice"]
 * @returns {string[]}  e.g. ["1.1.1", "4.1.2"]
 */
export function tagsToWcagScs(wcagTags) {
  const scs = new Set()
  for (const tag of wcagTags) {
    const sc = decodeWcagTag(tag)
    if (sc) scs.add(sc)
  }
  return [...scs].sort()
}

/**
 * Resolve WCAG SCs to RGAA 4.1.2 criterion IDs, deduplicated and sorted.
 *
 * @param {string[]} scs  e.g. ["1.1.1", "4.1.2"]
 * @returns {string[]}  e.g. ["1.1", "1.2", "8.2"]
 */
export function scsToRgaa(scs) {
  const ids = new Set()
  for (const sc of scs) {
    for (const id of WCAG_TO_RGAA[sc] ?? []) ids.add(id)
  }
  return sortCriteriaIds([...ids])
}

/**
 * Resolve WCAG SCs to RAWeb 1.1 criterion IDs, deduplicated and sorted.
 *
 * @param {string[]} scs  e.g. ["1.1.1", "4.1.2"]
 * @returns {string[]}  e.g. ["1.1", "1.2"]
 */
export function scsToRaweb(scs) {
  const ids = new Set()
  for (const sc of scs) {
    for (const id of WCAG_TO_RAWEB[sc] ?? []) ids.add(id)
  }
  return sortCriteriaIds([...ids])
}

/**
 * Enrich a single axe violation with mapped criteria for all three referentials.
 *
 * Input violation shape (from axe-runner.js):
 *   { ruleId, impact, description, helpUrl, wcagTags, nodes }
 *
 * Output adds:
 *   { criteria: { wcag: string[], rgaa: string[], raweb: string[] } }
 *
 * @param {object} violation
 * @returns {object}
 */
export function enrichViolation(violation) {
  const wcag = tagsToWcagScs(violation.wcagTags)
  return {
    ...violation,
    criteria: {
      wcag,
      rgaa: scsToRgaa(wcag),
      raweb: scsToRaweb(wcag),
    },
  }
}

/**
 * Enrich all violations from a scan result in-place (returns a new array).
 *
 * @param {object[]} violations
 * @returns {object[]}
 */
export function enrichViolations(violations) {
  return violations.map(enrichViolation)
}

// Sort criterion IDs numerically by topic then criterion (e.g. "10.2" after "9.4").
function sortCriteriaIds(ids) {
  return ids.sort((a, b) => {
    const [at, ac] = a.split('.').map(Number)
    const [bt, bc] = b.split('.').map(Number)
    return at !== bt ? at - bt : ac - bc
  })
}
