# CheckFox Browser Extension — Project Context

## What is CheckFox

CheckFox (`checkfox.eu`) is a digital accessibility auditing tool aimed at professional auditors and designers. It supports manual audit workflows against multiple accessibility referentials (WCAG, RGAA, RAWeb, and others).

**Core audit flow:**
1. Auditor creates an **Audit**
2. Auditor adds **Samples** (URLs of pages to audit)
3. Auditor selects applicable **Guidelines** (WCAG 2.2, RGAA 4.1, RAWeb 1…)
4. Auditor goes through each Sample × Criterion combination and records **Findings** (verdict, problem description, fix suggestion, screenshots, notes)

The goal of this extension is to **accelerate step 4** by pre-filling findings with automated scan data, and to provide in-browser audit helpers during manual review.

---

## End Goal

A **Manifest V3 browser extension** that:

1. Runs an automated accessibility scan on the active tab (axe-core)
2. Maps violations to the relevant criteria in WCAG 2.2, RGAA 4.1, and RAWeb 1
3. Offers manual audit helper tools (DOM overlays, injectors)
4. Syncs bidirectionally with the CheckFox web app via API:
   - **Push**: sends pre-filled findings (problem + fix suggestion) into the matching Audit > Sample in CheckFox
   - **Pull**: retrieves existing findings from CheckFox as context while auditing

The auditor always validates or overrides pre-filled data. The extension is a **starting point**, not an autopilot.

---

## Architecture Decisions

- **Manifest V3** (Chrome-first, Firefox-compatible where possible)
- **axe-core** for DOM scanning (deterministic JS, no LLM cost at scan time)
- **LLM pre-fill** happens server-side in CheckFox (not in the extension itself) — extension sends raw violations, server enriches them into natural-language findings
- **No headless browser** needed — the auditor's own browser IS the scan environment (solves auth, SPA timing, CSP issues naturally)
- **Bearer token** stored in `chrome.storage.local` for CheckFox API auth
- **Element-routed criteria** — rules where one WCAG SC splits across RGAA/RAWeb criteria by element type (e.g. Label-in-Name → link 6.1 / button 11.9 / form field 11.2) resolve the criterion per affected node and split on push. See [docs/element-routed-criteria.md](element-routed-criteria.md)

---

## Sessions & Task Checklist

### Session 1 — Extension scaffold + axe-core scan ✅
> Goal: working data pipeline from page DOM to structured violation list

- [x] Scaffold Manifest V3 extension (manifest.json, popup, content script, background service worker)
- [x] Inject and run axe-core from content script on the active tab
- [x] Return structured results to popup: `{ ruleId, impact, selector, htmlSnippet, helpUrl, wcagTags }`
- [x] Display raw results in popup (no UI polish yet)
- [x] Handle edge cases: iframes, SPA load timing, axe already injected

---

### Session 2 — Criteria mapping layer ✅
> Goal: map axe ruleIds to WCAG 2.2, RGAA 4.1, RAWeb 1 criterion IDs

- [x] Build a `mapping/` module with three mapping tables (WCAG, RGAA, RAWeb)
- [x] Use official sources:
  - RGAA ↔ axe: DINUM repository / accessibility.numerique.gouv.fr (`RGAA/criteres.json`)
  - WCAG ↔ axe: axe-core rule `tags` field (`wcag143` → SC 1.4.3)
  - RAWeb: derived from `ReferentielAccessibiliteWeb` EN JSON
- [x] Output per violation: `{ ...violation, criteria: { wcag: [...], rgaa: [...], raweb: [...] } }`
- [x] Write a simple test harness to validate mapping coverage (`node src/mapping/coverage.js` — 104 assertions, 0 failures)
- [x] On-demand content script injection via `chrome.scripting` (no page reload needed after extension install/reload)

---

### Session 3 — Manual audit helper tools ✅
> Goal: in-page overlay tools to assist manual review

