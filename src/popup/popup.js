import { enrichViolations } from '../mapping/index.js'
import { TOOLS, TOOL_MAP, TOOL_GROUPS } from '../tools/index.js'
import {
  loadConfig, saveConfig, clearConfig, pingConnection,
  isConfigured, api, ApiError, ConfigError,
} from '../api/index.js'
import {
  INVENTORY_TOPICS, isInventoryGuideline, criteriaForGuideline, countTopics,
} from '../inventory/index.js'
import { t, getLang, loadLang, saveLang } from '../i18n/index.js'

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Apply sidebar body class before any rendering to avoid layout shift.
  // Side-panel mode is the default until the user opts out.
  const { cfx_sidebar } = await chrome.storage.local.get('cfx_sidebar')
  if (cfx_sidebar ?? true) document.body.classList.add('side-panel')

  await loadLang()
  translatePage()

  initTabs()

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabId = tab?.id

  const toolState = await initToolsPanel(tabId)

  // Shared mutable state threaded between context area and scan panel.
  const apiCtx = { context: null, violations: null, refreshPush: null, tabId }

  // Context area fetches the API — run async without blocking the scan button.
  initContextArea(tab?.url, apiCtx).catch(console.error)
  initSettingsPanel()
  initScanPanel(tabId, toolState, apiCtx)
})

// ─── i18n ─────────────────────────────────────────────────────────────────────

