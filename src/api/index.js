const BASE_URL = 'https://checkfox.eu'

export class ConfigError extends Error {}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function loadConfig() {
  const data = await chrome.storage.local.get('cfx_token')
  return { token: data.cfx_token ?? '' }
}

export async function saveConfig(token) {
  await chrome.storage.local.set({ cfx_token: token })
}

export function isConfigured({ token }) {
  return Boolean(token)
}

export async function pingConnection(token) {
  const res = await fetch(BASE_URL + '/api/v1/audits?status=active', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`)
  return res.json()
}

async function request(path, init = {}) {
  const { token } = await loadConfig()
  if (!token) throw new ConfigError('Not configured')
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`)
  return res.json()
}

export const api = {
  audits: () => request('/api/v1/audits?status=active'),
  samples: (auditId) => request(`/api/v1/audits/${auditId}/samples`),
  findings: (auditId, sampleId) => request(`/api/v1/audits/${auditId}/samples/${sampleId}/findings`),
  prefill: (auditId, sampleId, violations) =>
    request(`/api/v1/audits/${auditId}/samples/${sampleId}/prefill`, {
      method: 'POST',
      body: JSON.stringify({ violations }),
    }),

  // Mark a whole topic's criteria as not_applicable on a sample.
  // payload is either { topic: 'Images' } (canonical topic name, matched
  // case-insensitively against the audit's criteria) or { criterionIds: [...] }
  // (the criterion_id UUIDs from the findings endpoint — most robust, avoids
  // localized topic-name mismatches). If both are sent, topic wins.
  // Response: { sample_id, topic, applied, skipped_count, applied_criteria, skipped }.
  // Like prefill, criteria with a human verdict are skipped, never overwritten.
  markTopicNA: (auditId, sampleId, payload) =>
    request(`/api/v1/audits/${auditId}/samples/${sampleId}/mark-topic-na`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