- [x] Panel UI in popup with toggleable tools (Scan / Tools tab bar)
- [x] Tool: Focus / Tab order — highlights `tabindex` values on interactive elements
- [x] Tool: Headings — outlines H1–H6 hierarchy with level labels
- [x] Tool: Images — shows alt text, flags missing alt, decorative SVGs
- [x] Tool: Links — audits link types, accessible names, hidden children
- [x] Tool: ARIA roles & states — exposes role, aria-label, aria-expanded, etc.
- [x] Tool: Landmarks — highlights banner, navigation, main, contentinfo
- [x] Tool: Disable CSS — toggles all page stylesheets off/on
- [x] Tool: Custom CSS — textarea + Apply button to inject arbitrary CSS
- [x] Bonus tools from auditor Stylus library: Lists, Tables, Forms & buttons, Language, Hidden content, Status messages, Text spacing (10.12 / WCAG 1.4.12)
- [x] Each tool is a toggle — injects/removes a `<style>` element cleanly on the active tab
- [x] Tools persist their state across popup open/close (stored in `chrome.storage.session`)
- [x] Active tools are re-applied on popup open (handles tab reloads clearing injected CSS)
- [x] Overlay labels use the extension's dark-theme palette (monospace font, semantic colours) — selectors kept from original Stylus tools verbatim

---

### Session 4 — CheckFox API integration ✅
> Goal: bidirectional sync between extension and CheckFox

**API contract (live — Supabase Edge Functions):**
- Base URL: configurable (users can self-host); default is the Supabase deployment.
- Auth: `Authorization: Bearer cfx_live_<token>` — generated in CheckFox > Settings > Integrations > API Keys. Stored alongside base URL in `chrome.storage.local`.
- `GET /api/v1/audits?status=active` → `{ audits: [{ id, name, website, guideline, status, due_date, created_at }] }`
- `GET /api/v1/audits/:auditId/samples` → `{ samples: [{ id, name, identifier, sample_type, description, created_at }] }` — `identifier` is the page URL
- `GET /api/v1/audits/:auditId/samples/:sampleId/findings` → `{ sample_id, findings: [{ criterion_id, criterion_num, status, comment: { problem, solution }, scanner_source, … }] }`
- `POST /api/v1/audits/:auditId/samples/:sampleId/prefill` — body: `{ violations: [{ ruleId, impact, description, help, helpUrl, nodes: [{ html, failureSummary }], criteria: { wcag, rgaa, raweb } }] }` → `{ applied, skipped_count, mappings, skipped }`
- CORS: `chrome-extension://` origins whitelisted.
- Prefill behaviour: only writes to criteria that are `not_tested` or absent — never overwrites a human verdict.

Extension tasks:
- [x] New `src/api/index.js` module — typed `ConfigError`/`ApiError`, `loadConfig`/`saveConfig`, `pingConnection`, `api.audits/samples/findings/prefill`
- [x] Settings tab: URL + masked API-key inputs, Save & Connect (tests connection before saving), Show/Hide toggle
- [x] On popup open: fetch active audits + all their samples in parallel (2-minute session cache), match `sample.identifier` against active tab URL (exact or path-prefix)
- [x] If match: context card shows audit name, sample name, identifier URL, `✓ Match` badge
- [x] If no match: manual selector (audit dropdown → sample dropdown populates from cache)
- [x] Push button: enabled after scan completes; sends enriched violations to `prefill`, shows `N criteria pre-filled, M skipped` result
- [x] Pull button: fetches findings, renders read-only list sorted by status (non-compliant first), close button
- [x] `help` field added to axe-runner mapper so violations include it in the push payload
- [x] Context area runs async on popup open (scan button immediately available)

---

## Notes & Discoveries

### Session 1
- axe-core is bundled into the content script by Vite (575 KB gzipped to ~157 KB) — no CDN fetch needed.
- Content script guards against double-injection with `window.__checkfoxAxeRunner`.
- iframes excluded from scan (`iframes: false`) to avoid cross-origin errors; can be revisited.

### Session 3
- **CSS injection via `chrome.scripting.executeScript`** rather than `insertCSS/removeCSS` — creates a `<style id="__checkfox_…">` element so removal is idempotent and doesn't require storing the exact CSS string.
- **14 tools total** across 4 groups: Structure (Headings, Landmarks, Lists, Tables), Content (Images, Links, Language, Hidden content), Interaction (Focus/Tab order, ARIA, Forms & buttons, Status messages), Presentation (Text spacing, Disable CSS, Custom CSS).
- **Overlay labels** replace the Stylus `html::after` fixed counter panel — counts are dropped in favour of in-place `::before`/`::after` badges styled with the extension's dark palette.
- **`no-css` tool** disables all `document.styleSheets` except CheckFox's own injected styles; re-enables on toggle off.
- **Custom CSS tool** expands a textarea when activated; user clicks Apply to inject — does not auto-inject on toggle.