function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.placeholder = t(node.dataset.i18nPlaceholder)
  })
  document.querySelectorAll('[data-i18n-aria-label]').forEach(node => {
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel))
  })
  document.documentElement.lang = getLang()

  // Sync lang switcher button states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const active = btn.dataset.lang === getLang()
    btn.classList.toggle('lang-btn--active', active)
    btn.setAttribute('aria-pressed', String(active))
  })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initTabs() {
  const tabs = document.querySelectorAll('[role="tab"]')
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(tabEl => {
        tabEl.classList.remove('tab--active')
        tabEl.setAttribute('aria-selected', 'false')
        document.getElementById(tabEl.getAttribute('aria-controls')).hidden = true
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
    scanBtn.textContent = t('scan.btn.scanning')
    statusEl.hidden = true
    resultsEl.hidden = true
    document.getElementById('findings-area').hidden = true

    const activeToolIds = toolState ? [...toolState.activeIds] : []

    try {
      if (!tabId) { showStatus(statusEl, 'error', t('scan.noTab')); return }

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
        renderResults(resultsEl, response, tabId)
        resultsEl.hidden = false

        // Store violations so the context area's Push button can use them.
        apiCtx.violations = response.violations
        apiCtx.refreshPush?.()
      } else if (response === null) {
        showStatus(statusEl, 'error', t('scan.noPage'))
      } else {
        showStatus(statusEl, 'error', response?.error ?? t('scan.failed'))
      }

    } catch (err) {
      showStatus(statusEl, 'error', t('scan.noPage'))
      console.error('[CheckFox]', err)
    } finally {
      for (const id of activeToolIds) {
        const tool = TOOL_MAP[id]
        if (!tool) continue
        if (tool.type === 'css')    await injectCSS(tabId, tool.css)
        else if (tool.type === 'js') await executeFunc(tabId, tool.inject, [...(tool.args ?? []), getBadgeStrings()])
      }
      scanBtn.disabled = false
      scanBtn.textContent = t('scan.btn')
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

  // Show the connect prompt whenever there's no API key — independent of the
  // tab URL, so it never silently disappears on pages without a readable URL.
  if (!isConfigured(await loadConfig())) {
    renderCtxNotConfigured(area)
    return
  }

  if (!tabUrl) return

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
        ? t('ctx.invalidKey')
        : t('ctx.cantReach')
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
  const card = el('div', { class: 'ctx-connect' })

  // Message with the "Settings" word emphasised (split around the {0} placeholder
  // so the bold segment is correct in every language).
  const msg = el('p', { class: 'ctx-connect__text' })
  const [before, after] = t('ctx.notConfigured').split('{0}')
  const strong = el('strong')
  strong.textContent = t('ctx.notConfigured.word')
  msg.append(document.createTextNode(before ?? ''), strong, document.createTextNode(after ?? ''))

  const btn = el('button', { class: 'ctx-connect__btn', type: 'button' })
  btn.textContent = t('ctx.goToSettings')
  btn.addEventListener('click', () => document.getElementById('tab-settings').click())

  card.append(msg, btn)
  area.append(card)
}

function renderCtxLoading(area) {
  area.replaceChildren()
  const p = el('p', { class: 'ctx-loading' })
  p.textContent = t('ctx.loading')
  area.append(p)
}

function renderCtxError(area, message, onRetry) {
  area.replaceChildren()
  const card = el('div', { class: 'ctx-card ctx-card--error' })
  const msg = el('p', { class: 'ctx-notice ctx-notice--error' })
  msg.textContent = message
  const retryBtn = el('button', { class: 'btn btn--sm btn--ghost', type: 'button' })
  retryBtn.textContent = t('ctx.btn.retry')
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
  badge.textContent = t('ctx.badge.match')
  const changeBtn = el('button', { class: 'btn btn--xs btn--ghost', type: 'button' })
  changeBtn.textContent = t('ctx.btn.change')
  changeBtn.addEventListener('click', () => {
    apiCtx.context = null
    renderCtxSelector(area, audits, allSamples, apiCtx, t('ctx.changeAudit'))
  })
  meta.append(auditName, badge, changeBtn)

  const sampleName = el('div', { class: 'ctx-card__sample' })
  sampleName.textContent = sample.name

  const identEl = el('div', { class: 'ctx-card__url' })
  identEl.textContent = truncate(sample.identifier ?? '', 50)
  identEl.title = sample.identifier ?? ''

  const actions = el('div', { class: 'ctx-card__actions' })
  const pullBtn = el('button', { class: 'btn btn--sm btn--secondary', type: 'button' })
  pullBtn.textContent = t('ctx.btn.pull')
  const pushBtn = el('button', { class: 'btn btn--sm btn--primary', type: 'button' })
  pushBtn.textContent = t('ctx.btn.push')
  pushBtn.disabled = true
  actions.append(pullBtn, pushBtn)

  const feedback = el('div', { class: 'ctx-card__feedback', hidden: '' })

  card.append(meta, sampleName, identEl, actions, feedback)
  if (isInventoryGuideline(audit.guideline)) card.append(buildInventorySection(apiCtx))
  area.append(card)

  apiCtx.refreshPush = () => {
    if (apiCtx.violations?.length) pushBtn.disabled = false
  }

  pullBtn.addEventListener('click', async () => {
    pullBtn.disabled = true
    pullBtn.textContent = t('ctx.btn.pulling')
    try {
      const result = await api.findings(audit.id, sample.id)
      renderFindings(result.findings ?? [])
    } catch (err) {
      showCtxFeedback(feedback, 'error', t('ctx.error.pull'))
      console.error('[CheckFox] pull:', err)
    } finally {
      pullBtn.disabled = false
      pullBtn.textContent = t('ctx.btn.pull')
    }
  })

  pushBtn.addEventListener('click', async () => {
    if (!apiCtx.violations?.length) return
    pushBtn.disabled = true
    pushBtn.textContent = t('ctx.btn.pushing')
    try {
      const result = await api.prefill(audit.id, sample.id, apiCtx.violations.map(toApiShape))
      const msg = formatPushResult(result)
      showCtxFeedback(feedback, 'ok', msg)
    } catch (err) {
      showCtxFeedback(feedback, 'error', err.message ?? t('ctx.error.push'))
      console.error('[CheckFox] push:', err)
    } finally {
      pushBtn.disabled = !apiCtx.violations?.length
      pushBtn.textContent = t('ctx.btn.push')
    }
  })
}

function renderCtxSelector(area, audits, allSamples, apiCtx, noticeText) {
  area.replaceChildren()
  const card = el('div', { class: 'ctx-card' })

  const notice = el('p', { class: 'ctx-notice' })
  notice.textContent = noticeText ?? t('ctx.noMatch')

  const auditField = el('div', { class: 'ctx-field' })
  const auditLabelEl = el('label', { class: 'ctx-label', id: 'ctx-audit-label' })
  auditLabelEl.textContent = t('ctx.label.audit')

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
  sampleLabelEl.textContent = t('ctx.label.sample')
  const sampleComboWrap = el('div')
  sampleField.append(sampleLabelEl, sampleComboWrap)

  const actions = el('div', { class: 'ctx-card__actions', hidden: '' })
  const pullBtn = el('button', { class: 'btn btn--sm btn--secondary', type: 'button' })
  pullBtn.textContent = t('ctx.btn.pull')
  const pushBtn = el('button', { class: 'btn btn--sm btn--primary', type: 'button' })
  pushBtn.textContent = t('ctx.btn.push')
  pushBtn.disabled = true
  actions.append(pullBtn, pushBtn)

  const feedback = el('div', { class: 'ctx-card__feedback', hidden: '' })

  card.append(notice, auditField, sampleField, actions, feedback, buildInventorySection(apiCtx))
  area.append(card)

  apiCtx.refreshPush = () => {
    if (apiCtx.violations?.length && apiCtx.context) pushBtn.disabled = false
  }

  pullBtn.addEventListener('click', async () => {
    if (!apiCtx.context) return
    const { audit, sample } = apiCtx.context
    pullBtn.disabled = true
    pullBtn.textContent = t('ctx.btn.pulling')
    try {
      const result = await api.findings(audit.id, sample.id)
      renderFindings(result.findings ?? [])
    } catch (err) {
      showCtxFeedback(feedback, 'error', t('ctx.error.pull'))
      console.error('[CheckFox] pull:', err)
    } finally {
      pullBtn.disabled = false
      pullBtn.textContent = t('ctx.btn.pull')
    }
  })

  pushBtn.addEventListener('click', async () => {
    if (!apiCtx.violations?.length || !apiCtx.context) return
    const { audit, sample } = apiCtx.context
    pushBtn.disabled = true
    pushBtn.textContent = t('ctx.btn.pushing')
    try {
      const result = await api.prefill(audit.id, sample.id, apiCtx.violations.map(toApiShape))
      showCtxFeedback(feedback, 'ok', formatPushResult(result))
    } catch (err) {
      showCtxFeedback(feedback, 'error', err.message ?? t('ctx.error.push'))
      console.error('[CheckFox] push:', err)
    } finally {
      pushBtn.disabled = !(apiCtx.violations?.length && apiCtx.context)
      pushBtn.textContent = t('ctx.btn.push')
    }
  })
}

// ─── Topic N/A inventory ────────────────────────────────────────────────────
// Replaces the Stylus "0.Thématiques NA" counter. Detects RGAA/RAWeb topics
// with zero relevant elements on the page and lets the auditor confirm which to
// mark Not Applicable on the matched sample (never auto-pushed).

function buildInventorySection(apiCtx) {
  const section = el('section', { class: 'inv-section' })

  const heading = el('h3', { class: 'inv-heading' })
  heading.textContent = t('inv.heading')

  const intro = el('p', { class: 'inv-intro' })
  intro.textContent = t('inv.intro')

  const detectBtn = el('button', { class: 'btn btn--sm btn--secondary', type: 'button' })
  detectBtn.textContent = t('inv.btn.detect')

  const list = el('div', { class: 'inv-list', hidden: '' })

  const markBtn = el('button', { class: 'btn btn--sm btn--primary', type: 'button', hidden: '' })
  markBtn.textContent = t('inv.btn.mark')
  markBtn.disabled = true

  const feedback = el('div', { class: 'inv-feedback', hidden: '' })

  section.append(heading, intro, detectBtn, list, markBtn, feedback)

  const guidelineOf = () => apiCtx.context?.audit?.guideline
  const refreshMarkState = () => {
    const anyChecked = [...list.querySelectorAll('input[type="checkbox"]')].some(c => c.checked)
    markBtn.disabled = !anyChecked
  }

  detectBtn.addEventListener('click', async () => {
    feedback.hidden = true
    if (!apiCtx.context) { showCtxFeedback(feedback, 'error', t('inv.selectFirst')); return }
    if (!isInventoryGuideline(guidelineOf())) {
      showCtxFeedback(feedback, 'error', t('inv.notApplicableGuideline')); return
    }

    detectBtn.disabled = true
    detectBtn.textContent = t('inv.btn.detecting')
    try {
      const counts = await runTopicInventory(apiCtx.tabId)
      if (!counts) { showCtxFeedback(feedback, 'error', t('inv.error')); return }

      // count === 0 → candidate N/A; -1 means selector failed (never offer).
      const empty = INVENTORY_TOPICS.filter(topicDef => counts[topicDef.key] === 0)

      list.replaceChildren()
      if (empty.length === 0) {
        markBtn.hidden = true
        list.hidden = true
        showCtxFeedback(feedback, 'ok', t('inv.none'))
        return
      }

      const guideline = guidelineOf()
      const notice = el('p', { class: 'inv-found' })
      notice.textContent = t('inv.found', empty.length)
      list.append(notice)

      for (const topicDef of empty) {
        const crit = criteriaForGuideline(topicDef, guideline)
        const itemId = `inv-${topicDef.key}`
        const item = el('label', { class: 'inv-item', for: itemId })
        const cb = el('input', { type: 'checkbox', id: itemId })
        cb.checked = true
        cb.dataset.topicKey = topicDef.key
        cb.addEventListener('change', refreshMarkState)
        const text = el('span', { class: 'inv-item__text' })
        text.textContent = t('inv.topicLine', topicDef.topicNumber, t(`inv.topic.${topicDef.key}`), crit.length)
        item.append(cb, text)
        list.append(item)
      }
      list.hidden = false
      markBtn.hidden = false
      refreshMarkState()
    } catch (err) {
      showCtxFeedback(feedback, 'error', t('inv.error'))
      console.error('[CheckFox] inventory detect:', err)
    } finally {
      detectBtn.disabled = false
      detectBtn.textContent = t('inv.btn.detect')
    }
  })

  markBtn.addEventListener('click', async () => {
    if (!apiCtx.context) { showCtxFeedback(feedback, 'error', t('inv.selectFirst')); return }
    const { audit, sample } = apiCtx.context

    const selectedTopics = [...list.querySelectorAll('input[type="checkbox"]:checked')]
      .map(cb => INVENTORY_TOPICS.find(td => td.key === cb.dataset.topicKey))
      .filter(Boolean)

    if (selectedTopics.length === 0) { showCtxFeedback(feedback, 'error', t('inv.noSelection')); return }

    markBtn.disabled = true
    markBtn.textContent = t('inv.btn.marking')
    try {
      // Robust path: resolve each topic's criteria to their criterion_id UUIDs
      // from the sample findings (matched by topic-number prefix on criterion_num),
      // avoiding fragile localized topic-name matching (e.g. RGAA "Formulaires").
      const { findings = [] } = await api.findings(audit.id, sample.id)
      const wantedTopicNumbers = new Set(selectedTopics.map(td => String(td.topicNumber)))
      const criterionIds = findings
        .filter(f => wantedTopicNumbers.has(String(f.criterion_num ?? '').split('.')[0]))
        .map(f => f.criterion_id)
        .filter(Boolean)

      if (criterionIds.length === 0) {
        showCtxFeedback(feedback, 'error', t('inv.noCriteria'))
        return
      }

      console.debug('[CheckFox] mark-topic-na →', {
        auditId: audit.id, sampleId: sample.id,
        topics: selectedTopics.map(td => td.key),
        criterionIds,
      })
      const result = await api.markTopicNA(audit.id, sample.id, { criterionIds })
      showCtxFeedback(feedback, 'ok', t('inv.result', result.applied ?? 0, result.skipped_count ?? 0))
    } catch (err) {
      showCtxFeedback(feedback, 'error', err.message ?? t('inv.error'))
      console.error('[CheckFox] inventory mark:', err.message, err.body ?? '', err)
    } finally {
      markBtn.textContent = t('inv.btn.mark')
      refreshMarkState()
    }
  })

  return section
}

async function runTopicInventory(tabId) {
  if (!tabId) return null
  const selectors = INVENTORY_TOPICS.map(({ key, selector }) => ({ key, selector }))
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: countTopics,
      args: [selectors],
    })
    return res?.result ?? null
  } catch (err) {
    console.warn('[CheckFox] runTopicInventory failed:', err)
    return null
  }
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
    placeholder: t('ctx.placeholder.audit'),
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
          const label = (website ? ' · ' : '') + (overdue ? t('date.overdue') + ' ' : t('date.due') + ' ') +
            dueDate.toLocaleDateString(getLang(), { day: 'numeric', month: 'short' })
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
    placeholder: t('ctx.placeholder.sample'),
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
  title.textContent = t('findings.title')
  const closeBtn = el('button', { class: 'findings-close', type: 'button', 'aria-label': t('findings.close') })
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => { area.hidden = true })
  header.append(title, closeBtn)
  area.append(header)

  const relevant = findings.filter(f => f.status && f.status !== 'not_tested')
  if (relevant.length === 0) {
    const none = el('p', { class: 'findings-empty' })
    none.textContent = t('findings.empty')
    area.append(none)
    return
  }

  const order = { non_compliant: 0, compliant: 1, not_applicable: 2 }
  const sorted = [...relevant].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  const list = el('ul', { class: 'findings-list', 'aria-label': t('findings.label') })
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
  const disconnectBtn = document.getElementById('settings-disconnect-btn')
  const feedback = document.getElementById('settings-feedback')

  const config = await loadConfig()
  tokenInput.value = config.token
  disconnectBtn.hidden = !isConfigured(config)

  // Sidebar toggle
  const sidebarToggle = document.getElementById('settings-sidebar-toggle')
  const { cfx_sidebar } = await chrome.storage.local.get('cfx_sidebar')
  // Side-panel mode is the default until the user opts out.
  const sidebarOn = cfx_sidebar ?? true
  if (sidebarOn) sidebarToggle.classList.add('tool-toggle--on')
  sidebarToggle.setAttribute('aria-pressed', String(sidebarOn))
  sidebarToggle.addEventListener('click', async () => {
    const isOn = sidebarToggle.classList.toggle('tool-toggle--on')
    sidebarToggle.setAttribute('aria-pressed', String(isOn))
    document.body.classList.toggle('side-panel', isOn)

    // Firefox: open/close the native sidebar (sidebar_action). This must be
    // invoked synchronously, before any await, so the user-gesture token from
    // the click is still valid; we await the returned promise afterwards.
    let firefoxSidebar
    if (!chrome.sidePanel && globalThis.browser?.sidebarAction) {
      firefoxSidebar = (isOn ? browser.sidebarAction.open() : browser.sidebarAction.close())
        .catch(err => console.warn('[CheckFox] sidebarAction toggle failed:', err.message))
    }

    await chrome.storage.local.set({ cfx_sidebar: isOn })

    // Chrome: switch the toolbar action between popup and side-panel-on-click.
    if (chrome.sidePanel) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: isOn })
      await chrome.action.setPopup({ popup: isOn ? '' : 'popup/popup.html' })
    }

    await firefoxSidebar
  })

  tokenToggle.addEventListener('click', () => {
    const show = tokenInput.type === 'password'
    tokenInput.type = show ? 'text' : 'password'
    tokenToggle.textContent = show ? t('settings.apikey.hide') : t('settings.apikey.show')
    tokenToggle.setAttribute('aria-label', show ? t('settings.apikey.ariaHide') : t('settings.apikey.ariaShow'))
  })

  saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim()

    if (!token) {
      showSettingsFeedback(feedback, 'error', t('settings.apikey.required'))
      return
    }

    saveBtn.disabled = true
    saveBtn.textContent = t('settings.save.connecting')
    clearSettingsFeedback(feedback)

    try {
      await pingConnection(token)
      await saveConfig(token)
      disconnectBtn.hidden = false
      showSettingsFeedback(feedback, 'ok', t('settings.save.connected'))
    } catch (err) {
      const msg = err instanceof ApiError
        ? t('settings.save.error.status', err.status)
        : t('settings.save.error.network')
      showSettingsFeedback(feedback, 'error', msg)
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = t('settings.save')
    }
  })

  disconnectBtn.addEventListener('click', async () => {
    disconnectBtn.disabled = true
    clearSettingsFeedback(feedback)
    try {
      await clearConfig()
      tokenInput.value = ''
      disconnectBtn.hidden = true
      // Drop the cached audit context so the Scan tab reflects the disconnect.
      renderCtxNotConfigured(document.getElementById('context-area'))
      showSettingsFeedback(feedback, 'ok', t('settings.disconnected'))
    } catch (err) {
      showSettingsFeedback(feedback, 'error', t('settings.save.error.network'))
      console.error('[CheckFox] disconnect:', err)
    } finally {
      disconnectBtn.disabled = false
    }
  })

  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang
      await saveLang(lang)
      translatePage()
      // Re-translate the tools panel group labels and tool content
      retranslateDynamicContent()
      // Re-translate the context area (connect prompt, match/selector cards)
      retranslateContextArea()
    })
  })
}

