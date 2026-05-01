// WCAG 2.x SC → RAWeb 1.1 criteria mapping.
// Derived from https://github.com/accessibility-luxembourg/ReferentielAccessibiliteWeb/blob/main/en/json/criteres.json
// RAWeb covers 7 topics (Images, Frames, Colours, Multimedia, Tables, Links, Scripts).
// It is a strict subset of RGAA's 13 topics, with identical criterion numbering within shared topics.

/** @type {Record<string, string[]>} */
export const WCAG_TO_RAWEB = {
  '1.1.1': ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.9', '4.7', '4.8', '4.9', '6.1', '6.2'],
  '1.2.1': ['4.1', '4.2'],
  '1.2.2': ['4.3', '4.4'],
  '1.2.3': ['4.1', '4.2'],
  '1.2.5': ['4.5', '4.6'],
  '1.3.1': ['3.1', '5.1', '5.2', '5.4', '5.5', '5.6', '5.7', '5.8'],
  '1.3.2': ['5.3'],
  '1.4.1': ['3.1'],
  '1.4.2': ['4.10'],
  '1.4.3': ['3.2'],
  '1.4.5': ['1.8'],
  '1.4.11': ['3.3'],
  '2.1.1': ['4.11', '4.12'],
  '2.1.2': ['4.11', '4.12'],
  '2.4.4': ['6.1', '6.2'],
  '2.5.3': ['6.1'],
  '4.1.2': ['1.2', '1.3', '1.9', '2.1', '2.2', '4.13', '5.3', '7.1'],
}

// RAWeb criteria with no WCAG SC anchor — EN 301 549-only (media player requirements).
// These cannot be flagged by axe-core and require manual review.
export const RAWEB_NORM_ONLY = [
  { id: '4.14', norm: '7.3',       subject: 'User controls for captions and audio description at same level as player controls' },
  { id: '4.15', norm: '5.4+7.1.3', subject: 'Preservation of caption track during signal/format conversion' },
  { id: '4.16', norm: '5.4+7.2.3', subject: 'Preservation of audio description track during signal/format conversion' },
  { id: '4.17', norm: '7.1.4',     subject: 'User-controllable caption presentation characteristics' },
  { id: '4.18', norm: '7.1.5',     subject: 'Spoken subtitles — subtitles can be vocalised by assistive technology' },
]
