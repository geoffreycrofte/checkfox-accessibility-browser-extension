// Per-rule RGAA 4.2 / RAWeb 1.1 criterion overrides.
// Used instead of the generic WCAG-SC → criteria chain, which is too broad
// for SCs like 1.3.1 or 4.1.2 that each cover many RGAA/RAWeb criteria.
//
// RAWeb 1.1 and RGAA 4.2 share identical criterion numbering and WCAG SC
// mappings for topics 1–13 (verified programmatically from the source JSON
// files in docs/). both() is used for all entries since the two referentials
// are currently identical. If they diverge in a future version, replace the
// relevant both() calls with explicit { rgaa: [...], raweb: [...] } objects.

import { classifyLabelInName } from './classify-target.js'

const both = ids => ({ rgaa: ids, raweb: ids })

// Element-routed override. `domain` is the full set of criteria the rule *can*
// map to (shown on the card); `classify(htmlSnippet)` resolves each affected node
// to the single criterion its element actually belongs to. Used for rules like
// Label-in-Name where one WCAG SC splits across RGAA/RAWeb criteria by element
// type. Keeps rgaa/raweb = domain so the static consumers (coverage checks, the
// generic display path) still see a valid criteria list.
const byTarget = (domain, classify) => ({
  ...both(domain),
  domain,
  resolve: node => {
    const id = classify(node?.htmlSnippet)
    return id ? both([id]) : null
  },
})