// Re-applies translations to dynamically built content after a language switch.
function retranslateDynamicContent() {
  // Tools panel group labels
  document.querySelectorAll('.tools-group-label[data-group]').forEach(node => {
    node.textContent = t(`group.${node.dataset.group}`)
  })
  // Tool labels, descriptions, and toggle aria-labels
  document.querySelectorAll('.tool-label[data-tool-id]').forEach(node => {
    node.textContent = t(`tool.${node.dataset.toolId}.label`)
  })
  document.querySelectorAll('.tool-desc[data-tool-id]').forEach(node => {
    node.textContent = t(`tool.${node.dataset.toolId}.description`)
  })
  document.querySelectorAll('.tool-toggle[data-tool-id]').forEach(node => {
    const label = t(`tool.${node.dataset.toolId}.label`)
    node.setAttribute('aria-label', t('tool.toggle.ariaLabel', label))
  })
  // Tool legend labels
  document.querySelectorAll('[data-legend-tool]').forEach(legendEl => {
    const toolId = legendEl.dataset.legendTool
    legendEl.querySelectorAll('[data-legend-index]').forEach(span => {
      const i = span.dataset.legendIndex
      const key = `tool.${toolId}.legend.${i}`
      const translated = t(key)
      if (translated !== key) span.textContent = translated
    })
  })
  // Custom CSS editor buttons and editor aria-label
  document.querySelectorAll('.tool-custom-apply').forEach(node => {
    node.textContent = t('tool.custom.apply')
  })
  document.querySelectorAll('.tool-custom-fullscreen').forEach(node => {
    const on = node.getAttribute('aria-pressed') === 'true'
    node.textContent = on ? t('tool.custom.exitFullscreen') : t('tool.custom.fullscreen')
  })
  document.querySelectorAll('.tool-custom-area .cm-content').forEach(node => {
    node.setAttribute('aria-label', t('tool.custom.ariaLabel'))
  })
  // Header subtitle (if showing "tools selected" state)
  const subtitleEl = document.getElementById('header-subtitle')
  if (subtitleEl.dataset.toolCount) {
    const count = parseInt(subtitleEl.dataset.toolCount, 10)
    const countSpan = subtitleEl.querySelector('span:first-child')
    const deselectBtn = subtitleEl.querySelector('.header__deselect-btn')
    if (countSpan) countSpan.textContent = t('tools.selected', count)
    if (deselectBtn) deselectBtn.textContent = t('tools.deselectAll')
  }
  // Scan button (if not currently scanning)
  const scanBtn = document.getElementById('scan-btn')
  if (!scanBtn.disabled) scanBtn.textContent = t('scan.btn')
}

