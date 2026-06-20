import { loadConfig, isConfigured, api } from '../api/index.js'

const CACHE_KEY = 'cfx_ctx_cache'
const ALARM_NAME = 'cfx_refresh'

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') console.info('[CheckFox] Extension installed.')
  scheduleRefresh()
  await applyDisplayMode()
})

chrome.runtime.onStartup.addListener(async () => {
  scheduleRefresh()
  await applyDisplayMode()
})

async function applyDisplayMode() {
  // Chrome-only: Firefox provides the sidebar via the sidebar_action manifest
  // key and has no programmatic display-mode toggle to apply here.
  if (!chrome.sidePanel) return
  try {
    const { cfx_sidebar } = await chrome.storage.local.get('cfx_sidebar')
    // Default to side-panel mode when the user hasn't chosen yet.
    const sidebar = cfx_sidebar ?? true
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: sidebar })
    await chrome.action.setPopup({ popup: sidebar ? '' : 'popup/popup.html' })
  } catch (err) {
    console.warn('[CheckFox] applyDisplayMode failed:', err.message)
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) await refreshCache()
})

function scheduleRefresh() {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 5 })
}

async function refreshCache() {
  try {
    const config = await loadConfig()
    if (!isConfigured(config)) return
    const { audits } = await api.audits()
    const samplesResults = await Promise.all(audits.map(a => api.samples(a.id)))
    const samples = Object.fromEntries(audits.map((a, i) => [a.id, samplesResults[i].samples ?? []]))
    await chrome.storage.local.set({ [CACHE_KEY]: { ts: Date.now(), audits, samples } })
  } catch (err) {
    console.warn('[CheckFox] background cache refresh failed:', err.message)
  }
}
