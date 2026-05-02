import { enrichViolations } from '../mapping/index.js'
import { TOOLS, TOOL_MAP, TOOL_GROUPS } from '../tools/index.js'

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initTabs()

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabId = tab?.id

  initScanPanel(tabId)
  await initToolsPanel(tabId)
})

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initTabs() {
  const tabs = document.querySelectorAll('[role="tab"]')
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('tab--active')
        t.setAttribute('aria-selected', 'false')
        document.getElementById(t.getAttribute('aria-controls')).hidden = true
      })
      tab.classList.add('tab--active')
      tab.setAttribute('aria-selected', 'true')
      document.getElementById(tab.getAttribute('aria-controls')).hidden = false
    })
  })
}

// ─── Scan panel ───────────────────────────────────────────────────────────────

function initScanPanel(tabId) {
  const scanBtn = document.getElementById('scan-btn')
  const statusEl = document.getElementById('status')
  const resultsEl = document.getElementById('results')

  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true
    scanBtn.textContent = 'Scanning…'
    statusEl.hidden = true
    resultsEl.hidden = true

    try {
      if (!tabId) { showStatus(statusEl, 'error', 'No active tab found.'); return }

      let response = await sendScanMessage(tabId)
      if (response === null) {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content/axe-runner.js'] })
        response = await sendScanMessage(tabId)
      }

      if (response?.success) {
        response.violations = enrichViolations(response.violations)
        renderResults(resultsEl, response)
        resultsEl.hidden = false
      } else if (response === null) {
        showStatus(statusEl, 'error', 'Could not reach the page. Check that the URL is not a browser-internal page.')
      } else {
        showStatus(statusEl, 'error', response?.error ?? 'Scan failed with an unknown error.')
      }
    } catch (err) {
      showStatus(statusEl, 'error', 'Could not reach the page. Check that the URL is not a browser-internal page.')
      console.error('[CheckFox]', err)
    } finally {
      scanBtn.disabled = false
      scanBtn.textContent = 'Run accessibility scan'
    }
  })
}

async function sendScanMessage(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { action: 'run-scan' })
  } catch {
    return null
  }
}

// ─── Tools panel ──────────────────────────────────────────────────────────────

async function initToolsPanel(tabId) {
  const container = document.getElementById('tools-list')

  // Load persisted state for this tab
  const stateKey = `tools_${tabId}`
  const stored = await chrome.storage.session.get(stateKey)
  const activeIds = new Set(stored[stateKey] ?? [])

  // Re-apply active tools (handles page reloads clearing injected CSS)
  if (tabId) {
    for (const id of activeIds) {
      const tool = TOOL_MAP[id]
      if (tool?.type === 'css') await injectCSS(tabId, tool.css)
      else if (tool?.type === 'js') await executeFunc(tabId, tool.inject, tool.args ?? [])
    }
  }

  const refreshSubtitle = () => updateHeaderSubtitle(activeIds, tabId, stateKey)

  // Render groups
  for (const group of TOOL_GROUPS) {
    const groupLabel = el('p', { class: 'tools-group-label' })
    groupLabel.textContent = group
    container.append(groupLabel)

    for (const tool of TOOLS.filter(t => t.group === group)) {
      container.append(buildToolRow(tool, activeIds.has(tool.id), tabId, activeIds, stateKey, refreshSubtitle))
    }
  }

  refreshSubtitle()
}

function updateHeaderSubtitle(activeIds, tabId, stateKey) {
  const subtitleEl = document.getElementById('header-subtitle')
  if (activeIds.size === 0) {
    subtitleEl.textContent = 'Accessibility Scanner'
    return
  }
  const count = activeIds.size
  subtitleEl.replaceChildren()
  const countSpan = document.createElement('span')
  countSpan.textContent = `${count} tool${count !== 1 ? 's' : ''} selected`
  const deselectBtn = document.createElement('button')
  deselectBtn.textContent = 'Deselect all'
  deselectBtn.className = 'header__deselect-btn'
  deselectBtn.addEventListener('click', async () => {
    await deactivateAll(tabId, activeIds, stateKey)
    updateHeaderSubtitle(activeIds, tabId, stateKey)
  })
  subtitleEl.append(countSpan, deselectBtn)
}

