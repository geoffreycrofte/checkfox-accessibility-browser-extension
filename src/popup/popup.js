import { enrichViolations } from '../mapping/index.js'
import { TOOLS, TOOL_MAP, TOOL_GROUPS } from '../tools/index.js'
import {
  loadConfig, saveConfig, pingConnection,
  isConfigured, api, ApiError, ConfigError,
} from '../api/index.js'

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Apply sidebar body class before any rendering to avoid layout shift.
  const { cfx_sidebar } = await chrome.storage.local.get('cfx_sidebar')
  if (cfx_sidebar) document.body.classList.add('side-panel')

  initTabs()

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabId = tab?.id

  const toolState = await initToolsPanel(tabId)

  // Shared mutable state threaded between context area and scan panel.
  const apiCtx = { context: null, violations: null, refreshPush: null }

  // Context area fetches the API — run async without blocking the scan button.
  initContextArea(tab?.url, apiCtx).catch(console.error)
  initSettingsPanel()
  initScanPanel(tabId, toolState, apiCtx)
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

function initScanPanel(tabId, toolState, apiCtx) {
  const scanBtn = document.getElementById('scan-btn')
  const statusEl = document.getElementById('status')
  const resultsEl = document.getElementById('results')

  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true
    scanBtn.textContent = 'Scanning…'
    statusEl.hidden = true
    resultsEl.hidden = true
    document.getElementById('findings-area').hidden = true

    const activeToolIds = toolState ? [...toolState.activeIds] : []

    try {
      if (!tabId) { showStatus(statusEl, 'error', 'No active tab found.'); return }

      for (const id of activeToolIds) {
        const tool = TOOL_MAP[id]
        if (!tool) continue
        if (tool.type === 'css') await removeCSS(tabId, tool.css)
        else if (tool.type === 'js') await executeFunc(tabId, tool.remove)
        else if (tool.type === 'custom') await removeCSS(tabId, null, '__checkfox_custom')
      }

      let response = await sendScanMessage(tabId)
      if (response === null) {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content/axe-runner.js'] })
        response = await sendScanMessage(tabId)
      }

      if (response?.success) {
        response.violations = enrichViolations(response.violations)
        response.incomplete = enrichViolations(response.incomplete)
        renderResults(resultsEl, response)
        resultsEl.hidden = false

        // Store violations so the context area's Push button can use them.
        apiCtx.violations = response.violations
        apiCtx.refreshPush?.()
      } else if (response === null) {
        showStatus(statusEl, 'error', 'Could not reach the page. Check that the URL is not a browser-internal page.')
      } else {
        showStatus(statusEl, 'error', response?.error ?? 'Scan failed with an unknown error.')
      }

    } catch (err) {
      showStatus(statusEl, 'error', 'Could not reach the page. Check that the URL is not a browser-internal page.')
      console.error('[CheckFox]', err)
    } finally {
      for (const id of activeToolIds) {
        const tool = TOOL_MAP[id]
        if (!tool) continue
        if (tool.type === 'css') await injectCSS(tabId, tool.css)
        else if (tool.type === 'js') await executeFunc(tabId, tool.inject, tool.args ?? [])
      }
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

// ─── Context area ─────────────────────────────────────────────────────────────

async function initContextArea(tabUrl, apiCtx) {
  const area = document.getElementById('context-area')
  if (!tabUrl) return

  if (!isConfigured(await loadConfig())) {
    renderCtxNotConfigured(area)
    return
  }

  // Render immediately from local cache so the popup feels instant.
  const stored = await chrome.storage.local.get('cfx_ctx_cache')
  const cache = stored['cfx_ctx_cache']

  if (cache) {
    applyCtxData(area, tabUrl, cache.audits, cache.samples, apiCtx)
    // Silently refresh if stale (service worker may not have fired yet).
    if (Date.now() - cache.ts >= 5 * 60_000) {
      fetchAuditsCache(true).catch(() => {})
    }
    return
  }

  renderCtxLoading(area)
  try {
    const { audits, samples } = await fetchAuditsCache()
    applyCtxData(area, tabUrl, audits, samples, apiCtx)
  } catch (err) {
    if (err instanceof ConfigError) {
      renderCtxNotConfigured(area)
    } else {
      const msg = err instanceof ApiError && (err.status === 401 || err.status === 403)
        ? 'Invalid API key. Check Settings.'
        : 'Could not reach CheckFox. Check Settings.'
      renderCtxError(area, msg, () => initContextArea(tabUrl, apiCtx))
    }
  }
}

function applyCtxData(area, tabUrl, audits, samples, apiCtx) {
  const match = findUrlMatch(tabUrl, audits, samples)
  if (match) {
    apiCtx.context = match
    renderCtxMatch(area, match, audits, samples, apiCtx)
  } else {
    renderCtxSelector(area, audits, samples, apiCtx)
  }
}

function renderCtxNotConfigured(area) {
  area.replaceChildren()
  const card = el('div', { class: 'ctx-card' })
  const msg = el('p', { class: 'ctx-notice' })
  msg.textContent = 'Connect CheckFox in Settings to sync scan results with your audits.'
  const btn = el('button', { class: 'btn btn--sm btn--ghost', type: 'button' })
  btn.textContent = 'Go to Settings'
  btn.addEventListener('click', () => document.getElementById('tab-settings').click())
  card.append(msg, btn)
  area.append(card)
}

function renderCtxLoading(area) {
  area.replaceChildren()
  const p = el('p', { class: 'ctx-loading' })
  p.textContent = 'Matching audit…'
  area.append(p)
}

function renderCtxError(area, message, onRetry) {
  area.replaceChildren()
  const card = el('div', { class: 'ctx-card ctx-card--error' })
  const msg = el('p', { class: 'ctx-notice ctx-notice--error' })
  msg.textContent = message
  const retryBtn = el('button', { class: 'btn btn--sm btn--ghost', type: 'button' })
  retryBtn.textContent = 'Retry'
  retryBtn.addEventListener('click', onRetry)
  card.append(msg, retryBtn)
  area.append(card)
}

function renderCtxMatch(area, { audit, sample }, audits, allSamples, apiCtx) {
  area.replaceChildren()
  const card = el('div', { class: 'ctx-card' })

  const meta = el('div', { class: 'ctx-card__meta' })
  const auditName = el('span', { class: 'ctx-card__audit' })
  auditName.textContent = audit.name
  auditName.title = audit.name
  const badge = el('span', { class: 'ctx-badge ctx-badge--match' })
  badge.textContent = 'Match'
  const changeBtn = el('button', { class: 'btn btn--xs btn--ghost', type: 'button' })
  changeBtn.textContent = 'Change'
  changeBtn.addEventListener('click', () => {
    apiCtx.context = null
    renderCtxSelector(area, audits, allSamples, apiCtx, 'Change audit / sample:')
  })
  meta.append(auditName, badge, changeBtn)

  const sampleName = el('div', { class: 'ctx-card__sample' })
  sampleName.textContent = sample.name

  const identEl = el('div', { class: 'ctx-card__url' })
  identEl.textContent = truncate(sample.identifier ?? '', 50)
  identEl.title = sample.identifier ?? ''

  const actions = el('div', { class: 'ctx-card__actions' })
  const pullBtn = el('button', { class: 'btn btn--sm btn--secondary', type: 'button' })
  pullBtn.textContent = 'Pull findings'
  const pushBtn = el('button', { class: 'btn btn--sm btn--primary', type: 'button' })
  pushBtn.textContent = 'Push scan ↑'
  pushBtn.disabled = true
  actions.append(pullBtn, pushBtn)

  const feedback = el('div', { class: 'ctx-card__feedback', hidden: '' })

  card.append(meta, sampleName, identEl, actions, feedback)
  area.append(card)

  apiCtx.refreshPush = () => {
    if (apiCtx.violations?.length) pushBtn.disabled = false
  }

  pullBtn.addEventListener('click', async () => {
    pullBtn.disabled = true
    pullBtn.textContent = 'Loading…'
    try {
      const result = await api.findings(audit.id, sample.id)
      renderFindings(result.findings ?? [])
    } catch (err) {
      showCtxFeedback(feedback, 'error', 'Could not fetch findings.')
      console.error('[CheckFox] pull:', err)
    } finally {
      pullBtn.disabled = false
      pullBtn.textContent = 'Pull findings'
    }
  })

  pushBtn.addEventListener('click', async () => {
    if (!apiCtx.violations?.length) return
    pushBtn.disabled = true
    pushBtn.textContent = 'Pushing…'
    try {
      const result = await api.prefill(audit.id, sample.id, apiCtx.violations.map(toApiShape))
      const msg = formatPushResult(result)
      showCtxFeedback(feedback, 'ok', msg)
    } catch (err) {
      showCtxFeedback(feedback, 'error', err.message ?? 'Push failed.')
      console.error('[CheckFox] push:', err)
    } finally {
      pushBtn.disabled = !apiCtx.violations?.length
      pushBtn.textContent = 'Push scan ↑'
    }
  })
}

function renderCtxSelector(area, audits, allSamples, apiCtx, noticeText = 'No sample matches this URL. Select manually:') {
  area.replaceChildren()
  const card = el('div', { class: 'ctx-card' })

  const notice = el('p', { class: 'ctx-notice' })
  notice.textContent = noticeText

  const auditField = el('div', { class: 'ctx-field' })
  const auditLabelEl = el('label', { class: 'ctx-label', id: 'ctx-audit-label' })
  auditLabelEl.textContent = 'Audit'

  const auditCombo = buildAuditCombobox(audits, 'ctx-audit-label', (audit) => {
    apiCtx.context = null
    actions.hidden = true
    sampleComboWrap.replaceChildren(
      buildSampleCombobox(allSamples[audit.id] ?? [], 'ctx-sample-label', (sample) => {
        apiCtx.context = { audit, sample }
        actions.hidden = false
        apiCtx.refreshPush?.()
      })
    )
    sampleField.hidden = false
  })
  auditField.append(auditLabelEl, auditCombo)

  const sampleField = el('div', { class: 'ctx-field', hidden: '' })
  const sampleLabelEl = el('label', { class: 'ctx-label', id: 'ctx-sample-label' })
  sampleLabelEl.textContent = 'Sample'
  const sampleComboWrap = el('div')
  sampleField.append(sampleLabelEl, sampleComboWrap)

  const actions = el('div', { class: 'ctx-card__actions', hidden: '' })
  const pullBtn = el('button', { class: 'btn btn--sm btn--secondary', type: 'button' })
  pullBtn.textContent = 'Pull findings'
  const pushBtn = el('button', { class: 'btn btn--sm btn--primary', type: 'button' })
  pushBtn.textContent = 'Push scan ↑'
  pushBtn.disabled = true
  actions.append(pullBtn, pushBtn)

  const feedback = el('div', { class: 'ctx-card__feedback', hidden: '' })

  card.append(notice, auditField, sampleField, actions, feedback)
  area.append(card)

  apiCtx.refreshPush = () => {
    if (apiCtx.violations?.length && apiCtx.context) pushBtn.disabled = false
  }

  pullBtn.addEventListener('click', async () => {
    if (!apiCtx.context) return
    const { audit, sample } = apiCtx.context
    pullBtn.disabled = true
    pullBtn.textContent = 'Loading…'
    try {
      const result = await api.findings(audit.id, sample.id)
      renderFindings(result.findings ?? [])
    } catch (err) {
      showCtxFeedback(feedback, 'error', 'Could not fetch findings.')
      console.error('[CheckFox] pull:', err)
    } finally {
      pullBtn.disabled = false
      pullBtn.textContent = 'Pull findings'
    }
  })

  pushBtn.addEventListener('click', async () => {
    if (!apiCtx.violations?.length || !apiCtx.context) return
    const { audit, sample } = apiCtx.context
    pushBtn.disabled = true
    pushBtn.textContent = 'Pushing…'
    try {
      const result = await api.prefill(audit.id, sample.id, apiCtx.violations.map(toApiShape))
      showCtxFeedback(feedback, 'ok', formatPushResult(result))
    } catch (err) {
      showCtxFeedback(feedback, 'error', err.message ?? 'Push failed.')
      console.error('[CheckFox] push:', err)
    } finally {
      pushBtn.disabled = !(apiCtx.violations?.length && apiCtx.context)
      pushBtn.textContent = 'Push scan ↑'
    }
  })
}

// ─── Accessible combobox ──────────────────────────────────────────────────────

function buildComboboxCore({ uid, labelId, placeholder, items, renderTriggerSelected, renderOptionContent, onSelect }) {
  const triggerId = `cfx-trigger-${uid}`
  const listboxId = `cfx-listbox-${uid}`

  const wrapper = el('div', { class: 'cfx-select' })

  const triggerAttrs = {
    type: 'button',
    class: 'cfx-select__trigger',
    role: 'combobox',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-controls': listboxId,
    id: triggerId,
  }
  if (labelId) triggerAttrs['aria-labelledby'] = `${labelId} ${triggerId}`
  const trigger = el('button', triggerAttrs)

  const valueEl = el('span', { class: 'cfx-select__value' })
  const valuePlaceholder = el('span', { class: 'cfx-select__placeholder' })
  valuePlaceholder.textContent = placeholder
  valueEl.append(valuePlaceholder)

  const arrowEl = el('span', { class: 'cfx-select__arrow', 'aria-hidden': 'true' })
  arrowEl.textContent = '▾'
  trigger.append(valueEl, arrowEl)

  const listboxAttrs = {
    class: 'cfx-select__listbox',
    role: 'listbox',
    id: listboxId,
    hidden: '',
  }
  if (labelId) listboxAttrs['aria-labelledby'] = labelId
  const listbox = el('ul', listboxAttrs)

  let activeIndex = -1
  let selectedIndex = -1
  let typeaheadStr = ''
  let typeaheadTimer = null

  const optEls = items.map((item, i) => {
    const opt = el('li', {
      class: 'cfx-select__option',
      role: 'option',
      id: `cfx-opt-${uid}-${i}`,
      'aria-selected': 'false',
    })
    opt.append(renderOptionContent(item))
    opt.addEventListener('click', e => { e.stopPropagation(); select(i) })
    opt.addEventListener('mousemove', () => setActive(i))
    listbox.append(opt)
    return opt
  })

  wrapper.append(trigger, listbox)

  const isOpen = () => !listbox.hidden

  function open() {
    listbox.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
  }

  function close() {
    listbox.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    trigger.removeAttribute('aria-activedescendant')
    activeIndex = -1
  }

  function setActive(i) {
    if (i < 0 || i >= optEls.length) return
    optEls[activeIndex]?.classList.remove('cfx-select__option--active')
    activeIndex = i
    optEls[i].classList.add('cfx-select__option--active')
    trigger.setAttribute('aria-activedescendant', optEls[i].id)
    optEls[i].scrollIntoView({ block: 'nearest' })
  }

  function select(i) {
    if (i < 0 || i >= items.length) return
    optEls[selectedIndex]?.setAttribute('aria-selected', 'false')
    selectedIndex = i
    optEls[i].setAttribute('aria-selected', 'true')
    valueEl.replaceChildren(renderTriggerSelected(items[i]))
    close()
    onSelect(items[i])
  }

  trigger.addEventListener('click', () => { isOpen() ? close() : open() })

  trigger.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        isOpen() ? setActive(Math.min(activeIndex + 1, optEls.length - 1)) : open()
        break
      case 'ArrowUp':
        e.preventDefault()
        isOpen() ? setActive(Math.max(activeIndex - 1, 0)) : open()
        break
      case 'Home':
        e.preventDefault()
        if (isOpen()) setActive(0)
        break
      case 'End':
        e.preventDefault()
        if (isOpen()) setActive(optEls.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        isOpen() ? (activeIndex >= 0 && select(activeIndex)) : open()
        break
      case 'Escape':
        if (isOpen()) { e.preventDefault(); close() }
        break
      case 'Tab':
        if (isOpen()) close()
        break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          typeaheadStr += e.key.toLowerCase()
          clearTimeout(typeaheadTimer)
          typeaheadTimer = setTimeout(() => { typeaheadStr = '' }, 500)
          if (!isOpen()) open()
          // Find match after current position, then wrap from start
          let idx = items.findIndex((it, i) => i > activeIndex && it.label.toLowerCase().startsWith(typeaheadStr))
          if (idx === -1) idx = items.findIndex(it => it.label.toLowerCase().startsWith(typeaheadStr))
          if (idx >= 0) setActive(idx)
        }
    }
  })

  document.addEventListener('click', e => { if (!wrapper.contains(e.target)) close() })

  return wrapper
}