// Re-applies translations to the dynamically rendered context area after a
// language switch. The connect/error prompts carry no user state and are
// rebuilt in the new language; the match/selector cards keep their live DOM
// (preserving any in-progress audit/sample selection) and only have their
// static labels and buttons re-translated in place.
function retranslateContextArea() {
  const area = document.getElementById('context-area')
  if (!area) return

  // Not-connected prompt — stateless, safe to fully re-render.
  if (area.querySelector('.ctx-connect')) {
    renderCtxNotConfigured(area)
    return
  }

  // Match card: "Match" badge and "Change" button.
  area.querySelectorAll('.ctx-badge--match').forEach(n => { n.textContent = t('ctx.badge.match') })
  area.querySelectorAll('.ctx-card__meta .btn--ghost').forEach(n => { n.textContent = t('ctx.btn.change') })

  // Selector field labels.
  const auditLabel = area.querySelector('#ctx-audit-label')
  if (auditLabel) auditLabel.textContent = t('ctx.label.audit')
  const sampleLabel = area.querySelector('#ctx-sample-label')
  if (sampleLabel) sampleLabel.textContent = t('ctx.label.sample')

  // Pull / Push action buttons (shared by match and selector). A mid-action
  // button is re-labelled by its own finally handler, so set unconditionally.
  area.querySelectorAll('.ctx-card__actions .btn--secondary').forEach(n => { n.textContent = t('ctx.btn.pull') })
  area.querySelectorAll('.ctx-card__actions .btn--primary').forEach(n => { n.textContent = t('ctx.btn.push') })

  // Error card retry button.
  area.querySelectorAll('.ctx-card--error .btn').forEach(n => { n.textContent = t('ctx.btn.retry') })
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
      else if (tool?.type === 'js') await executeFunc(tabId, tool.inject, [...(tool.args ?? []), getBadgeStrings()])
    }
  }

  const refreshSubtitle = () => updateHeaderSubtitle(activeIds, tabId, stateKey)

  for (const group of TOOL_GROUPS) {
    const groupLabel = el('h3', { class: 'tools-group-label', 'data-group': group })
    groupLabel.textContent = t(`group.${group}`)
    container.append(groupLabel)

    for (const tool of TOOLS.filter(tool => tool.group === group)) {
      container.append(buildToolRow(tool, activeIds.has(tool.id), tabId, activeIds, stateKey, refreshSubtitle))
    }
  }

  refreshSubtitle()
  return { activeIds, stateKey }
}

