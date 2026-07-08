import { runCustomChecks } from './custom-checks.js'
import {
  CFX_RULE_OVERRIDES,
  verifyExperimentalRules,
} from './axe-experimental-rules.js'

// axe-core is loaded as a separate content script declared before this one in manifest.json
const axe = window.axe

// The curated experimental-rule set (CFX_EXPERIMENTAL_RULES / CFX_RULE_OVERRIDES)
// and the upgrade guard (verifyExperimentalRules) are the SINGLE SOURCE OF TRUTH
// shared with the server-side scanner — see ./axe-experimental-rules.js. Keep a
// once-guard here so the guard warns at most once per page load; the shared
// verifyExperimentalRules(axe) is stateless and takes `axe` explicitly so it stays
// import-free and reusable in the injected bundle.
let cfxRulesVerified = false
function verifyRulesOnce() {
  if (cfxRulesVerified) return
  cfxRulesVerified = true
  verifyExperimentalRules(axe)
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

  verifyRulesOnce()

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