### Session 2
- **axe tags already encode RGAA IDs** directly (`RGAA-3.2.1` in tag array) but we rely on the WCAG→RGAA map instead, keeping the mapping self-contained and auditable.
- **Tag decoding**: axe compact tags (`wcag143`) are decoded via a lookup table built from the canonical 84-SC WCAG 2.2 list. Longest-match is sorted first to handle `wcag1412` vs `wcag141` correctly.
- **RAWeb is a 7-topic subset of RGAA**: same criterion numbering within shared topics; RAWeb adds 5 EN 301 549-only criteria (4.14–4.18) with no WCAG anchor and no axe rule — these are manual-only and stored in `RAWEB_NORM_ONLY`.
- **35 WCAG 2.2 SCs have no RGAA/RAWeb mapping** — all are AAA-level or WCAG 2.2 additions not yet incorporated into RGAA 4.1.2 or RAWeb 1.1.
- **`scripting` permission added** to manifest to support on-demand injection (fixes "Could not reach the page" on pre-existing tabs).

---

### Session 4
- **`src/api/index.js`** — thin fetch wrapper; all four API calls + `pingConnection` for the settings test-before-save flow. `ConfigError` (not configured) and `ApiError` (HTTP failure) are distinct so the context area can show targeted messages.
- **Context area** renders into `#context-area` async on popup open without blocking the scan button. Uses `chrome.storage.session` to cache audits + samples for 2 minutes so repeated popup opens don't re-fetch.
- **URL matching** normalises trailing slashes and checks exact match, then path-prefix (stops at `/`, `?`, `#`) to avoid false prefix matches (e.g. `/about` not matching `/about-us`).
- **`apiCtx` object** threads mutable state (`context`, `violations`, `refreshPush`) between `initContextArea` and `initScanPanel` so the Push button can be enabled once both are set.
- **Push payload** maps `htmlSnippet → html` for the API shape; `help` field added to axe-runner's `mapRule`.
- **Settings tab** uses `pingConnection` (direct fetch, bypasses stored config) to test with new values before saving — user gets immediate feedback.

---

### Session 5 — Stylus parity: DP buttons + topic N/A inventory

> Closes the two gaps found when diffing the auditor's Stylus library against the extension's tools.