function updateHeaderSubtitle(activeIds, tabId, stateKey) {
  const subtitleEl = document.getElementById('header-subtitle')
  if (activeIds.size === 0) {
    subtitleEl.textContent = t('header.subtitle')
    delete subtitleEl.dataset.toolCount
    return
  }
  const count = activeIds.size
  subtitleEl.dataset.toolCount = count
  subtitleEl.replaceChildren()
  const countSpan = document.createElement('span')
  countSpan.textContent = t('tools.selected', count)
  const deselectBtn = document.createElement('button')
  deselectBtn.textContent = t('tools.deselectAll')
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
  document.querySelectorAll('.tool-toggle--on').forEach(toggleEl => {
    toggleEl.classList.remove('tool-toggle--on')
    toggleEl.setAttribute('aria-pressed', 'false')
  })
  document.querySelectorAll('.tool-row--active').forEach(r => r.classList.remove('tool-row--active'))
}

function buildToolRow(tool, isActive, tabId, activeIds, stateKey, refreshSubtitle) {
  const row = el('div', { class: `tool-row${isActive ? ' tool-row--active' : ''}` })

  const translatedLabel = t(`tool.${tool.id}.label`)
  const toggle = el('button', {
    class: `tool-toggle${isActive ? ' tool-toggle--on' : ''}`,
    'aria-pressed': String(isActive),
    'aria-label': t('tool.toggle.ariaLabel', translatedLabel),
    'data-tool-id': tool.id,
  })

  const info = el('div', { class: 'tool-info' })
  const labelEl = el('span', { class: 'tool-label', 'data-tool-id': tool.id })
  labelEl.textContent = translatedLabel
  const descEl = el('span', { class: 'tool-desc', 'data-tool-id': tool.id })
  descEl.textContent = t(`tool.${tool.id}.description`)
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
    const legendEl = el('div', { class: 'tool-legend', 'data-legend-tool': tool.id })
    tool.legend.forEach((item, i) => {
      const legendItem = el('div', { class: 'tool-legend-item' })
      const swatch = el('span', { class: 'tool-legend-swatch', style: `border: ${item.border}` })
      const swatchLabel = el('span', { 'data-legend-index': String(i) })
      swatchLabel.textContent = t(`tool.${tool.id}.legend.${i}`) || item.label
      legendItem.append(swatch, swatchLabel)
      legendEl.append(legendItem)
    })
    info.append(legendEl)
  }

  row.append(toggle, info)

  let customView = null
  let mountCustomEditor = null
  if (tool.type === 'custom') {
    const customArea = el('div', { class: 'tool-custom-area' })
    const editorWrap = el('div', { class: 'cm-editor-wrap' })

    const actions = el('div', { class: 'tool-custom-actions' })
    const fsBtn = el('button', { class: 'btn btn--sm btn--ghost tool-custom-fullscreen', type: 'button', 'aria-pressed': 'false' })
    fsBtn.textContent = t('tool.custom.fullscreen')
    const applyBtn = el('button', { class: 'btn btn--primary btn--sm tool-custom-apply', type: 'button' })
    applyBtn.textContent = t('tool.custom.apply')
    actions.append(fsBtn, applyBtn)

    customArea.append(editorWrap, actions)
    info.append(customArea)

    const apply = async () => {
      if (!tabId || !customView) return
      await injectCSS(tabId, customView.state.doc.toString().trim(), '__checkfox_custom')
    }

    // Lazy-load CodeMirror only when the tool is first opened, so it doesn't
    // weigh down every popup load. Idempotent.
    mountCustomEditor = async () => {
      if (customView) return
      const { createCssEditor } = await import('./editor.js')
      customView = createCssEditor({
        parent: editorWrap,
        placeholder: '/* your CSS here — Cmd/Ctrl+Enter to apply */',
        onApply: apply,
      })
      customView.contentDOM.setAttribute('aria-label', t('tool.custom.ariaLabel'))
    }

    applyBtn.addEventListener('click', apply)

    fsBtn.addEventListener('click', () => {
      const on = customArea.classList.toggle('tool-custom-area--fullscreen')
      fsBtn.setAttribute('aria-pressed', String(on))
      fsBtn.textContent = on ? t('tool.custom.exitFullscreen') : t('tool.custom.fullscreen')
      document.body.classList.toggle('cfx-noscroll', on)
      customView?.requestMeasure()
      customView?.focus()
    })

    // If the tool is already active on popup open, mount the editor immediately.
    if (isActive) mountCustomEditor().then(() => customView?.requestMeasure())
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
        else if (tool.type === 'js') await executeFunc(tabId, tool.inject, [...(tool.args ?? []), getBadgeStrings()])
      }
      // Lazily create the editor on first open, then re-measure now it's visible.
      if (tool.type === 'custom') {
        await mountCustomEditor()
        customView.requestMeasure()
        customView.focus()
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
      // Leaving fullscreen if the editor was maximised when toggled off.
      if (tool.type === 'custom') {
        row.querySelector('.tool-custom-area')?.classList.remove('tool-custom-area--fullscreen')
        document.body.classList.remove('cfx-noscroll')
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

// Scroll the matched element into view and flash a temporary outline on the page.
// Returns true if the element was found, false otherwise (e.g. dynamic page
// changed, or a restricted page where scripting is blocked).
async function highlightElementOnPage(tabId, selector) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [selector],
      func: (sel) => {
        let node
        try { node = document.querySelector(sel) } catch { return false }
        if (!node) return false
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const prev = { outline: node.style.outline, offset: node.style.outlineOffset }
        node.style.outline = '3px solid #f97316'
        node.style.outlineOffset = '2px'
        setTimeout(() => {
          node.style.outline = prev.outline
          node.style.outlineOffset = prev.offset
        }, 2000)
        return true
      },
    })
    return res?.result === true
  } catch (err) {
    console.warn('[CheckFox] highlightElementOnPage failed:', err)
    return false
  }
}