function buildAuditCombobox(audits, labelId, onSelect) {
  const items = audits.map(a => ({ value: a.id, label: a.name, data: a }))
  return buildComboboxCore({
    uid: 'audit',
    labelId,
    placeholder: 'Select an audit…',
    items,
    renderTriggerSelected: (item) => {
      const wrap = el('span', { class: 'cfx-select__value-inner' })
      const name = el('span', { class: 'cfx-select__value-text' })
      name.textContent = truncate(item.label, 28)
      wrap.append(name, buildGuidelineBadge(item.data.guideline))
      return wrap
    },
    renderOptionContent: (item) => {
      const wrap = el('div', { class: 'cfx-opt' })

      const main = el('div', { class: 'cfx-opt__main' })
      const name = el('span', { class: 'cfx-opt__name' })
      name.textContent = item.label
      main.append(name, buildGuidelineBadge(item.data.guideline))
      wrap.append(main)

      const website = item.data.website?.replace(/^https?:\/\//, '') ?? ''
      const dueDate = item.data.due_date ? new Date(item.data.due_date) : null
      if (website || dueDate) {
        const meta = el('div', { class: 'cfx-opt__meta' })
        if (website) meta.append(document.createTextNode(website))
        if (dueDate) {
          const overdue = dueDate < new Date()
          const label = (website ? ' · ' : '') + (overdue ? 'overdue ' : 'due ') +
            dueDate.toLocaleDateString('en', { day: 'numeric', month: 'short' })
          const dueSpan = el('span', { class: overdue ? 'cfx-opt__overdue' : '' })
          dueSpan.textContent = label
          meta.append(dueSpan)
        }
        wrap.append(meta)
      }
      return wrap
    },
    onSelect: (item) => onSelect(item.data),
  })
}

function buildSampleCombobox(samples, labelId, onSelect) {
  const items = samples.map(s => ({ value: s.id, label: s.name, data: s }))
  return buildComboboxCore({
    uid: 'sample',
    labelId,
    placeholder: 'Select a sample…',
    items,
    renderTriggerSelected: (item) => {
      const span = el('span', { class: 'cfx-select__value-text' })
      span.textContent = truncate(item.label, 38)
      return span
    },
    renderOptionContent: (item) => {
      const wrap = el('div', { class: 'cfx-opt' })
      const name = el('span', { class: 'cfx-opt__name' })
      name.textContent = item.label
      wrap.append(name)
      if (item.data.identifier) {
        const meta = el('div', { class: 'cfx-opt__meta' })
        meta.textContent = truncate(item.data.identifier.replace(/^https?:\/\//, ''), 44)
        wrap.append(meta)
      }
      return wrap
    },
    onSelect: (item) => onSelect(item.data),
  })
}

function buildGuidelineBadge(guideline) {
  const badge = el('span', { class: `ctx-badge ctx-badge--${guideline ?? 'unknown'}` })
  badge.textContent = (guideline ?? '?').toUpperCase()
  return badge
}

// ─── Findings renderer ────────────────────────────────────────────────────────

function renderFindings(findings) {
  const area = document.getElementById('findings-area')
  area.replaceChildren()
  area.hidden = false

  const header = el('div', { class: 'findings-header' })
  const title = el('h3', { class: 'findings-title' })
  title.textContent = 'Existing findings'
  const closeBtn = el('button', { class: 'findings-close', type: 'button', 'aria-label': 'Close findings' })
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => { area.hidden = true })
  header.append(title, closeBtn)
  area.append(header)

  const relevant = findings.filter(f => f.status && f.status !== 'not_tested')
  if (relevant.length === 0) {
    const none = el('p', { class: 'findings-empty' })
    none.textContent = 'No findings recorded yet.'
    area.append(none)
    return
  }

  const order = { non_compliant: 0, compliant: 1, not_applicable: 2 }
  const sorted = [...relevant].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  const list = el('ul', { class: 'findings-list', 'aria-label': 'Existing findings' })
  for (const f of sorted) {
    const cssStatus = f.status.replace(/_/g, '-')
    const item = el('li', { class: `finding finding--${cssStatus}` })
    const row = el('div', { class: 'finding__row' })
    const num = el('code', { class: 'finding__num' })
    num.textContent = f.criterion_num
    const statusBadge = el('span', { class: `finding__status finding__status--${cssStatus}` })
    statusBadge.textContent = f.status.replace(/_/g, ' ')
    row.append(num, statusBadge)
    item.append(row)
    if (f.comment?.problem) {
      const comment = el('p', { class: 'finding__comment' })
      comment.textContent = truncate(f.comment.problem, 120)
      item.append(comment)
    }
    list.append(item)
  }
  area.append(list)
}

// ─── Settings panel ───────────────────────────────────────────────────────────

async function initSettingsPanel() {
  const tokenInput = document.getElementById('settings-token')
  const tokenToggle = document.getElementById('settings-token-toggle')
  const saveBtn = document.getElementById('settings-save-btn')
  const feedback = document.getElementById('settings-feedback')

  const config = await loadConfig()
  tokenInput.value = config.token

  // Sidebar toggle
  const sidebarToggle = document.getElementById('settings-sidebar-toggle')
  const { cfx_sidebar } = await chrome.storage.local.get('cfx_sidebar')
  if (cfx_sidebar) sidebarToggle.classList.add('tool-toggle--on')
  sidebarToggle.setAttribute('aria-pressed', String(!!cfx_sidebar))
  sidebarToggle.addEventListener('click', async () => {
    const isOn = sidebarToggle.classList.toggle('tool-toggle--on')
    sidebarToggle.setAttribute('aria-pressed', String(isOn))
    document.body.classList.toggle('side-panel', isOn)
    await chrome.storage.local.set({ cfx_sidebar: isOn })
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: isOn })
    await chrome.action.setPopup({ popup: isOn ? '' : 'popup/popup.html' })
  })

  tokenToggle.addEventListener('click', () => {
    const show = tokenInput.type === 'password'
    tokenInput.type = show ? 'text' : 'password'
    tokenToggle.textContent = show ? 'Hide' : 'Show'
    tokenToggle.setAttribute('aria-label', show ? 'Hide API key' : 'Show API key')
  })

  saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim()

    if (!token) {
      showSettingsFeedback(feedback, 'error', 'API key is required.')
      return
    }

    saveBtn.disabled = true
    saveBtn.textContent = 'Connecting…'
    feedback.hidden = true

    try {
      await pingConnection(token)
      await saveConfig(token)
      showSettingsFeedback(feedback, 'ok', 'Connected! Reopen the popup to sync with your audits.')
    } catch (err) {
      const msg = err instanceof ApiError
        ? `Connection failed (${err.status}). Check your API key.`
        : 'Connection failed. Check your network.'
      showSettingsFeedback(feedback, 'error', msg)
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = 'Save & Connect'
    }
  })
}

