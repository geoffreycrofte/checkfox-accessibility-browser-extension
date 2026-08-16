// Per-rule RGAA 4.2 / RAWeb 1.1 criterion overrides.
// Used instead of the generic WCAG-SC → criteria chain, which is too broad
// for SCs like 1.3.1 or 4.1.2 that each cover many RGAA/RAWeb criteria.
//
// RAWeb 1.1 and RGAA 4.2 share identical criterion numbering and WCAG SC
// mappings for topics 1–13 (verified programmatically from the source JSON
// files in docs/). both() is used for all entries since the two referentials
// are currently identical. If they diverge in a future version, replace the
// relevant both() calls with explicit { rgaa: [...], raweb: [...] } objects.
//
// Reconciled against the official RAWeb "contrôle simplifié" axe→criterion table.
// Where we knowingly differ from it (ARIA validity → 7.1, lists → 9.3, and the
// deliberately narrowed link/label rules), the reasons are recorded in
// docs/axe-criteria-mapping.md — read it before "fixing" one of those entries.

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
  'area-alt':                both(['1.1', '1.2']),

  // ── Topic 2 — Frames ─────────────────────────────────────────────────────────
  'frame-title':             both(['2.1']),
  'frame-title-unique':      both(['2.1']),

  // ── Topic 3 — Colours ────────────────────────────────────────────────────────
  'color-contrast':          both(['3.2']),
  'color-contrast-enhanced': both(['3.2']),
  'checkfox-nontext-contrast': both(['3.3']),   // UI-component / boundary contrast (WCAG 1.4.11)
  // axe's color-contrast measures a control's *value* text but never reads
  // ::placeholder, so placeholder contrast is ours alone. Same criterion (3.2).
  'checkfox-placeholder-contrast': both(['3.2']),

  // ── Topic 4 — Multimedia ─────────────────────────────────────────────────────
  'no-autoplay-audio':       both(['4.10']),
  'video-caption':           both(['4.3']),
  'frame-focusable-content': both(['4.11', '4.12']),
  'scrollable-region-focusable': both(['4.11', '4.12']),
  'server-side-image-map':   both(['4.11', '4.12']),

  // ── Custom CheckFox rules (media not covered by axe-core) ─────────────────
  'checkfox-video-autoplay':    both(['13.8', '4.11']),
  'checkfox-media-no-controls': both(['4.11']),
  'checkfox-video-description': both(['4.1']),
  'checkfox-graphic-alt':       both(['1.1', '1.2']),
  'checkfox-svg-name-or-hide':  both(['1.1', '1.2', '1.3']),   // inline SVG: name it (1.1/1.3) or hide it (1.2)

  // ── Topic 5 — Tables ─────────────────────────────────────────────────────────
  // The header↔cell *association technique* is 5.7. 5.4–5.6 cover captions and
  // header relevance, which axe cannot judge. See docs/axe-criteria-mapping.md.
  'td-headers-attr':         both(['5.7']),
  'th-has-data-cells':       both(['5.7']),
  'td-has-header':           both(['5.7']),
  'scope-attr-valid':        both(['5.7']),
  'table-fake-caption':      both(['5.1', '5.2']),
  'table-duplicate-name':    both(['5.1', '5.2']),
  'empty-table-header':      both(['5.4', '5.5']),

  // ── Topic 6 — Links ──────────────────────────────────────────────────────────
  // "Links must have discernible text" = the link HAS an accessible name → 6.2
  // ("chaque lien a-t-il un intitulé ?"), NOT 6.1 (link text is *explicit*, which
  // needs human judgement and axe can't verify). WCAG 2.4.4 fans to both; narrow it.
  'link-name':               both(['6.2']),
  'identical-links-same-purpose': both(['6.1', '6.2']),
  // Generic link text ("Read more", "En savoir plus") is about the intitulé being
  // *explicit* → 6.1, not about a name merely existing (6.2, covered by link-name).
  'checkfox-link-text-generic': both(['6.1']),

  // ── Topic 7 — Scripts ────────────────────────────────────────────────────────
  'aria-allowed-attr':       both(['7.1']),
  'aria-allowed-role':       both(['7.1']),
  'aria-braille-equivalent': both(['7.1']),
  'aria-command-name':       both(['7.1']),
  'aria-conditional-attr':   both(['7.1']),
  'aria-deprecated-role':    both(['7.1']),
  'aria-dialog-name':        both(['7.1']),
  // NB: aria-hidden-body / aria-hidden-focus map to 10.8, see Topic 10 below.
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
  // Inline onchange/onfocus that navigates or submits = an uncontrolled change
  // of context (WCAG 3.2.2 / 3.2.1), which is exactly criterion 7.4.
  'checkfox-on-input-change': both(['7.4']),

  // ── Topic 8 — Mandatory elements ─────────────────────────────────────────────
  'document-title':          both(['8.5', '8.6']),
  'duplicate-id-aria':       both(['8.2']),
  // Duplicate IDs are a source-validity failure (8.2). 8.1 is doctype presence.
  'duplicate-id-active':     both(['8.2']),
  'duplicate-id':            both(['8.2']),
  // 8.3 = a default language is *declared*; 8.4 = that language code is *valid*.
  // Each axe rule checks exactly one of the two — don't fan out to both.
  'html-has-lang':           both(['8.3']),
  'html-lang-valid':         both(['8.4']),
  'html-xml-lang-mismatch':  both(['8.3', '8.4']),
  'valid-lang':              both(['8.8']),
  'checkfox-deprecated-presentational': both(['8.9']),
  // CheckFox custom checks added after this map was last synced (validate).
  'checkfox-doctype-missing': both(['8.1']),
  'checkfox-duplicate-id':    both(['8.2']),

  // ── Topic 9 — Information structure ──────────────────────────────────────────
  'definition-list':         both(['9.3']),
  'dlitem':                  both(['9.3']),
  'empty-heading':           both(['9.1']),
  'heading-order':           both(['9.1']),
  'list':                    both(['9.3']),
  'listitem':                both(['9.3']),
  'p-as-heading':            both(['9.1']),
  'page-has-heading-one':    both(['9.1']),

  // ── Topic 10 — Presentation ──────────────────────────────────────────────────
  // aria-hidden is a hidden-content concern, not a script/ARIA-compatibility one:
  // both rules describe content wrongly removed from (or left in) the a11y tree.
  'aria-hidden-body':        both(['10.8']),
  'aria-hidden-focus':       both(['10.8']),
  'avoid-inline-spacing':    both(['10.12']),
  // Same criterion, complementary evidence: axe flags !important inline spacing
  // declarations; ours applies the SC's own overrides and looks for clipped boxes.
  'checkfox-text-spacing':   both(['10.12']),
  'meta-viewport':           both(['10.4']),
  'meta-viewport-large':     both(['10.4']),
  'checkfox-focus-not-visible': both(['10.7']),
  'checkfox-reflow':         both(['10.11']),   // fixed px widths / no reflow at 320px (WCAG 1.4.10)
  'checkfox-presentational-attr': both(['10.1']),
  // Links distinguishable in a text block without relying on colour → link
  // visibility relative to surrounding text (RGAA 10.6), NOT the generic
  // "info by colour alone" (3.1). WCAG 1.4.1 fans out to both; this narrows it.
  'link-in-text-block':      both(['10.6']),

  // ── Topic 11 — Forms ─────────────────────────────────────────────────────────
  'autocomplete-valid':      both(['11.13']),
  'button-name':             both(['11.9']),
  'form-field-multiple-labels': both(['11.2']),
  'input-button-name':       both(['11.9']),
  'label':                   both(['11.1']),
  // Label-in-Name (WCAG 2.5.3) routes per element: link 6.1 / form field 11.2 /
  // button 11.9. See src/mapping/classify-target.js and docs/element-routed-criteria.md.
  'label-content-name-mismatch': byTarget(['6.1', '11.2', '11.9'], classifyLabelInName),
  'label-title-only':        both(['11.1']),
  // CheckFox custom check added after this map was last synced (validate).
  'checkfox-fieldset-missing': both(['11.5', '11.6']),
  // A field marked aria-invalid whose error text is not linked to it → 11.10
  // (error identification), not 11.1/11.2 (labelling).
  'checkfox-error-message-linkage': both(['11.10']),
  'select-name':             both(['11.1']),
  'summary-name':            both(['11.9']),
  'aria-input-field-name':   both(['11.1']),
  'aria-toggle-field-name':  both(['11.1']),

  // ── Topic 12 — Navigation ────────────────────────────────────────────────────
  'accesskeys':              both(['12.10']),
  // axe's `bypass` only verifies a skip link / landmark / heading exists to jump
  // past the header — that is 12.7 alone, not the heading-hierarchy (9.1) or
  // landmark-completeness (12.6) criteria.
  'bypass':                  both(['12.7']),
  'landmark-banner-is-top-level':      both(['12.6']),
  'landmark-complementary-is-top-level': both(['12.6']),
  'landmark-contentinfo-is-top-level': both(['12.6']),
  'landmark-main-is-top-level':        both(['12.6']),
  'landmark-no-duplicate-banner':      both(['12.6']),
  'landmark-no-duplicate-contentinfo': both(['12.6']),
  // Landmark *coverage* — "is every region of the page inside a landmark?" and
  // "is there exactly one main?" — is a document-structure question (9.2), not a
  // navigation-mechanism one (12.6). Aligned with the official RAWeb simplified
  // control. The landmark-*-is-top-level / no-duplicate-banner rules above stay
  // on 12.6: those are about the navigation landmarks themselves.
  'landmark-no-duplicate-main':        both(['9.2']),
  'region':                  both(['9.2']),
  'landmark-one-main':       both(['12.6']),
  'landmark-unique':         both(['12.6']),
  'nested-interactive':      both(['12.9']),
  'skip-link':               both(['12.7']),
  'tabindex':                both(['12.8']),
  // CSS `order` / `*-reverse` making Tab diverge from the visual layout is the
  // same criterion as a positive tabindex: tab order vs reading order (12.8).
  'checkfox-visual-order':   both(['12.8']),

  // ── Topic 13 — Consultation ──────────────────────────────────────────────────
  'css-orientation-lock':    both(['13.9']),
  // meta-refresh = a time limit the user cannot control → 13.1 (time limits),
  // not 13.8 (moving/blinking content).
  'meta-refresh':            both(['13.1']),
  'meta-refresh-no-exceptions': both(['13.1']),
  // <blink> / <marquee> are moving-content controls → 13.8, not time limits.
  'blink':                   both(['13.8']),
  'marquee':                 both(['13.8']),
  'checkfox-motion-uncontrolled': both(['13.8']),   // infinite CSS animation w/o pause control (WCAG 2.2.2)
  'checkfox-new-window-link': both(['13.2']),
  'checkfox-download-document': both(['13.3']),

  // ── No RGAA/RAWeb criterion yet (WCAG 2.2 additions) ─────────────────────────
  // RGAA 4.2 and RAWeb 1.1 both track WCAG 2.1, so the SCs added in WCAG 2.2
  // (2.4.11, 2.5.8, 3.3.8, …) have no criterion of their own yet. Rules below
  // are parked on the nearest existing criterion so they still land somewhere an
  // auditor will look, rather than disappearing from the referential view.
  // Expect to revisit all of these when RAWeb 1.2 / RGAA 5.0 land: they should
  // move to the dedicated criteria those versions are likely to introduce.
  'target-size':             both([]),
  // 2.4.11 Focus Not Obscured: a focus indicator hidden behind a sticky panel is
  // a visible-focus failure in practice, so 10.7 is a genuine fit, not a parking spot.
  'checkfox-focus-obscured': both(['10.7']),
  // 3.3.8 Accessible Authentication: parked on 11.13 (autocomplete / input
  // purpose) because the rule's autocomplete="off" signal literally lives there.
  'checkfox-auth-obstruction': both(['11.13']),
}