function getBadgeStrings() {
  return {
    altMissing:             t('badge.altMissing'),
    decorative:             t('badge.decorative'),
    noTitle:                t('badge.noTitle'),
    emptyTitle:             t('badge.emptyTitle'),
    useSemantic:            t('badge.useSemantic'),
    deprecated:             t('badge.deprecated'),
    semanticRemoved:        t('badge.semanticRemoved'),
    multipleMain:           t('badge.multipleMain'),
    duplicate:              t('badge.duplicate'),
    wrappedInLabel:         t('badge.wrappedInLabel'),
    noLabel:                t('badge.noLabel'),
    noLegend:               t('badge.noLegend'),
    notGrouped:             t('badge.notGrouped'),
    noAccessibleName:       t('badge.noAccessibleName'),
    noAutocomplete:         t('badge.noAutocomplete'),
    noRoleMain:             t('badge.noRoleMain'),
    noRoleBanner:           t('badge.noRoleBanner'),
    noRoleNav:              t('badge.noRoleNav'),
    noRoleFooter:           t('badge.noRoleFooter'),
    checkAccessibleVersion: t('badge.checkAccessibleVersion'),
    badHref:                t('badge.badHref'),
    missingHref:            t('badge.missingHref'),
    ariaHiddenInLink:       t('badge.ariaHiddenInLink'),
    notFocusable:           t('badge.notFocusable'),
    noSummary:              t('badge.noSummary'),
    noCaption:              t('badge.noCaption'),
    noHeaders:              t('badge.noHeaders'),
    layoutTable:            t('badge.layoutTable'),
    dataInLayout:           t('badge.dataInLayout'),
    pageLangMissing:        t('badge.pageLangMissing'),
    invalidLangCode:        t('badge.invalidLangCode'),
    invalidDir:             t('badge.invalidDir'),
    breaksTabOrder:         t('badge.breaksTabOrder'),
    notInTabOrder:          t('badge.notInTabOrder'),
  }
}

