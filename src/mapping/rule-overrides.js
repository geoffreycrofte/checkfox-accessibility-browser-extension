// Per-rule RGAA 4.1.2 / RAWeb 1.1 criterion overrides.
// Used instead of the generic WCAG-SC → criteria chain, which is too broad
// for SCs like 1.3.1 or 4.1.2 that each cover dozens of RGAA criteria.
//
// RAWeb and RGAA share the same criterion numbering for their 7 overlapping
// topics (Images → 1.x, Frames → 2.x, Colours → 3.x, Multimedia → 4.x,
// Tables → 5.x, Links → 6.x, Scripts → 7.x). Topics 8-13 are RGAA-only.
// When a rule only concerns RGAA-only topics, raweb is [].

/** @type {Record<string, { rgaa: string[], raweb: string[] }>} */
export const RULE_CRITERIA = {

  // ── Topic 1 — Images ─────────────────────────────────────────────────────────
  'image-alt':               { rgaa: ['1.1', '1.2'],            raweb: ['1.1', '1.2'] },
  'input-image-alt':         { rgaa: ['1.1', '1.2'],            raweb: ['1.1', '1.2'] },
  'object-alt':              { rgaa: ['1.1', '1.2'],            raweb: ['1.1', '1.2'] },
  'role-img-alt':            { rgaa: ['1.1', '1.2'],            raweb: ['1.1', '1.2'] },
  'svg-img-alt':             { rgaa: ['1.1', '1.2'],            raweb: ['1.1', '1.2'] },
  'image-redundant-alt':     { rgaa: ['1.2'],                   raweb: ['1.2'] },
  'area-alt':                { rgaa: ['1.1', '6.1', '6.2'],     raweb: ['1.1', '6.1', '6.2'] },

  // ── Topic 2 — Frames ─────────────────────────────────────────────────────────
  'frame-title':             { rgaa: ['2.1', '2.2'],            raweb: ['2.1', '2.2'] },
  'frame-title-unique':      { rgaa: ['2.1'],                   raweb: ['2.1'] },

  // ── Topic 3 — Colours ────────────────────────────────────────────────────────
  'color-contrast':          { rgaa: ['3.2'],                   raweb: ['3.2'] },
  'color-contrast-enhanced': { rgaa: ['3.2'],                   raweb: ['3.2'] },
  'link-in-text-block':      { rgaa: ['3.1'],                   raweb: ['3.1'] },

  // ── Topic 4 — Multimedia ─────────────────────────────────────────────────────
  'no-autoplay-audio':       { rgaa: ['4.10'],                  raweb: ['4.10'] },
  'video-caption':           { rgaa: ['4.3', '4.4'],            raweb: ['4.3', '4.4'] },
  'frame-focusable-content': { rgaa: ['4.11', '4.12'],          raweb: ['4.11', '4.12'] },
  'scrollable-region-focusable': { rgaa: ['4.11', '4.12'],      raweb: ['4.11', '4.12'] },
  'server-side-image-map':   { rgaa: ['4.11', '4.12'],          raweb: ['4.11', '4.12'] },

  // ── Topic 5 — Tables ─────────────────────────────────────────────────────────
  'td-headers-attr':         { rgaa: ['5.6', '5.7'],            raweb: ['5.6', '5.7'] },
  'th-has-data-cells':       { rgaa: ['5.4', '5.5'],            raweb: ['5.4', '5.5'] },
  'table-fake-caption':      { rgaa: ['5.1', '5.2'],            raweb: ['5.1', '5.2'] },
  'td-has-header':           { rgaa: ['5.6', '5.7'],            raweb: ['5.6', '5.7'] },
  'scope-attr-valid':        { rgaa: ['5.6', '5.7'],            raweb: ['5.6', '5.7'] },
  'table-duplicate-name':    { rgaa: ['5.1', '5.2'],            raweb: ['5.1', '5.2'] },
  'empty-table-header':      { rgaa: ['5.4', '5.5'],            raweb: ['5.4', '5.5'] },

  // ── Topic 6 — Links ──────────────────────────────────────────────────────────
  'link-name':               { rgaa: ['6.1', '6.2'],            raweb: ['6.1', '6.2'] },
  'identical-links-same-purpose': { rgaa: ['6.1', '6.2'],       raweb: ['6.1', '6.2'] },

  // ── Topic 7 — Scripts ────────────────────────────────────────────────────────
  'aria-allowed-attr':       { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-allowed-role':       { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-braille-equivalent': { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-command-name':       { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-conditional-attr':   { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-deprecated-role':    { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-dialog-name':        { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-hidden-body':        { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-hidden-focus':       { rgaa: ['7.1', '7.3'],            raweb: ['7.1', '7.3'] },
  'aria-meter-name':         { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-progressbar-name':   { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-prohibited-attr':    { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-required-attr':      { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-required-children':  { rgaa: ['7.1', '7.3'],            raweb: ['7.1', '7.3'] },
  'aria-required-parent':    { rgaa: ['7.1', '7.3'],            raweb: ['7.1', '7.3'] },
  'aria-roledescription':    { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-roles':              { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-tab-name':           { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-text':               { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-tooltip-name':       { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-treeitem-name':      { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-valid-attr':         { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'aria-valid-attr-value':   { rgaa: ['7.1'],                   raweb: ['7.1'] },
  'focus-order-semantics':   { rgaa: ['7.3'],                   raweb: ['7.3'] },
  'presentation-role-conflict': { rgaa: ['7.1'],                raweb: ['7.1'] },
  'blink':                   { rgaa: ['13.1'],                  raweb: [] },
  'marquee':                 { rgaa: ['13.1'],                  raweb: [] },

  // ── Topic 8 — Mandatory elements (RGAA only) ─────────────────────────────────
  'document-title':          { rgaa: ['8.5', '8.6'],            raweb: [] },
  'duplicate-id-aria':       { rgaa: ['8.2'],                   raweb: [] },
  'duplicate-id-active':     { rgaa: ['8.1', '8.2'],            raweb: [] },
  'duplicate-id':            { rgaa: ['8.1', '8.2'],            raweb: [] },
  'html-has-lang':           { rgaa: ['8.3', '8.4'],            raweb: [] },
  'html-lang-valid':         { rgaa: ['8.3', '8.4'],            raweb: [] },
  'html-xml-lang-mismatch':  { rgaa: ['8.3', '8.4'],            raweb: [] },
  'valid-lang':              { rgaa: ['8.7', '8.8'],            raweb: [] },

  // ── Topic 9 — Structure (RGAA only) ──────────────────────────────────────────
  'bypass':                  { rgaa: ['9.1', '12.6', '12.7'],   raweb: [] },
  'definition-list':         { rgaa: ['9.3'],                   raweb: [] },
  'dlitem':                  { rgaa: ['9.3'],                   raweb: [] },
  'empty-heading':           { rgaa: ['9.1'],                   raweb: [] },
  'heading-order':           { rgaa: ['9.1'],                   raweb: [] },
  'list':                    { rgaa: ['9.3'],                   raweb: [] },
  'listitem':                { rgaa: ['9.3'],                   raweb: [] },
  'p-as-heading':            { rgaa: ['9.1'],                   raweb: [] },
  'page-has-heading-one':    { rgaa: ['9.1'],                   raweb: [] },

  // ── Topic 10 — Presentation (RGAA only) ──────────────────────────────────────
  'avoid-inline-spacing':    { rgaa: ['10.12'],                 raweb: [] },
  'meta-viewport':           { rgaa: ['10.4'],                  raweb: [] },
  'meta-viewport-large':     { rgaa: ['10.4'],                  raweb: [] },

  // ── Topic 11 — Forms (RGAA only) ─────────────────────────────────────────────
  'autocomplete-valid':      { rgaa: ['11.13'],                 raweb: [] },
  'button-name':             { rgaa: ['11.9'],                  raweb: [] },
  'form-field-multiple-labels': { rgaa: ['11.2'],               raweb: [] },
  'input-button-name':       { rgaa: ['11.9'],                  raweb: [] },
  'label':                   { rgaa: ['11.1', '11.2'],          raweb: [] },
  'label-content-name-mismatch': { rgaa: ['11.2', '11.9'],      raweb: [] },
  'label-title-only':        { rgaa: ['11.1', '11.2'],          raweb: [] },
  'select-name':             { rgaa: ['11.1'],                  raweb: [] },
  'summary-name':            { rgaa: ['11.9'],                  raweb: [] },
  'aria-input-field-name':   { rgaa: ['11.1'],                  raweb: [] },
  'aria-toggle-field-name':  { rgaa: ['11.1'],                  raweb: [] },

  // ── Topic 12 — Navigation (RGAA only) ────────────────────────────────────────
  'accesskeys':              { rgaa: ['12.10'],                 raweb: [] },
  'landmark-banner-is-top-level':     { rgaa: ['12.6'],         raweb: [] },
  'landmark-complementary-is-top-level': { rgaa: ['12.6'],      raweb: [] },
  'landmark-contentinfo-is-top-level':{ rgaa: ['12.6'],         raweb: [] },
  'landmark-main-is-top-level':       { rgaa: ['12.6'],         raweb: [] },
  'landmark-no-duplicate-banner':     { rgaa: ['12.6'],         raweb: [] },
  'landmark-no-duplicate-contentinfo':{ rgaa: ['12.6'],         raweb: [] },
  'landmark-no-duplicate-main':       { rgaa: ['12.6'],         raweb: [] },
  'landmark-one-main':       { rgaa: ['12.6'],                  raweb: [] },
  'landmark-unique':         { rgaa: ['12.6'],                  raweb: [] },
  'nested-interactive':      { rgaa: ['12.9'],                  raweb: [] },
  'region':                  { rgaa: ['12.6'],                  raweb: [] },
  'skip-link':               { rgaa: ['12.7'],                  raweb: [] },
  'tabindex':                { rgaa: ['12.8'],                  raweb: [] },

  // ── Topic 13 — Consultation (RGAA only) ──────────────────────────────────────
  'css-orientation-lock':    { rgaa: ['13.9'],                  raweb: [] },
  'meta-refresh':            { rgaa: ['13.1', '13.8'],          raweb: [] },
  'meta-refresh-no-exceptions': { rgaa: ['13.1', '13.8'],       raweb: [] },

  // ── No RGAA/RAWeb criterion yet (WCAG 2.2 additions) ─────────────────────────
  'target-size':             { rgaa: [],                        raweb: [] },
}
