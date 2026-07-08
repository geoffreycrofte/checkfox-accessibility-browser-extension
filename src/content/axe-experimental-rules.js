// CheckFox — curated axe-core experimental rules (RGAA/RAWeb Tier 1 #5).
//
// SINGLE SOURCE OF TRUTH. This file is consumed by BOTH:
//   • the browser extension (imports it in its axe runner), and
//   • the server-side Browserless scanner (bundled + injected — see
//     scripts/build-a11y-bundle.mjs and scanner.tsx).
// Edit here only; then run `npm run a11y:build` and `npm run a11y:sync`.
//
// These RGAA-relevant axe rules ship tagged `experimental`. axe excludes those by
// default (audit.tagExclude = ['experimental','deprecated']), so they never fire
// from a tag-based runOnly even though their WCAG tags would otherwise match. A
// per-rule { enabled: true } short-circuits ruleShouldRun() *before* the tag
// logic, opting each one in without touching runOnly or un-excluding every
// experimental rule. Each closes a documented RGAA automation gap — see
// docs/rgaa-automation-coverage-diff.md §4 (Tier 1, #5).

export const CFX_EXPERIMENTAL_RULES = [
  'css-orientation-lock',         // RGAA 13.9 / WCAG 1.3.4 — orientation lock
  'p-as-heading',                 // RGAA 9.1  / WCAG 1.3.1 — styled <p> used as heading
  'table-fake-caption',           // RGAA 5.4  / WCAG 1.3.1 — caption faked with a cell/row
  'td-has-header',                // RGAA 5.7  / WCAG 1.3.1 — data cells without headers
  'label-content-name-mismatch',  // RGAA 6.1  / WCAG 2.5.3 — visible label not in accessible name
]

export const CFX_RULE_OVERRIDES = Object.fromEntries(
  CFX_EXPERIMENTAL_RULES.map(id => [id, { enabled: true }]),
)

// Upgrade guard: if a future axe-core build renames or drops one of the rules we
// opt into above, our { enabled: true } silently no-ops and RGAA coverage quietly
// regresses. Compare our expected IDs against the engine's registered rules once
// and warn loudly if any have disappeared. `axe` is passed in so this stays
// import-free and usable in any context (page, extension, injected bundle).
export function verifyExperimentalRules(axe) {
  try {
    const available = new Set(axe.getRules().map(r => r.ruleId))
    const missing = CFX_EXPERIMENTAL_RULES.filter(id => !available.has(id))
    if (missing.length) {
      console.warn(
        `[CheckFox] axe-core ${axe.version || '(unknown version)'} no longer registers ` +
        `expected rule(s): ${missing.join(', ')}. RGAA automation coverage is reduced — ` +
        'see docs/rgaa-automation-coverage-diff.md §4.',
      )
    }
    return missing
  } catch (err) {
    console.warn('[CheckFox] could not verify axe rule availability:', err)
    return []
  }
}