// ─── Scan results rendering ───────────────────────────────────────────────────

function showStatus(el, type, message) {
  el.className = `status status--${type}`
  el.textContent = message
  el.hidden = false
}

function renderResults(container, data, tabId) {
  const { violations, incomplete, passes, url } = data
  container.replaceChildren()

  const activeFilters = new Set(['violations', 'incomplete'])

  const list = el('ul', { class: 'results-list', 'aria-label': t('results.label') })

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

  const summary = el('div', { class: 'summary', role: 'group', 'aria-label': t('results.filter.label') })
  summary.append(
    makeFilter('badge--error', 'violations', t('results.violations', violations.length)),
    makeFilter('badge--info', 'incomplete', t('results.incomplete', incomplete.length)),
    makeFilter('badge--ok', 'passes', t('results.passes', passes.length)),
  )
  container.append(summary)

  const urlEl = el('p', { class: 'scan-url', title: url })
  urlEl.textContent = truncate(url, 60)
  container.append(urlEl)

  const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  const byImpact = arr => [...arr].sort((a, b) => (impactOrder[a.impact] ?? 99) - (impactOrder[b.impact] ?? 99))

  for (const v of byImpact(violations)) list.append(violationItem(v, 'violation', tabId))
  for (const v of byImpact(incomplete)) list.append(violationItem(v, 'incomplete', tabId))
  for (const p of passes) list.append(passItem(p))

  syncFilter()
  container.append(list)
}