// ─── Tools panel ──────────────────────────────────────────────────────────────

async function initToolsPanel(tabId) {
  const container = document.getElementById('tools-list')

  const stateKey = `tools_${tabId}`
  const stored = await chrome.storage.session.get(stateKey)
  const activeIds = new Set(stored[stateKey] ?? [])

  if (tabId) {
    for (const id of activeIds) {
      const tool = TOOL_MAP[id]
      if (tool?.type === 'css') await injectCSS(tabId, tool.css)
      else if (tool?.type === 'js') await executeFunc(tabId, tool.inject, tool.args ?? [])
    }
  }

  const refreshSubtitle = () => updateHeaderSubtitle(activeIds, tabId, stateKey)

  for (const group of TOOL_GROUPS) {
    const groupLabel = el('h3', { class: 'tools-group-label' })
    groupLabel.textContent = group
    container.append(groupLabel)

    for (const tool of TOOLS.filter(t => t.group === group)) {
      container.append(buildToolRow(tool, activeIds.has(tool.id), tabId, activeIds, stateKey, refreshSubtitle))
    }
  }

  refreshSubtitle()
  return { activeIds, stateKey }
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

  const toggle = el('button', {
    class: `tool-toggle${isActive ? ' tool-toggle--on' : ''}`,
    'aria-pressed': String(isActive),
    'aria-label': `Toggle ${tool.label}`,
  })

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
  const { violations, incomplete, passes, url } = data
  container.replaceChildren()

  const activeFilters = new Set(['violations', 'incomplete'])

  const list = el('ul', { class: 'results-list', 'aria-label': 'Scan results' })

  const syncFilter = () => {
    list.classList.toggle('hide-violations', !activeFilters.has('violations'))
    list.classList.toggle('hide-incomplete', !activeFilters.has('incomplete'))
    list.classList.toggle('hide-passes', !activeFilters.has('passes'))
  }

  const makeFilter = (cls, key, text) => {
    const isActive = activeFilters.has(key)
    const btn = el('button', {
      class: `badge badge--filter ${cls}${isActive ? '' : ' badge--off'}`,
      'aria-pressed': String(isActive),
    })
    btn.textContent = text
    btn.addEventListener('click', () => {
      if (activeFilters.has(key)) {
        activeFilters.delete(key)
        btn.classList.add('badge--off')
        btn.setAttribute('aria-pressed', 'false')
      } else {
        activeFilters.add(key)
        btn.classList.remove('badge--off')
        btn.setAttribute('aria-pressed', 'true')
      }
      syncFilter()
    })
    return btn
  }

  const summary = el('div', { class: 'summary', role: 'group', 'aria-label': 'Filter scan results' })
  summary.append(
    makeFilter('badge--error', 'violations', `${violations.length} violation${violations.length !== 1 ? 's' : ''}`),
    makeFilter('badge--warn', 'incomplete', `${incomplete.length} incomplete`),
    makeFilter('badge--ok', 'passes', `${passes.length} pass${passes.length !== 1 ? 'es' : ''}`),
  )
  container.append(summary)

  const urlEl = el('p', { class: 'scan-url', title: url })
  urlEl.textContent = truncate(url, 60)
  container.append(urlEl)

  const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  const byImpact = arr => [...arr].sort((a, b) => (impactOrder[a.impact] ?? 99) - (impactOrder[b.impact] ?? 99))

  for (const v of byImpact(violations)) list.append(violationItem(v, 'violation'))
  for (const v of byImpact(incomplete)) list.append(violationItem(v, 'incomplete'))
  for (const p of passes) list.append(passItem(p))

  syncFilter()
  container.append(list)
}