/** @type {Record<string, { rgaa: string[], raweb: string[], domain?: string[], resolve?: Function }>} */
export const RULE_CRITERIA = {

  // ── Topic 1 — Images ─────────────────────────────────────────────────────────
  'image-alt':               both(['1.1', '1.2']),
  'input-image-alt':         both(['1.1', '1.2']),
  'object-alt':              both(['1.1', '1.2']),
  'role-img-alt':            both(['1.1', '1.2']),
  'svg-img-alt':             both(['1.1', '1.2']),
  'image-redundant-alt':     both(['1.2']),
  'area-alt':                both(['1.1', '6.1', '6.2']),

  // ── Topic 2 — Frames ─────────────────────────────────────────────────────────
  'frame-title':             both(['2.1', '2.2']),
  'frame-title-unique':      both(['2.1']),

  // ── Topic 3 — Colours ────────────────────────────────────────────────────────
  'color-contrast':          both(['3.2']),
  'color-contrast-enhanced': both(['3.2']),
  'link-in-text-block':      both(['3.1']),

  // ── Topic 4 — Multimedia ─────────────────────────────────────────────────────
  'no-autoplay-audio':       both(['4.10']),
  'video-caption':           both(['4.3', '4.4']),
  'frame-focusable-content': both(['4.11', '4.12']),
  'scrollable-region-focusable': both(['4.11', '4.12']),
  'server-side-image-map':   both(['4.11', '4.12']),

  // ── Custom CheckFox rules (media not covered by axe-core) ─────────────────
  'checkfox-video-autoplay':    both(['13.8', '4.11']),
  'checkfox-media-no-controls': both(['4.11']),
  'checkfox-video-description': both(['4.1']),
  'checkfox-graphic-alt':       both(['1.1', '1.2']),

  // ── Topic 5 — Tables ─────────────────────────────────────────────────────────
  'td-headers-attr':         both(['5.6', '5.7']),
  'th-has-data-cells':       both(['5.4', '5.5']),
  'table-fake-caption':      both(['5.1', '5.2']),
  'td-has-header':           both(['5.6', '5.7']),
  'scope-attr-valid':        both(['5.6', '5.7']),
  'table-duplicate-name':    both(['5.1', '5.2']),
  'empty-table-header':      both(['5.4', '5.5']),

  // ── Topic 6 — Links ──────────────────────────────────────────────────────────
  'link-name':               both(['6.1']),
  'identical-links-same-purpose': both(['6.1', '6.2']),

  // ── Topic 7 — Scripts ────────────────────────────────────────────────────────
  'aria-allowed-attr':       both(['7.1']),
  'aria-allowed-role':       both(['7.1']),
  'aria-braille-equivalent': both(['7.1']),
  'aria-command-name':       both(['7.1']),
  'aria-conditional-attr':   both(['7.1']),
  'aria-deprecated-role':    both(['7.1']),
  'aria-dialog-name':        both(['7.1']),
  'aria-hidden-body':        both(['7.1']),
  'aria-hidden-focus':       both(['7.3']),
  'aria-meter-name':         both(['7.1']),
  'aria-progressbar-name':   both(['7.1']),
  'aria-prohibited-attr':    both(['7.1']),
  'aria-required-attr':      both(['7.1']),
  'aria-required-children':  both(['7.1', '7.3']),
  'aria-required-parent':    both(['7.1', '7.3']),
  'aria-roledescription':    both(['7.1']),
  'aria-roles':              both(['7.1']),
  'aria-tab-name':           both(['7.1']),
  'aria-text':               both(['7.1']),
  'aria-tooltip-name':       both(['7.1']),
  'aria-treeitem-name':      both(['7.1']),
  'aria-valid-attr':         both(['7.1']),
  'aria-valid-attr-value':   both(['7.1']),
  'focus-order-semantics':   both(['7.3']),
  'presentation-role-conflict': both(['7.1']),
  'blink':                   both(['13.1']),
  'marquee':                 both(['13.1']),

  // ── Topic 8 — Mandatory elements ─────────────────────────────────────────────
  'document-title':          both(['8.5', '8.6']),
  'duplicate-id-aria':       both(['8.2']),
  'duplicate-id-active':     both(['8.1', '8.2']),
  'duplicate-id':            both(['8.1', '8.2']),
  'html-has-lang':           both(['8.3', '8.4']),
  'html-lang-valid':         both(['8.3', '8.4']),
  'html-xml-lang-mismatch':  both(['8.3', '8.4']),
  'valid-lang':              both(['8.7', '8.8']),
  'checkfox-deprecated-presentational': both(['8.9']),

  // ── Topic 9 — Information structure ──────────────────────────────────────────
  'bypass':                  both(['9.1', '12.6', '12.7']),
  'definition-list':         both(['9.3']),
  'dlitem':                  both(['9.3']),
  'empty-heading':           both(['9.1']),
  'heading-order':           both(['9.1']),
  'list':                    both(['9.3']),
  'listitem':                both(['9.3']),
  'p-as-heading':            both(['9.1']),
  'page-has-heading-one':    both(['9.1']),

  // ── Topic 10 — Presentation ──────────────────────────────────────────────────
  'avoid-inline-spacing':    both(['10.12']),
  'meta-viewport':           both(['10.4']),
  'meta-viewport-large':     both(['10.4']),
  'checkfox-focus-not-visible': both(['10.7']),
  'checkfox-presentational-attr': both(['10.1']),

  // ── Topic 11 — Forms ─────────────────────────────────────────────────────────
  'autocomplete-valid':      both(['11.13']),
  'button-name':             both(['11.9']),
  'form-field-multiple-labels': both(['11.2']),
  'input-button-name':       both(['11.9']),
  'label':                   both(['11.1', '11.2']),
  // Label-in-Name (WCAG 2.5.3) routes per element: link 6.1 / form field 11.2 /
  // button 11.9. See src/mapping/classify-target.js and docs/element-routed-criteria.md.
  'label-content-name-mismatch': byTarget(['6.1', '11.2', '11.9'], classifyLabelInName),
  'label-title-only':        both(['11.1', '11.2']),
  'select-name':             both(['11.1']),
  'summary-name':            both(['11.9']),
  'aria-input-field-name':   both(['11.1']),
  'aria-toggle-field-name':  both(['11.1']),

  // ── Topic 12 — Navigation ────────────────────────────────────────────────────
  'accesskeys':              both(['12.10']),
  'landmark-banner-is-top-level':      both(['12.6']),
  'landmark-complementary-is-top-level': both(['12.6']),
  'landmark-contentinfo-is-top-level': both(['12.6']),
  'landmark-main-is-top-level':        both(['12.6']),
  'landmark-no-duplicate-banner':      both(['12.6']),
  'landmark-no-duplicate-contentinfo': both(['12.6']),
  'landmark-no-duplicate-main':        both(['12.6']),
  'landmark-one-main':       both(['12.6']),
  'landmark-unique':         both(['12.6']),
  'nested-interactive':      both(['12.9']),
  'region':                  both(['12.6']),
  'skip-link':               both(['12.7']),
  'tabindex':                both(['12.8']),

  // ── Topic 13 — Consultation ──────────────────────────────────────────────────
  'css-orientation-lock':    both(['13.9']),
  'meta-refresh':            both(['13.1', '13.8']),
  'meta-refresh-no-exceptions': both(['13.1', '13.8']),
  'checkfox-new-window-link': both(['13.2']),
  'checkfox-download-document': both(['13.3']),

  // ── No RGAA/RAWeb criterion yet (WCAG 2.2 additions) ─────────────────────────
  'target-size':             both([]),
}
