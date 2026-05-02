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

## Reference Links

- axe-core: https://github.com/dequelabs/axe-core
- RGAA 4.1: https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/
- RAWeb 1: https://accessibilite.public.lu/fr/raweb1/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Deque axe rules: https://dequeuniversity.com/rules/axe/
- Manifest V3 docs: https://developer.chrome.com/docs/extensions/mv3/