function violationItem(v, status = 'violation') {
  const item = el('li', { class: `violation violation--${v.impact ?? 'unknown'} violation--${status}`, 'data-status': status })

  const header = el('div', { class: 'violation__header' })
  const ruleEl = el('strong', { class: 'violation__rule' })
  ruleEl.textContent = v.ruleId
  const impactEl = el('span', { class: `violation__impact violation__impact--${v.impact ?? 'unknown'}` })
  impactEl.textContent = v.impact ?? '—'

  if (status === 'incomplete') {
    const reviewEl = el('span', { class: 'violation__review-label' })
    reviewEl.textContent = 'needs review'
    header.append(ruleEl, reviewEl, impactEl)
  } else {
    header.append(ruleEl, impactEl)
  }

  const desc = el('p', { class: 'violation__description' })
  desc.textContent = v.description

  item.append(header, desc)

  if (v.criteria) {
    const criteriaEl = el('div', { class: 'violation__criteria' })
    if (v.criteria.wcag.length > 0) criteriaEl.append(criteriaGroup('WCAG', v.criteria.wcag))

    const { rgaa, raweb } = v.criteria
    const identical = rgaa.length > 0 && rgaa.length === raweb.length && rgaa.every((id, i) => id === raweb[i])
    if (identical) {
      criteriaEl.append(criteriaGroup('RGAA / RAWeb', rgaa, 'rgaa-raweb'))
    } else {
      if (rgaa.length > 0)  criteriaEl.append(criteriaGroup('RGAA', rgaa))
      if (raweb.length > 0) criteriaEl.append(criteriaGroup('RAWeb', raweb))
    }

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

function passItem(p) {
  const item = el('li', { class: 'violation violation--pass', 'data-status': 'pass' })
  const header = el('div', { class: 'violation__header' })
  const ruleEl = el('strong', { class: 'violation__rule' })
  ruleEl.textContent = p.ruleId
  const statusEl = el('span', { class: 'violation__impact violation__impact--pass' })
  statusEl.textContent = 'pass'
  header.append(ruleEl, statusEl)
  const desc = el('p', { class: 'violation__description' })
  desc.textContent = p.description
  item.append(header, desc)
  return item
}

function criteriaGroup(label, ids, cssKey) {
  const group = el('div', { class: 'criteria-group' })
  const labelEl = el('span', { class: 'criteria-group__label' })
  labelEl.textContent = label + ':'
  group.append(labelEl)
  const cls = cssKey ?? label.toLowerCase()
  for (const id of ids) {
    const code = el('code', { class: `tag tag--${cls}` })
    code.textContent = id
    group.append(code)
  }
  return group
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchAuditsCache(force = false) {
  const KEY = 'cfx_ctx_cache'
  const TTL = 5 * 60_000

  if (!force) {
    const stored = await chrome.storage.local.get(KEY)
    const cache = stored[KEY]
    if (cache && Date.now() - cache.ts < TTL) return cache
  }

  const { audits } = await api.audits()
  const samplesResults = await Promise.all(audits.map(a => api.samples(a.id)))
  const samples = Object.fromEntries(audits.map((a, i) => [a.id, samplesResults[i].samples ?? []]))
  const data = { ts: Date.now(), audits, samples }
  await chrome.storage.local.set({ [KEY]: data })
  return data
}

function findUrlMatch(tabUrl, audits, samples) {
  const norm = s => s?.replace(/\/$/, '') ?? ''
  const tabNorm = norm(tabUrl)
  for (const audit of audits) {
    for (const sample of (samples[audit.id] ?? [])) {
      const id = norm(sample.identifier)
      if (!id) continue
      if (
        tabNorm === id ||
        tabNorm.startsWith(id + '/') ||
        tabNorm.startsWith(id + '?') ||
        tabNorm.startsWith(id + '#')
      ) return { audit, sample }
    }
  }
  return null
}

function toApiShape(v) {
  return {
    ruleId: v.ruleId,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map(n => ({ html: n.htmlSnippet, failureSummary: n.failureSummary })),
    criteria: v.criteria,
  }
}

function formatPushResult(result) {
  const applied = result.applied ?? 0
  const skipped = result.skipped_count ?? 0
  return skipped > 0
    ? `${applied} criteria pre-filled, ${skipped} skipped (already assessed).`
    : `${applied} criteria pre-filled.`
}

function showCtxFeedback(feedbackEl, type, message) {
  feedbackEl.className = `ctx-card__feedback ctx-card__feedback--${type}`
  feedbackEl.textContent = message
  feedbackEl.hidden = false
}

function showSettingsFeedback(feedbackEl, type, message) {
  feedbackEl.className = `settings-feedback settings-feedback--${type}`
  feedbackEl.textContent = message
  feedbackEl.hidden = false
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function el(tag, attrs = {}) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  return node
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str
}