async function deactivateAll(tabId, activeIds, stateKey) {
  for (const id of [...activeIds]) {
    const tool = TOOL_MAP[id]
    if (!tool || !tabId) continue
    if (tool.type === 'css') await removeCSS(tabId, tool.css)
    else if (tool.type === 'js') await executeFunc(tabId, tool.remove)
    else if (tool.type === 'custom') await removeCSS(tabId, null, '__checkfox_custom')
  }
  activeIds.clear()
  await chrome.storage.session.set({ [stateKey]: [] })
  document.querySelectorAll('.tool-toggle--on').forEach(t => {
    t.classList.remove('tool-toggle--on')
    t.setAttribute('aria-pressed', 'false')
  })
  document.querySelectorAll('.tool-row--active').forEach(r => r.classList.remove('tool-row--active'))
}

function buildToolRow(tool, isActive, tabId, activeIds, stateKey, refreshSubtitle) {
  const row = el('div', { class: `tool-row${isActive ? ' tool-row--active' : ''}` })

  // Toggle button
  const toggle = el('button', {
    class: `tool-toggle${isActive ? ' tool-toggle--on' : ''}`,
    'aria-pressed': String(isActive),
    'aria-label': `Toggle ${tool.label}`,
  })

  // Info block
  const info = el('div', { class: 'tool-info' })
  const labelEl = el('span', { class: 'tool-label' })
  labelEl.textContent = tool.label
  const descEl = el('span', { class: 'tool-desc' })
  descEl.textContent = tool.description
  info.append(labelEl, descEl)

  if (tool.criteria.length > 0) {
    const criteriaEl = el('div', { class: 'tool-criteria' })
    for (const c of tool.criteria) {
      const badge = el('code', { class: 'tag' })
      badge.textContent = c
      criteriaEl.append(badge)
    }
    info.append(criteriaEl)
  }

  if (tool.legend?.length > 0) {
    const legendEl = el('div', { class: 'tool-legend' })
    for (const item of tool.legend) {
      const legendItem = el('div', { class: 'tool-legend-item' })
      const swatch = el('span', { class: 'tool-legend-swatch', style: `border: ${item.border}` })
      const swatchLabel = el('span')
      swatchLabel.textContent = item.label
      legendItem.append(swatch, swatchLabel)
      legendEl.append(legendItem)
    }
    info.append(legendEl)
  }

  row.append(toggle, info)

  // Custom CSS tool: add textarea + apply button
  if (tool.type === 'custom') {
    const customArea = el('div', { class: 'tool-custom-area' })
    const textarea = el('textarea', { placeholder: '/* your CSS here */', spellcheck: 'false', 'aria-label': 'Custom CSS' })
    const applyBtn = el('button', { class: 'btn btn--primary', type: 'button' })
    applyBtn.textContent = 'Apply'
    customArea.append(textarea, applyBtn)
    info.append(customArea)

    applyBtn.addEventListener('click', async () => {
      if (!tabId) return
      const css = textarea.value.trim()
      await injectCSS(tabId, css, '__checkfox_custom')
    })
  }

  toggle.addEventListener('click', async () => {
    const nowActive = !activeIds.has(tool.id)

    if (nowActive) {
      activeIds.add(tool.id)
      toggle.classList.add('tool-toggle--on')
      toggle.setAttribute('aria-pressed', 'true')
      row.classList.add('tool-row--active')

      if (tabId) {
        if (tool.type === 'css')    await injectCSS(tabId, tool.css)
        else if (tool.type === 'js') await executeFunc(tabId, tool.inject, tool.args ?? [])
      }
    } else {
      activeIds.delete(tool.id)
      toggle.classList.remove('tool-toggle--on')
      toggle.setAttribute('aria-pressed', 'false')
      row.classList.remove('tool-row--active')

      if (tabId) {
        if (tool.type === 'css')    await removeCSS(tabId, tool.css)
        else if (tool.type === 'js') await executeFunc(tabId, tool.remove)
        else if (tool.type === 'custom') await removeCSS(tabId, null, '__checkfox_custom')
      }
    }

    await chrome.storage.session.set({ [stateKey]: [...activeIds] })
    refreshSubtitle()
  })

  return row
}

// ─── CSS / JS injection helpers ───────────────────────────────────────────────

async function injectCSS(tabId, css, id) {
  const styleId = id ?? `__checkfox_${css.slice(16, 40).replace(/\W/g, '_')}`
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sid, code) => {
        document.getElementById(sid)?.remove()
        if (!code) return
        const s = document.createElement('style')
        s.id = sid
        s.textContent = code
        document.head.appendChild(s)
      },
      args: [styleId, css],
    })
  } catch (err) {
    console.warn('[CheckFox] injectCSS failed:', err)
  }
}