- **DP Button tool** (`dp-button`, Scripts group, criterion 07.01) — interprets the Stylus `07.01. DP Button` style. Highlights scripted `role="button"` controls (`[role="button"]:not(button):not(input)` — native buttons excluded) and flags: no accessible name (dashed red), not keyboard-focusable (solid red), `aria-disabled` (blue), or OK (green) with the name source + tabindex. A lead badge shows the real tag so role hijacking is visible.
- **Topic N/A inventory** (`src/inventory/index.js` + context-area section) — replaces the Stylus `0.Thématiques NA` counter. For RGAA/RAWeb audits only, counts elements per DOM-detectable topic; topics with **zero** elements become N/A candidates. Auditor-confirmed (pre-checked checklist → "Mark selected as N/A"), never auto-pushed. Covered topics: Images(1), Frames(2), Multimedia(4), Tables(5), Links(6), Forms(11). Other topics are never auto-flagged (not inferable from a single page).
  - Detection runs in-page via `chrome.scripting.executeScript` (`countTopics`, returns `-1` on a bad selector so it's never offered as N/A).
  - Multimedia criteria differ by referential: RGAA 4.1–4.13, RAWeb 4.1–4.18.
- **API**: `api.markTopicNA(auditId, sampleId, payload)` → `POST /api/v1/audits/:id/samples/:sid/mark-topic-na`. Body is `{ topic: 'Images' }` (canonical topic name, case-insensitive) **or** `{ criterionIds: [...] }` (criterion UUIDs from the findings endpoint). Response: `{ sample_id, topic, applied, skipped_count, applied_criteria, skipped }`. Like `prefill`, criteria with a human verdict (Success/Failure/Derogation) are skipped, never overwritten; already-N/A criteria count as skipped no-ops.
  - **The extension uses the `criterionIds` path** for robustness: on "Mark N/A" it GETs `findings`, collects `criterion_id` UUIDs whose `criterion_num` topic-segment matches a selected topic number, and posts them in one call. This sidesteps localized topic-name mismatches (e.g. RGAA "Formulaires" vs "Forms"). Result surfaced with `inv.result` mirroring `formatPushResult` (applied vs skipped_count).

---

### Session 6 — Scan panel inner tabs (Scan issues / Audit issues)

> Restructures the Scan panel so scanning and auditing are two distinct workflows instead of four loose buttons.

- **Decision**: replaced the single "Run accessibility scan" button + the context card's inline Pull/Push buttons with **two inner tabs** rendered below the website-match block: **Scan issues** (run a local scan → Push results) and **Audit issues** (Pull recorded findings → analyse, plus the topic N/A inventory).
- **Tabs appear only on a confirmed match.** When the URL maps to a known audit + sample, `setScanMode('match')` reveals the `#scan-subtabs` tablist and the Push button. When there is **no match**, the manual audit/sample picker stays but only the local Scan button shows (`setScanMode('scan-only')`) — Push/Pull are unavailable since scanning is local but pushing/pulling need a real match. Decision per Geoffrey: "tabs exist only when a matching website audit + sample is found, otherwise the Scan button would be the only option."
- **Architecture**: buttons (`#scan-btn`, `#push-btn`, `#pull-btn`) and panels (`#subpanel-scan`, `#subpanel-audit`) live in **static markup** inside `#panel-scan`; handlers are wired once in `initScanWorkspace(apiCtx)` and read the current audit/sample from the shared `apiCtx` at click time. This avoids re-binding on every context re-render and keeps `#status`/`#results`/`#findings-area` as stable nodes. `renderCtxMatch`/`renderCtxSelector` now only render the context card and call `setScanMode()`.
- `initTabs()` was scoped to `.tabs [role="tab"]` so the nested sub-tablist doesn't collide with the top-level tab logic.
- The topic N/A inventory section moved from the context card into the **Audit issues** tab (it's part of the audit workflow).
- New i18n keys: `subtab.label`, `subtab.scan`, `subtab.audit` (EN + FR).

---

### Session 7 — Inventory placement + active subtab styling

> Repositions the topic N/A inventory and tweaks the inner-tab visuals.

- **Decision (per Geoffrey)**: the topic N/A inventory section moves back **out** of the Audit issues tab to sit directly under the website-match block, **above** the `#scan-subtabs` inner tabs. `#inventory-area` is now a standalone node in `#panel-scan` (no longer inside `#subpanel-audit`), so it stays visible regardless of the active inner tab. `renderCtxMatch` still appends `buildInventorySection()` to it; `setScanMode()` still clears it on every context switch. Supersedes Session 6's note that the inventory lived in the Audit tab.
- **Active subtab background changed from accent orange to white** (`.subtab--active` → `background:#fff; color:var(--color-bg)`), keeping AA contrast (dark text on white).
- **Push feedback moved above the Push button** (`#push-feedback` now precedes `#push-btn` in `#subpanel-scan`) so the "N criteria pre-filled" result is visible without scrolling past the button.
- **Push result now links to the sample** in the web app: `buildPushResult(result, audit, sample)` appends an `↗` link to `${BASE_URL}/audit/{auditId}/sample/{sampleId}/` (target `_blank`, `rel="noopener noreferrer"`, `.sr-only` "opens in new tab"). `BASE_URL` is now exported from `src/api/index.js` (single source). `showCtxFeedback()` accepts a string **or** a DOM node so rich content can flow through the shared styling. New i18n key `push.viewSample` (EN + FR).

---

### Session 8 — Validate a manual selection to unlock the full workflow

> Lets a manually picked audit + sample behave like a real URL match once confirmed.

- **Decision (per Geoffrey)**: the manual audit/sample picker (reached via the **Change** button, or shown when the URL has no match) no longer stays permanently in `scan-only` mode. Once a **sample** is selected, a **Validate selection** button (`.ctx-validate`, `btn--primary`) appears. Clicking it calls `renderCtxMatch(area, apiCtx.context, …, { manual: true })`, which switches to the confirmed context card and `setScanMode('match')` — unlocking the Scan / Audit inner tabs, Push, Pull, and the Topic N/A inventory ("Detect empty topics") exactly as a genuine URL match does. **Supersedes Session 6's rule** that Push/Pull are unavailable without a real URL match.
- **Manual vs. match distinction kept visible**: `renderCtxMatch` gained a `{ manual }` option. A genuine URL match still shows the green `Match` badge; a validated manual selection shows a distinct blue **Manual** badge (`.ctx-badge--manual`). The **Change** button on the confirmed card returns to the picker in both cases.
- **Flow**: `renderCtxSelector` tracks the pending choice in `apiCtx.context`; the Validate button is hidden until a sample is chosen and re-hidden if the audit is changed. No new state is threaded — it reuses the existing `apiCtx.context`.
- New i18n keys: `ctx.badge.manual`, `ctx.btn.validate` (EN + FR).

---

### Design decision — the `needs_review` status stays out of the extension

> Concerns the CheckFox API's `needs_review` criterion status (mirrors axe-core's `incomplete` / "needs review" result type).

- **Decision (per Geoffrey)**: the extension does **nothing** with the `needs_review` status. It neither writes it on push nor derives it from axe `incomplete` results. The status lives at the **CheckFox Audit tool level** (a value a human auditor can pick manually) and at the **MCP level** (so an AI can select it when it is genuinely uncertain about a criterion).
- **Rationale**:
  - Axe's `incomplete` is a *tool's statement of uncertainty*, not a verdict. The criterion status is a *human (or AI) auditor's formal decision*. Auto-writing one into the other conflates two different things.
  - The axe→criterion mapping is lossy and many-to-one: several axe results (pass + violation + incomplete) can map to a single criterion, and a criterion is broader than any axe rule. One `incomplete` finding does not mean the whole criterion needs review.
  - Auto-setting a status would risk clobbering a verdict the auditor already recorded — the extension's push contract already refuses to overwrite human verdicts (see the `prefill` note), and this keeps that guarantee intact.
- **Consequence**: axe `incomplete` results are, at most, surfaced to the extension user as an advisory ("N automated checks need manual review") — never turned into a criterion status. The auditor or the MCP-driven AI remains the sole author of `needs_review`.

---

### Session 9 — Colors → Contrast tool (RGAA/RAWeb 3.2)

New tool group **Colors** (theme 3), positioned 3rd in the Tools tab (after Frames/2,
before Tables/5). First tool: **Contrast**.

- **What it does**: measures every text-bearing element's computed colour against its
  effective background (`collectContrast()` in `src/content/custom-checks.js`, reusing the
  existing `effectiveBackground` / `contrastRatio` / `isRendered` helpers), then the popup
  groups the results **by unique colour pair** (`fg|bg|required-threshold`), sorted
  worst-ratio-first. Each group shows the ratio, required threshold (4.5 / 3.0 by
  font size+weight), a live swatch, an occurrence count, and prev/next navigation that
  reuses `highlightElementOnPage` to flash each occurrence.
- **Data path**: a new `run-contrast` action on the `axe-runner.js` message listener returns
  `{ items, skippedImage }` synchronously; the popup fetches it with the same
  inject-then-retry pattern as the scan.
- **Design decision — sliding panel, new `type: 'report'` tool**: the grouped table is too
  invasive to sit inline in a tool row, so it renders in a **two-slide horizontal track**
  inside `#panel-tools` (tools list ⟷ detail). The off-screen slide is made `inert` +
  `aria-hidden`; opening moves focus to the detail heading, Back/Escape return focus to the
  toggle; the slide transition respects `prefers-reduced-motion`. Report tools have no
  page-side `inject`/`remove` — their output lives entirely in the popup, keeping the
  contrast maths as a single source of truth in `custom-checks.js`.
- **Scope decisions (per Geoffrey)**: **3.2 text contrast only** — 3.3 non-text contrast
  stays in the axe scanner.
- **Background image / gradient handling**: `resolveBackground()` walks the ancestor chain
  read-only (richer than `background-color: inherit`, and no per-element reflow). When an
  image/gradient sits over the measured solid colour the true backdrop is unknown, so the
  element is measured against the best-effort fallback and flagged `undetermined` →
  rendered as a **third "⚠ needs review" status** in the panel (fail / review / pass), never
  silently dropped. This means image-backed text without a colour fallback now raises a 3.2
  alert. The **solid-fallback fix itself** remains deferred to a future **criterion-10.5 tool**.

---

## Reference Links

- axe-core: https://github.com/dequelabs/axe-core
- RGAA 4.1: https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/
- RAWeb 1: https://accessibilite.public.lu/fr/raweb1/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Deque axe rules: https://dequeuniversity.com/rules/axe/
- Manifest V3 docs: https://developer.chrome.com/docs/extensions/mv3/
