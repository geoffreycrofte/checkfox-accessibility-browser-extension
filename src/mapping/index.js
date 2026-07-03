import { decodeWcagTag } from './wcag-sc-list.js'
import { WCAG_TO_RGAA } from './wcag-to-rgaa.js'
import { WCAG_TO_RAWEB } from './wcag-to-raweb.js'
import { RULE_CRITERIA } from './rule-overrides.js'

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
  const override = RULE_CRITERIA[violation.ruleId]

  // Element-routed rule (e.g. Label-in-Name): resolve criteria per affected node
  // from its element type, attach them to each node, then surface the triggered
  // union at the violation level. `criteria.domain` carries the rule's full set
  // so the card can show every possible criterion and highlight the matched ones.
  if (override?.resolve) {
    const nodes = (violation.nodes ?? []).map(node => {
      const resolved = override.resolve(node) ?? { rgaa: override.rgaa, raweb: override.raweb }
      return {
        ...node,
        criteria: {
          rgaa:  sortCriteriaIds([...resolved.rgaa]),
          raweb: sortCriteriaIds([...resolved.raweb]),
        },
      }
    })
    const rgaa  = unionIds(nodes.map(n => n.criteria.rgaa))
    const raweb = unionIds(nodes.map(n => n.criteria.raweb))
    return {
      ...violation,
      nodes,
      criteria: {
        wcag,
        rgaa:  rgaa.length  ? rgaa  : sortCriteriaIds([...override.rgaa]),
        raweb: raweb.length ? raweb : sortCriteriaIds([...override.raweb]),
        domain: {
          rgaa:  sortCriteriaIds([...override.rgaa]),
          raweb: sortCriteriaIds([...override.raweb]),
        },
      },
    }
  }

  return {
    ...violation,
    criteria: {
      wcag,
      rgaa:   override ? sortCriteriaIds([...override.rgaa])   : scsToRgaa(wcag),
      raweb:  override ? sortCriteriaIds([...override.raweb])  : scsToRaweb(wcag),
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

// Deduplicated, sorted union of several criterion-id lists.
function unionIds(lists) {
  const set = new Set()
  for (const list of lists) for (const id of list) set.add(id)
  return sortCriteriaIds([...set])
}

// Sort criterion IDs numerically by topic then criterion (e.g. "10.2" after "9.4").
function sortCriteriaIds(ids) {
  return ids.sort((a, b) => {
    const [at, ac] = a.split('.').map(Number)
    const [bt, bc] = b.split('.').map(Number)
    return at !== bt ? at - bt : ac - bc
  })
}
