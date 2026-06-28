import { runCustomChecks } from './custom-checks.js'

// axe-core is loaded as a separate content script declared before this one in manifest.json
const axe = window.axe

// RGAA-relevant axe rules that ship tagged `experimental`. axe excludes those by
// default (audit.tagExclude = ['experimental','deprecated']), so they never fire
// from our tag-based runOnly even though their WCAG tags would otherwise match.
// A per-rule { enabled: true } short-circuits ruleShouldRun() *before* the tag
// logic, opting each one in without touching runOnly or un-excluding every
// experimental rule. Each closes a documented RGAA automation gap — see
// docs/rgaa-automation-coverage-diff.md §4 (Tier 1, #5). Validate for noise
// before shipping: these are experimental precisely because Deque considers them
// noisier than the stable set.
const CFX_EXPERIMENTAL_RULES = [
  'css-orientation-lock',         // RGAA 13.9 / WCAG 1.3.4 — orientation lock
  'p-as-heading',                 // RGAA 9.1  / WCAG 1.3.1 — styled <p> used as heading
  'table-fake-caption',           // RGAA 5.4  / WCAG 1.3.1 — caption faked with a cell/row
  'td-has-header',                // RGAA 5.7  / WCAG 1.3.1 — data cells without headers
  'label-content-name-mismatch',  // RGAA 6.1  / WCAG 2.5.3 — visible label not in accessible name
]

const CFX_RULE_OVERRIDES = Object.fromEntries(
  CFX_EXPERIMENTAL_RULES.map(id => [id, { enabled: true }]),
)

// Upgrade guard: if a future axe-core build renames or drops one of the rules we
// opt into above, our { enabled: true } silently no-ops and RGAA coverage quietly
// regresses. Compare our expected IDs against the engine's registered rules once
// and warn loudly if any have disappeared.
let cfxRulesVerified = false
function verifyExperimentalRules() {
  if (cfxRulesVerified) return
  cfxRulesVerified = true
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
  } catch (err) {
    console.warn('[CheckFox] could not verify axe rule availability:', err)
  }
}

// Guard: register the message listener only once per page load.
// The browser won't re-inject a declared content script, but this is
// defensive against future programmatic injection paths.
if (location.hostname === 'checkfox.eu' || location.hostname === 'www.checkfox.eu') {
  document.documentElement.setAttribute('data-cfx-installed', '')
}

if (!window.__checkfoxAxeRunner) {
  window.__checkfoxAxeRunner = true

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'run-scan') return false

    runScan().then(sendResponse).catch(err => {
      sendResponse({ success: false, error: err.message })
    })

    return true // keep message channel open for async response
  })
}

async function runScan() {
  // Wait for the page to settle before scanning. Important for SPAs where
  // content may be rendered after the initial document_idle event.
  if (document.readyState !== 'complete') {
    await new Promise(resolve => window.addEventListener('load', resolve, { once: true }))
  }

  verifyExperimentalRules()

  const results = await axe.run(document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    // Opt into the curated experimental rules above. Per-rule enabled overrides
    // win over runOnly/tagExclude, so these run without widening the tag set.
    rules: CFX_RULE_OVERRIDES,
    // Suppress axe's own iframe scanning — injecting into cross-origin
    // iframes requires additional host_permissions. Revisit in a later session.
    iframes: false,
  })

  const mapRule = v => ({
    ruleId: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    wcagTags: v.tags.filter(t => /^wcag\d/.test(t) || t === 'best-practice'),
    nodes: v.nodes.map(n => ({
      selector: n.target.join(', '),
      htmlSnippet: n.html,
      failureSummary: n.failureSummary,
    })),
  })

  const custom = runCustomChecks()

  return {
    success: true,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    violations: [...results.violations.map(mapRule), ...custom.violations],
    incomplete: [...results.incomplete.map(mapRule), ...custom.incomplete],
    passes: results.passes.map(v => ({ ruleId: v.id, description: v.description })),
  }
}
