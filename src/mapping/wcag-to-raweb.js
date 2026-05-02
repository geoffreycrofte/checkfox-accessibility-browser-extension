// WCAG 2.x SC → RAWeb 1.1 criteria mapping.
// RAWeb 1.1 (Luxembourg) covers 17 topics: topics 1–13 are identical to RGAA 4.2,
// plus topics 14–17 (Documentation, Editing tools, Support services, Real-time
// communication) which have no WCAG SC anchors and are not reachable by axe-core.
// The WCAG SC → criterion mapping for topics 1–13 is verified identical to RGAA.
// Source: docs/raweb-1.1.json + docs/rgaa-4.2.json (compared programmatically).

export { WCAG_TO_RGAA as WCAG_TO_RAWEB } from './wcag-to-rgaa.js'

// RAWeb criteria with no WCAG SC anchor — EN 301 549-only (media player requirements).
// These cannot be flagged by axe-core and require manual review.
export const RAWEB_NORM_ONLY = [
  { id: '4.14', norm: '7.3',       subject: 'User controls for captions and audio description at same level as player controls' },
  { id: '4.15', norm: '5.4+7.1.3', subject: 'Preservation of caption track during signal/format conversion' },
  { id: '4.16', norm: '5.4+7.2.3', subject: 'Preservation of audio description track during signal/format conversion' },
  { id: '4.17', norm: '7.1.4',     subject: 'User-controllable caption presentation characteristics' },
  { id: '4.18', norm: '7.1.5',     subject: 'Spoken subtitles — subtitles can be vocalised by assistive technology' },
]
