// axe-core is loaded as a separate content script declared before this one in manifest.json
const axe = window.axe

// Guard: register the message listener only once per page load.
// The browser won't re-inject a declared content script, but this is
// defensive against future programmatic injection paths.
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

  const results = await axe.run(document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    // Suppress axe's own iframe scanning — injecting into cross-origin
    // iframes requires additional host_permissions. Revisit in a later session.
    iframes: false,
  })

  return {
    success: true,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    passesCount: results.passes.length,
    incompleteCount: results.incomplete.length,
    violations: results.violations.map(v => ({
      ruleId: v.id,
      impact: v.impact,
      description: v.description,
      helpUrl: v.helpUrl,
      wcagTags: v.tags.filter(t => /^wcag\d/.test(t) || t === 'best-practice'),
      nodes: v.nodes.map(n => ({
        selector: n.target.join(', '),
        htmlSnippet: n.html,
        failureSummary: n.failureSummary,
      })),
    })),
  }
}