async function removeCSS(tabId, css, id) {
  const styleId = id ?? (css ? `__checkfox_${css.slice(16, 40).replace(/\W/g, '_')}` : null)
  if (!styleId) return
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sid) => { document.getElementById(sid)?.remove() },
      args: [styleId],
    })
  } catch (err) {
    console.warn('[CheckFox] removeCSS failed:', err)
  }
}

async function executeFunc(tabId, func, args = []) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func, args })
  } catch (err) {
    console.warn('[CheckFox] executeFunc failed:', err)
  }
}

// ─── Scan results rendering ───────────────────────────────────────────────────

function showStatus(el, type, message) {
  el.className = `status status--${type}`
  el.textContent = message
  el.hidden = false
}

function renderResults(container, data) {
  const { violations, passesCount, incompleteCount, url } = data
  container.replaceChildren()

  const summary = el('div', { class: 'summary', role: 'region', 'aria-label': 'Scan summary' })
  summary.append(
    badge('badge--error', `${violations.length} violation${violations.length !== 1 ? 's' : ''}`),
    badge('badge--warn', `${incompleteCount} incomplete`),
    badge('badge--ok', `${passesCount} passes`),
  )
  container.append(summary)

  const urlEl = el('p', { class: 'scan-url', title: url })
  urlEl.textContent = truncate(url, 60)
  container.append(urlEl)

  if (violations.length === 0) {
    const msg = el('p', { class: 'no-violations' })
    msg.textContent = 'No axe-core violations detected.'
    container.append(msg)
    return
  }

  const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  const sorted = [...violations].sort(
    (a, b) => (impactOrder[a.impact] ?? 99) - (impactOrder[b.impact] ?? 99),
  )

  const list = el('ul', { class: 'violations', 'aria-label': 'Violations list' })
  for (const v of sorted) list.append(violationItem(v))
  container.append(list)
}

function violationItem(v) {
  const item = el('li', { class: `violation violation--${v.impact}` })

  const header = el('div', { class: 'violation__header' })
  const ruleEl = el('strong', { class: 'violation__rule' })
  ruleEl.textContent = v.ruleId
  const impactEl = el('span', { class: `violation__impact violation__impact--${v.impact}` })
  impactEl.textContent = v.impact
  header.append(ruleEl, impactEl)

  const desc = el('p', { class: 'violation__description' })
  desc.textContent = v.description

  item.append(header, desc)

  if (v.criteria) {
    const criteriaEl = el('div', { class: 'violation__criteria' })
    if (v.criteria.wcag.length > 0)  criteriaEl.append(criteriaGroup('WCAG', v.criteria.wcag))
    if (v.criteria.rgaa.length > 0)  criteriaEl.append(criteriaGroup('RGAA', v.criteria.rgaa))
    if (v.criteria.raweb.length > 0) criteriaEl.append(criteriaGroup('RAWeb', v.criteria.raweb))
    item.append(criteriaEl)
  }

  const nodes = el('ul', { class: 'nodes', 'aria-label': 'Affected elements' })
  for (const n of v.nodes) {
    const nodeItem = el('li', { class: 'node' })
    const selector = el('code', { class: 'node__selector', title: n.selector })
    selector.textContent = truncate(n.selector, 60)
    const html = el('pre', { class: 'node__html' })
    html.textContent = n.htmlSnippet
    nodeItem.append(selector, html)
    nodes.append(nodeItem)
  }
  item.append(nodes)

  const link = el('a', { href: v.helpUrl, target: '_blank', rel: 'noopener noreferrer', class: 'violation__help' })
  link.textContent = 'Learn more'
  const arrow = el('span', { 'aria-hidden': 'true' })
  arrow.textContent = ' ↗'
  const srText = el('span', { class: 'sr-only' })
  srText.textContent = ' (opens in new tab)'
  link.append(arrow, srText)
  item.append(link)

  return item
}

function criteriaGroup(label, ids) {
  const group = el('div', { class: 'criteria-group' })
  const labelEl = el('span', { class: 'criteria-group__label' })
  labelEl.textContent = label + ':'
  group.append(labelEl)
  for (const id of ids) {
    const code = el('code', { class: `tag tag--${label.toLowerCase()}` })
    code.textContent = id
    group.append(code)
  }
  return group
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function el(tag, attrs = {}) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  return node
}

function badge(cls, text) {
  const span = el('span', { class: `badge ${cls}` })
  span.textContent = text
  return span
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str
}