function violationItem(v, status = 'violation', tabId) {
  // Left border comes from the status class; the impact only drives the badge below.
  const item = el('li', { class: `violation violation--${status}`, 'data-status': status })

  const header = el('div', { class: 'violation__header' })
  const ruleEl = el('strong', { class: 'violation__rule' })
  ruleEl.textContent = v.ruleId
  const impactEl = el('span', { class: `violation__impact violation__impact--${v.impact ?? 'unknown'}` })
  impactEl.textContent = v.impact ?? '—'

  if (status === 'incomplete') {
    const reviewEl = el('span', { class: 'violation__review-label' })
    reviewEl.textContent = t('results.needsReview')
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

  const nodes = el('ul', { class: 'nodes', 'aria-label': t('results.affected') })
  for (const n of v.nodes) {
    const nodeItem = el('li', { class: 'node' })

    // Top row: selector on the left (orange, truncated), "Find element →" right.
    const top = el('div', { class: 'node__top' })
    // The raw selector (n.selector) is CSS.escape'd (e.g. `.dark\:hover\:px-3`)
    // so it stays valid for querySelector. Show a de-escaped, readable version.
    const readable = readableSelector(n.selector)
    const selector = el('code', { class: 'node__selector', title: readable })
    selector.textContent = truncate(readable, 60)
    top.append(selector)

    let feedback
    if (tabId && n.selector) {
      const findBtn = el('button', { class: 'node__find', type: 'button' })
      findBtn.textContent = t('results.findElement')
      const arrow = el('span', { 'aria-hidden': 'true' })
      arrow.textContent = ' →'
      findBtn.append(arrow)
      feedback = el('span', { class: 'node__find-feedback', role: 'status' })
      findBtn.addEventListener('click', async () => {
        const found = await highlightElementOnPage(tabId, n.selector)
        feedback.textContent = found ? '' : t('results.elementNotFound')
      })
      top.append(findBtn)
    }

    const html = el('pre', { class: 'node__html' })
    html.textContent = n.htmlSnippet

    nodeItem.append(top, html)
    if (feedback) nodeItem.append(feedback)
    nodes.append(nodeItem)
  }
  item.append(nodes)

  const link = el('a', { href: v.helpUrl, target: '_blank', rel: 'noopener noreferrer', class: 'violation__help' })
  link.textContent = t('results.learnMore')
  const arrow = el('span', { 'aria-hidden': 'true' })
  arrow.textContent = ' ↗'
  const srText = el('span', { class: 'sr-only' })
  srText.textContent = t('results.opensNewTab')
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
  return t('push.result', applied, skipped)
}

function showCtxFeedback(feedbackEl, type, message) {
  feedbackEl.className = `ctx-card__feedback ctx-card__feedback--${type}`
  feedbackEl.textContent = message
  feedbackEl.hidden = false
}

function showSettingsFeedback(feedbackEl, type, message) {
  // Clear first so re-showing the same message still triggers the role="alert"
  // announcement (an unchanged live region is not re-read by screen readers).
  feedbackEl.textContent = ''
  feedbackEl.className = `settings-feedback settings-feedback--${type}`
  feedbackEl.textContent = message
}

// Empties the live region without removing it from the DOM, so the next
// message is reliably announced. Resetting the class collapses the box visually.
function clearSettingsFeedback(feedbackEl) {
  feedbackEl.className = 'settings-feedback'
  feedbackEl.textContent = ''
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

// Remove CSS escaping (backslashes) for human-readable display of a selector.
// e.g. `.dark\:hover\:bg-accent\/50` → `.dark:hover:bg-accent/50`.
// Display only — the original escaped selector is what gets queried.
function readableSelector(sel) {
  return sel.replace(/\\(.)/g, '$1')
}
