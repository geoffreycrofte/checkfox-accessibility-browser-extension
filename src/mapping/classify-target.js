// Element-aware criterion routing for "Label in Name" (WCAG 2.5.3) failures.
//
// axe's `label-content-name-mismatch` rule fires on ANY interactive element
// whose visible text label is not contained in its accessible name — links,
// buttons, and form fields alike. RGAA 4.2 / RAWeb 1.1 split that single WCAG SC
// across three criteria depending on the offending element:
//   • 6.1  — links
//   • 11.9 — buttons
//   • 11.2 — form fields
// A static rule → criteria map can't express that, so we resolve the criterion
// per affected node from its HTML snippet.
//
// Pure string parsing (no DOM): runs unchanged in the popup, a content script,
// or the service worker.

// <input> types that expose a button role rather than a form field.
const BUTTON_INPUT_TYPES = new Set(['submit', 'button', 'reset', 'image'])

// ARIA roles that identify a form field for criterion 11.2.
const FORM_FIELD_ROLES = new Set([
  'textbox', 'combobox', 'searchbox', 'checkbox', 'radio', 'switch',
  'slider', 'spinbutton', 'listbox', 'menuitemcheckbox', 'menuitemradio',
])

/**
 * Extract the opening tag of an HTML snippet as { tag, attrs }.
 * @param {string} html
 * @returns {{ tag: string, attrs: Record<string, string> } | null}
 */
function parseOpeningTag(html) {
  if (typeof html !== 'string') return null
  const open = html.match(/<\s*([a-zA-Z][\w-]*)([^>]*)>/)
  if (!open) return null
  const tag = open[1].toLowerCase()
  const attrs = {}
  const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let m
  while ((m = attrRe.exec(open[2]))) {
    attrs[m[1].toLowerCase()] = (m[2] ?? m[3] ?? m[4] ?? '').toLowerCase()
  }
  return { tag, attrs }
}

/**
 * Resolve a "Label in Name" failure to its single RGAA/RAWeb criterion id.
 *
 * @param {string} html  the node's HTML snippet (axe `node.html` / `htmlSnippet`)
 * @returns {'6.1' | '11.9' | '11.2' | null}  null when the element can't be
 *          classified — callers should fall back to the rule's full criteria set
 *          so a criterion is never silently dropped.
 */
export function classifyLabelInName(html) {
  const parsed = parseOpeningTag(html)
  if (!parsed) return null
  const { tag, attrs } = parsed

  // An explicit ARIA role overrides the native element semantics.
  const role = attrs.role
  if (role === 'link') return '6.1'
  if (role === 'button') return '11.9'
  if (role && FORM_FIELD_ROLES.has(role)) return '11.2'

  switch (tag) {
    case 'a':
    case 'area':
      return '6.1'
    case 'button':
    case 'summary':
      return '11.9'
    case 'input':
      return BUTTON_INPUT_TYPES.has(attrs.type ?? 'text') ? '11.9' : '11.2'
    case 'select':
    case 'textarea':
      return '11.2'
    default:
      return null
  }
}
