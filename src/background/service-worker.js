// Minimal service worker for Session 1.
// Sessions 3-4 will add tab URL matching, audit context storage, and API sync here.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.info('[CheckFox] Extension installed.')
  }
})
