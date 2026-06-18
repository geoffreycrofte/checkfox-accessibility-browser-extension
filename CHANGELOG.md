# Changelog

All notable changes to the CheckFox Accessibility Auditor extension are
documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/),
and the project aims to follow [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-06-18

### Added
- **Five new custom checks** that extend axe-core into RAWeb 1.1 / RGAA 4.1.2
  criteria it doesn't cover. Each flows through the same enrichment pipeline and
  is reported as *incomplete* (human-verify) unless noted:
  - **Links opening a new window** (13.2) — flags `target="_blank"` links/areas
    with no detectable new-window warning (bilingual EN/FR detection).
  - **Obsolete presentational elements** (8.9) — reports `<center>`, `<font>`,
    `<big>`, `<tt>`, `<strike>`, `<basefont>` as a *violation* (`blink`/`marquee`
    are left to axe-core).
  - **Downloadable documents** (13.3) — flags links to office-format files
    (`pdf, doc(x), xls(x), ppt(x), odt, ods, odp, rtf`) for accessible-version
    verification.
  - **Canvas & embedded images** (1.1.7 / 1.1.8) — flags `<canvas>` and
    `<embed type="image/*">` lacking an accessible name, the two graphic types
    axe checks for `<object>`/`<svg>` but skips.
  - **Focus visibility** (10.7) — scans author stylesheets for `:focus` rules
    that suppress the outline with no in-rule replacement (border / box-shadow /
    background); cross-origin sheets are skipped.

## [0.2.0] - 2026-06-16

### Added
- **Custom CSS code editor** — the Custom CSS tool now uses a CodeMirror 6
  editor with CSS syntax highlighting, property/value autocompletion, line
  numbers and bracket matching. It opens at half the screen height, has a
  full-screen editing mode, and applies with the button or Cmd/Ctrl+Enter.
  CodeMirror is lazy-loaded (separate chunk) so it doesn't weigh down popup load.
- **Topic N/A inventory** — for RGAA/RAWeb audits, detects topics with no
  relevant elements on the page (Images, Frames, Multimedia, Tables, Links,
  Forms) and lets the auditor confirm and mark whole topics *Not Applicable* on
  the matched sample. Uses the robust `criterionIds` path (UUIDs resolved from
  the sample's findings) to avoid localized topic-name mismatches.
- **`markTopicNA` API method** → `POST /api/v1/audits/:id/samples/:sid/mark-topic-na`.
- **Disconnect button** in Settings, next to *Save & Connect* — removes your
  stored API key and clears cached audits in one click.
- A hint above the API key field links to where to find your key
  (*User Settings › Integrations* on checkfox.eu).
- **Design-pattern buttons tool** (criterion 7.1) — highlights scripted
  `role="button"` controls and flags missing accessible names, non-focusable
  controls, and `aria-disabled` states.
- **Table tools split** into four focused tools: Table summary (5.1–5.2),
  Table caption (5.4–5.5), Table headers (5.6–5.7), Layout tables (5.3–5.8) —
  also closing the previous gap where criteria 5.5–5.8 were unmapped.
- **Language tools split** into Page language (8.3–8.4), Language changes
  (8.7–8.8) and Reading direction (8.10).
- **Focus tool split** into Focus visibility (10.7) and Tab order (12.8).
- API error responses now surface the server's message/body instead of a bare
  `HTTP <status>`, making backend failures diagnosable.
- Manifest: `minimum_chrome_version` (114), Firefox `browser_specific_settings`
  (gecko id + `strict_min_version`), and `icon32` / `icon64` sizes.

### Changed
- Re-scoped the ARIA tool to criterion 7.1 only (it previously over-claimed 7.2
  and 7.3, which are manual / keyboard-operability concerns).
- Removed redundant criteria numbers from tool titles (the criteria badges below
  each tool already show them).
- Reordered the Scripts group to **ARIA roles & states → Design-pattern buttons
  → Status messages**.

### Fixed
- Connection status messages (connecting, connected, errors, disconnected) are
  now announced to screen readers via an `alert` live region.
- `npm run build` is now a single `vite build` that chains the content-script
  build into the same `dist/`, so a build can no longer leave a half-built
  extension missing `content/axe-core.js` (which made Chrome refuse to load it).
- The content-script build no longer re-copies `public/` (and a stray
  `.DS_Store`) into `dist/` (`publicDir: false` in `vite.config.content.js`).
- The main build strips `.DS_Store` from `dist/` so it never reaches a Web Store
  / AMO zip.
- Removed a stray, accidentally-committed duplicate `.git` directory and added a
  `.git */` ignore rule to prevent sync-tool copies from being tracked.

## [0.1.0]

Initial working extension.

### Added
- **Extension scaffold** — Manifest V3 popup, content script, and background
  service worker, built with Vite.
- **axe-core scan** — on-demand injection via `chrome.scripting`, structured
  results in the popup, double-injection guard.
- **Criteria mapping layer** — maps axe ruleIds to WCAG 2.2, RGAA 4.1.2 and
  RAWeb 1.1 criterion IDs (validated by a coverage test harness).
- **Custom CheckFox checks** for media elements (autoplay, missing controls,
  missing video descriptions) flowing through the same enrichment pipeline.
- **Visual audit tools** — toggleable in-page overlays across Structure,
  Content, Interaction and Presentation, each cleanly injecting/removing a
  `<style>` element and persisting state across popup open/close.
- **CheckFox API integration** — settings (URL + masked key, test-before-save),
  audit/sample matching against the active tab URL, Push (prefill) and Pull
  (read-only findings) flows.
- **Side panel mode** and **EN/FR interface language**, both toggleable in
  Settings.

[0.3.0]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/checkfox/checkfox-browser-extension/releases/tag/v0.1.0
