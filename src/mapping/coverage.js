#!/usr/bin/env node
// Run with: node src/mapping/coverage.js
// Validates mapping table completeness against known axe rule WCAG tags.

import { decodeWcagTag, WCAG_SC_LIST } from './wcag-sc-list.js'
import { WCAG_TO_RGAA } from './wcag-to-rgaa.js'
import { WCAG_TO_RAWEB, RAWEB_NORM_ONLY } from './wcag-to-raweb.js'
import { RULE_CRITERIA } from './rule-overrides.js'
import { tagsToWcagScs, scsToRgaa, scsToRaweb } from './index.js'

let pass = 0
let fail = 0

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`)
    pass++
  } else {
    console.error(`  ✗ ${label}${detail ? ': ' + detail : ''}`)
    fail++
  }
}

// ── 1. Tag decoder ────────────────────────────────────────────────────────────
console.log('\n[1] Tag decoder')

const cases = [
  ['wcag111',  '1.1.1'],
  ['wcag143',  '1.4.3'],
  ['wcag1412', '1.4.12'],
  ['wcag258',  '2.5.8'],
  ['wcag412',  '4.1.2'],
  ['wcag2aa',  null],    // conformance-level tag, not an SC
  ['wcag21aa', null],
  ['best-practice', null],
]
for (const [tag, expected] of cases) {
  assert(`decodeWcagTag("${tag}") === ${JSON.stringify(expected)}`, decodeWcagTag(tag) === expected)
}

// Every SC in WCAG_SC_LIST must round-trip through the decoder
let roundTripFails = 0
for (const sc of WCAG_SC_LIST) {
  const tag = 'wcag' + sc.replaceAll('.', '')
  if (decodeWcagTag(tag) !== sc) {
    console.error(`  ✗ round-trip fail: ${tag} → ${decodeWcagTag(tag)} (expected ${sc})`)
    roundTripFails++
    fail++
  } else {
    pass++
  }
}
if (roundTripFails === 0) console.log(`  ✓ all ${WCAG_SC_LIST.length} SCs round-trip correctly`)

// ── 2. tagsToWcagScs ─────────────────────────────────────────────────────────
console.log('\n[2] tagsToWcagScs')

assert(
  'filters conformance-level tags, deduplicates',
  JSON.stringify(tagsToWcagScs(['wcag2aa', 'wcag143', 'wcag143', 'best-practice', 'wcag412'])) === '["1.4.3","4.1.2"]'
)
assert(
  'empty input returns empty array',
  tagsToWcagScs([]).length === 0
)

// ── 3. Mapping tables — structural checks ─────────────────────────────────────
console.log('\n[3] Mapping table integrity')

// All keys in WCAG_TO_RGAA must be known SCs
const rgaaKeys = Object.keys(WCAG_TO_RGAA)
const unknownRgaaKeys = rgaaKeys.filter(k => !WCAG_SC_LIST.includes(k))
assert(`WCAG_TO_RGAA: all ${rgaaKeys.length} keys are valid WCAG SCs`, unknownRgaaKeys.length === 0, unknownRgaaKeys.join(', '))

// All keys in WCAG_TO_RAWEB must be known SCs
const rawebKeys = Object.keys(WCAG_TO_RAWEB)
const unknownRawebKeys = rawebKeys.filter(k => !WCAG_SC_LIST.includes(k))
assert(`WCAG_TO_RAWEB: all ${rawebKeys.length} keys are valid WCAG SCs`, unknownRawebKeys.length === 0, unknownRawebKeys.join(', '))

// All RGAA criterion IDs must match format /^\d+\.\d+$/
const badRgaaIds = Object.entries(WCAG_TO_RGAA).flatMap(([sc, ids]) => ids.filter(id => !/^\d+\.\d+$/.test(id)).map(id => `${sc}→${id}`))
assert(`WCAG_TO_RGAA: all criterion IDs have correct format`, badRgaaIds.length === 0, badRgaaIds.join(', '))

// RAWeb must be a subset of RGAA for shared SCs
const rawebNotInRgaa = []
for (const [sc, rawebIds] of Object.entries(WCAG_TO_RAWEB)) {
  const rgaaIds = WCAG_TO_RGAA[sc] ?? []
  for (const id of rawebIds) {
    if (!rgaaIds.includes(id)) rawebNotInRgaa.push(`SC ${sc}: RAWeb ${id} not in RGAA`)
  }
}
assert('RAWeb criteria are a subset of RGAA for all shared SCs', rawebNotInRgaa.length === 0, rawebNotInRgaa.slice(0, 3).join('; '))

// RAWEB_NORM_ONLY must not overlap with WCAG_TO_RAWEB criterion IDs
const rawebWcagIds = new Set(Object.values(WCAG_TO_RAWEB).flat())
const normOnlyConflicts = RAWEB_NORM_ONLY.filter(c => rawebWcagIds.has(c.id)).map(c => c.id)
assert('RAWEB_NORM_ONLY IDs do not overlap with WCAG-anchored RAWeb criteria', normOnlyConflicts.length === 0, normOnlyConflicts.join(', '))

// ── 3b. Rule-level override integrity ────────────────────────────────────────
console.log('\n[3b] Rule override integrity')

// All RAWeb criteria in overrides must also appear in the RGAA override (shared numbering)
const overrideSubsetViolations = []
for (const [rule, { rgaa, raweb }] of Object.entries(RULE_CRITERIA)) {
  for (const id of raweb) {
    if (!rgaa.includes(id)) overrideSubsetViolations.push(`${rule}: RAWeb ${id} not in RGAA override`)
  }
}
assert('Override RAWeb criteria are a subset of override RGAA criteria', overrideSubsetViolations.length === 0, overrideSubsetViolations.slice(0, 3).join('; '))

// All criterion IDs in overrides must match format /^\d+\.\d+$/
const badOverrideIds = Object.entries(RULE_CRITERIA).flatMap(([rule, { rgaa, raweb }]) =>
  [...rgaa, ...raweb].filter(id => !/^\d+\.\d+$/.test(id)).map(id => `${rule}→${id}`)
)
assert('Override criterion IDs all have correct format', badOverrideIds.length === 0, badOverrideIds.join(', '))

console.log(`  Rule overrides defined: ${Object.keys(RULE_CRITERIA).length} rules`)

// ── 4. Coverage gaps ──────────────────────────────────────────────────────────
console.log('\n[4] Coverage report')

// SCs covered by our RGAA map
const rgaaCoveredScs = new Set(Object.keys(WCAG_TO_RGAA))
const rawebCoveredScs = new Set(Object.keys(WCAG_TO_RAWEB))

// SCs in WCAG 2.2 list but absent from both maps (manual-only or AAA)
const uncoveredScs = WCAG_SC_LIST.filter(sc => !rgaaCoveredScs.has(sc) && !rawebCoveredScs.has(sc))
console.log(`  WCAG SCs with no RGAA or RAWeb mapping (manual-only / AAA / WCAG 2.2 additions):`)
console.log(`    ${uncoveredScs.join(', ')}`)

console.log(`  RGAA mapping: ${rgaaKeys.length} SCs → criteria in 13 topics`)
console.log(`  RAWeb mapping: ${rawebKeys.length} SCs → criteria in 7 topics`)
console.log(`  RAWeb EN 301 549-only criteria (no axe coverage): ${RAWEB_NORM_ONLY.map(c => c.id).join(', ')}`)

// ── 5. End-to-end enrichment smoke test ───────────────────────────────────────
console.log('\n[5] Enrichment smoke test')

const mockViolation = {
  ruleId: 'image-alt',
  impact: 'critical',
  wcagTags: ['wcag111', 'wcag2a', 'wcag412'],
}
const enriched = {
  ...mockViolation,
  criteria: {
    wcag: tagsToWcagScs(mockViolation.wcagTags),
    rgaa: scsToRgaa(tagsToWcagScs(mockViolation.wcagTags)),
    raweb: scsToRaweb(tagsToWcagScs(mockViolation.wcagTags)),
  },
}
assert('image-alt → wcag includes 1.1.1 and 4.1.2', enriched.criteria.wcag.includes('1.1.1') && enriched.criteria.wcag.includes('4.1.2'))
assert('image-alt → rgaa includes 1.1 (from 1.1.1)', enriched.criteria.rgaa.includes('1.1'))
assert('image-alt → raweb includes 1.1 (from 1.1.1)', enriched.criteria.raweb.includes('1.1'))
assert('image-alt → rgaa includes 1.2 (from 4.1.2)', enriched.criteria.rgaa.includes('1.2'))
assert('image-alt → wcag does NOT include conformance-level tags', !enriched.criteria.wcag.includes('wcag2a'))

// Rule-level override smoke tests
import { enrichViolation } from './index.js'

const listViolation = enrichViolation({ ruleId: 'list', impact: 'moderate', wcagTags: ['wcag131', 'wcag2a'], nodes: [] })
assert('list → rgaa is exactly [9.3]', JSON.stringify(listViolation.criteria.rgaa) === '["9.3"]')
assert('list → raweb is empty (RAWeb has no list topic)', listViolation.criteria.raweb.length === 0)
assert('list → wcag includes 1.3.1', listViolation.criteria.wcag.includes('1.3.1'))

const labelViolation = enrichViolation({ ruleId: 'label', impact: 'critical', wcagTags: ['wcag412', 'wcag2a'], nodes: [] })
assert('label → rgaa is [11.1, 11.2]', JSON.stringify(labelViolation.criteria.rgaa) === '["11.1","11.2"]')
assert('label → raweb is empty (RAWeb has no forms topic)', labelViolation.criteria.raweb.length === 0)

const colorViolation = enrichViolation({ ruleId: 'color-contrast', impact: 'serious', wcagTags: ['wcag143', 'wcag2aa'], nodes: [] })
assert('color-contrast → rgaa is [3.2]', JSON.stringify(colorViolation.criteria.rgaa) === '["3.2"]')
assert('color-contrast → raweb is [3.2] (shared topic)', JSON.stringify(colorViolation.criteria.raweb) === '["3.2"]')

console.log(`\n  Enriched sample:\n${JSON.stringify(enriched, null, 4)}`)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`  ${pass} passed  ${fail > 0 ? fail + ' FAILED' : '0 failed'}`)
if (fail > 0) process.exit(1)
