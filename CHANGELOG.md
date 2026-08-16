# Changelog

All notable changes to the CheckFox • Accessibility Companion extension are
documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/),
and the project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] - 2026-08-16

### Added
- **Eight new custom checks**, ported and adapted from the
  [pour.dev engine](https://github.com/pourdev/pour-engine) (see
  [Contributions](./README.md#contributions)). All are advisory by design — they
  return **review** verdicts (two also raise hard **fails**), because each one
  detects a *pattern* that an auditor still has to judge in context:

  | Rule | WCAG | RGAA/RAWeb | Verdict |
  |---|---|---|---|
  | `checkfox-focus-obscured` | 2.4.11 | 10.7 | review |
  | `checkfox-text-spacing` | 1.4.12 | 10.12 | review |
  | `checkfox-visual-order` | 2.4.3 | 12.8 | review |
  | `checkfox-auth-obstruction` | 3.3.8 | 11.13 | fail + review |
  | `checkfox-error-message-linkage` | 3.3.1 | 11.10 | review |
  | `checkfox-on-input-change` | 3.2.2 | 7.4 | review |
  | `checkfox-link-text-generic` | 2.4.4 | 6.1 | review |
  | `checkfox-placeholder-contrast` | 1.4.3 | 3.2 | fail + review |

- **Placeholder contrast (3.2)** — reads `getComputedStyle(el, '::placeholder')`,
  which axe-core never inspects. This is net-new coverage rather than a port: the
  upstream `control-contrast` rule's placeholder branch is unreachable dead code,
  and its value-text branch duplicates axe's own `color-contrast`.
- **Generic link text is bilingual** — the upstream word list was English-only.
  French phrasings (*en savoir plus*, *lire la suite*, *cliquez ici*, *voir plus*,
  *découvrir*, …) are included, and name normalisation folds accents and trailing
  glyphs so "En savoir plus →" still matches.

- **axe-core licence bundled in the build** — `split-and-zip.js` now copies
  `node_modules/axe-core/LICENSE` into each per-browser folder as
  `third-party/axe-core-LICENSE.txt`, so the MPL-2.0 text ships with the binary as
  §3.2 requires (axe-core is redistributed verbatim inside the content script). A
  missing `node_modules/` warns instead of failing the build. The `THIRD_PARTY`
  list at the top of the script is the place to register any future bundled
  dependency.

### Changed
- **axe-core floor raised to `^4.11.4`** (was `^4.10.0`) — matches the version
  already resolved in `package-lock.json` and therefore the one actually shipping
  in the bundle.
- **Text-spacing findings are deduplicated** — one design-system component
  repeated across a card grid used to return 30 identical rows for what is a
  single CSS fix. Findings are now grouped by tag + class signature, capped at 3
  rows per shape, with the real repeat count carried in the message.
- **Explicit criterion mapping for all eight rules** in `rule-overrides.js` —
  without overrides, 2.4.4 would fan out to 6.1 + 6.2 and 2.4.3 to
  10.3 + 12.7 + 12.8. The narrowings are locked by 17 new assertions in
  `coverage.js` §5c.
- **WCAG 2.2-only criteria are parked, and flagged as such** — RGAA 4.1.2 and
  RAWeb 1.1 both track WCAG 2.1, so 2.4.11 and 3.3.8 have no criterion of their
  own. They map to 10.7 and 11.13 respectively so findings still surface where an
  auditor will look, with an inline note (mirrored beside `target-size`, which
  currently maps to nothing) that these must move when RAWeb 1.2 / RGAA 5.0
  introduce dedicated criteria.

## [0.5.0] - 2026-07-09

### Added
- **Colours → Contrast tool (RGAA/RAWeb 3.2)** — a new *Colors* tool group
  (theme 3, 3rd in the Tools tab). Toggling *Contrast* on slides an overlay panel
  in from the right that measures every text element's computed colour against its
  effective background and lists the results **grouped by unique colour pair**,
  worst-ratio-first — each row showing the ratio, the required threshold (4.5 / 3.0
  by font size + weight), a live swatch, an occurrence count, and prev/next
  controls that flash each occurrence on the page. Results split into **Fails /
  Review / Passes**: text over a background image or gradient (whose true backdrop
  can't be measured from colour alone) is surfaced as a **⚠ needs-review** alert
  against a best-effort fallback instead of being dropped, so image-backed text
  without a colour fallback still raises a 3.2 flag. Text contrast only — non-text
  contrast (3.3) stays in the axe scan. The panel is keyboard-operable and
  screen-reader friendly (list made `inert` while open, focus moves to the panel
  and returns to the toggle, Escape closes, respects `prefers-reduced-motion`).

### Fixed
- **Presentation attributes tool now detects the full deprecated set** — the
  *Presentation attributes* tool (RAWeb 10.01) previously checked only 7
  attributes (`align, bgcolor, color, face, hspace, vspace, border`) and no
  deprecated elements, so pages whose only legacy markup was e.g. `width` showed
  nothing. It now flags the deprecated elements (`<basefont> <blink> <center>
  <font> <marquee> <s> <strike> <tt> <big>`) and the full attribute set — matching
  the reference stylesheet — with `width`/`height` excluded on media/replaced
  elements and `color` limited to `<font>`/`<basefont>`/`<hr>`. It now also shows
  a fixed summary badge confirming the check ran — green *"No deprecated
  presentation elements or attributes"* when clean, or a red occurrence count when
  legacy markup is found — so a clean page reads as verified rather than skipped.

### Changed
- **Label-in-Name criteria now route by element** — `label-content-name-mismatch`
  (WCAG 2.5.3) previously stamped a static `11.2 / 11.9` on every occurrence.
  Each affected element is now classified — link → **6.1**, button → **11.9**,
  form field → **11.2** — so the card shows all three candidate criteria with only
  the matched ones highlighted (the rest muted), and pushing splits each
  occurrence to its correct criterion instead of over-filling. See
  [docs/element-routed-criteria.md](docs/element-routed-criteria.md).

## [0.4.0] - 2026-07-01

### Changed
- **Topic N/A inventory repositioned** — the empty-topic detection section (detect
  button, results, and *Mark N/A* action) now sits directly under the website-match
  block, above the Scan / Audit inner tabs, instead of inside the Audit issues tab.
  It stays visible regardless of which inner tab is active.
- **Active inner tab restyled** — the selected *Scan issues / Audit issues* sub-tab
  now uses a white background with dark text instead of the orange accent fill
  (keeps AA contrast).
- **Push result moved above the Push button** — the "N criteria pre-filled"
  confirmation now renders before the button, so it's visible without scrolling
  past it.
- **Firefox minimum raised to 140** (`gecko.strict_min_version`, was 128) — the
  version where `data_collection_permissions` takes effect, and the current
  Firefox ESR (128 is now End-of-Life). CheckFox stays desktop-only; Firefox for
  Android isn't targeted (its primary surface, the side panel, doesn't exist
  there), so `gecko_android` is intentionally omitted.

### Added
- **Sample link in the push confirmation** — after a successful push, the result
  message includes a *View sample in CheckFox ↗* link to the matched audit sample
  (`/audit/{auditId}/sample/{sampleId}/`), opening in a new tab with a
  screen-reader "opens in new tab" note. New i18n key `push.viewSample` (EN/FR).
- **Firefox data-collection consent** — declared
  `browser_specific_settings.gecko.data_collection_permissions` with
  `required: ["websiteContent", "browsingActivity", "authenticationInfo"]`,
  mandatory for AMO submissions since 2025-11-03. Reflects what the extension
  transmits: the HTML snippets pushed to a CheckFox audit, the audited page URL,
  and the CheckFox API key (mirroring the Chrome Web Store "Authentication
  information" disclosure). (Firefox-only; the Chrome build strips
  `browser_specific_settings`.)
- **Localized manifest metadata** — the extension `name`, `description` and
  Firefox sidebar title are now provided through `chrome.i18n` `_locales/`
  message catalogs (`_locales/en`, `_locales/fr`) with `__MSG_*__` placeholders
  and `default_locale: "en"`, per Chrome's
  [i18n recommendation](https://developer.chrome.com/docs/extensions/reference/api/i18n#concepts_and_usage).
  The store listing, browser management page and toolbar tooltip now follow the
  browser UI language. (The in-popup UI keeps its own EN/FR runtime switcher,
  which `chrome.i18n` cannot drive because it is fixed to the browser locale.)

### Fixed
- **Firefox install failure** — the Firefox build now ships the background as
  `background.scripts` (keeping `type: "module"`) instead of
  `background.service_worker`, which Firefox ships disabled by default (still
  true at 140). Loading the temporary add-on previously failed with
  *"background.service_worker is currently disabled. Add background.scripts."*
  Chrome keeps `service_worker` unchanged.
- **Interface language not fully applied on switch** — switching EN ⇄ FR now also
  re-translates the context area. The "Connect CheckFox in Settings…" prompt and
  its *Go to Settings* button (plus the match/selector card labels and Pull/Push
  actions) previously kept whatever language was active when they first rendered.
  In-progress audit/sample selections are preserved across the switch.

## [0.3.0] - 2026-06-19

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
- **Firefox sidebar support** — the manifest now also declares `sidebar_action`,
  and the side-panel toggle feature-detects: Chrome keeps `chrome.sidePanel`,
  Firefox opens/closes its native sidebar via `browser.sidebarAction`.
- **Per-browser builds** — `npm run build` now outputs `dist/chrome/` and
  `dist/firefox/`, each with a browser-specific `manifest.json` (Chromium-only and
  Firefox-only keys are stripped for the other) and an upload-ready
  `checkfox-<browser>-v<version>.zip`. `npm run dev` refreshes both folders on
  every change but skips the zip step.
- **`docs/publish-extension.md`** — Chrome Web Store + Firefox AMO publishing
  guide (assets, listing copy, permission justifications, privacy disclosures,
  packaging and submission steps).

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

[Unreleased]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/checkfox/checkfox-browser-extension/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/checkfox/checkfox-browser-extension/releases/tag/v0.1.0
