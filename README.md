# CheckFox • Accessibility Companion

A Manifest V3 browser extension that accelerates manual accessibility audits for
professional auditors. It runs an automated [axe-core](https://github.com/dequelabs/axe-core)
+ [checkfox](https://checkfox.eu) scan on the active tab, maps the results to **WCAG 2.2**, **RGAA 4.1.2** and
**RAWeb 1.1** criteria, provides a library of in-page visual audit tools, and
syncs bidirectionally with the [CheckFox](https://checkfox.eu) web app to manage your
audits smarter.

> The extension is a **starting point, not an autopilot.** It pre-fills findings
> and surfaces evidence; the auditor always validates or overrides.

---

## Features

- **Automated scan** — injects axe-core into the active tab and returns a
  structured violation list (`ruleId`, `impact`, `selector`, `htmlSnippet`,
  `helpUrl`, WCAG tags). Custom CheckFox checks extend axe-core into RAWeb/RGAA
  criteria it doesn't cover — media (autoplay, controls, descriptions), links
  opening new windows (13.2), obsolete presentational elements (8.9),
  downloadable documents (13.3), canvas/embedded images (1.1.7–1.1.8) and focus
  visibility (10.7).
- **Pattern checks that need an auditor's eye** — eight advisory checks adapted
  from the [pour.dev engine](https://github.com/pourdev/pour-engine) return
  *review* verdicts (two also raise hard fails) for things automation can spot but
  not conclude: focus obscured by sticky UI (10.7), text-spacing overrides
  clipping content (10.12), CSS `order` diverging from tab order (12.8), auth
  flows blocking paste/autofill (11.13), error text not linked to its field
  (11.10), inline `onchange` causing a change of context (7.4), generic link text
  in EN *and* FR (6.1), and `::placeholder` contrast (3.2) — the one thing
  axe-core never measures.
- **Criteria mapping** — every violation is mapped to WCAG 2.2, RGAA 4.1.2 and
  RAWeb 1.1 criterion IDs via a self-contained, auditable mapping layer.
- **Visual audit tools** — 30+ toggleable in-page overlays that highlight
  images, links, headings, landmarks, ARIA, tables (summary / caption / headers /
  layout), language & reading direction, focus visibility, tab order, forms, and
  more. Each maps to the specific criteria it helps assess.
- **Colour contrast (3.2)** — the *Colors › Contrast* tool measures every
  text/background colour pair on the page, grouped by pair and sorted
  worst-ratio-first, splitting results into fails, passes, and image-backed text
  that needs manual review. Locate any occurrence straight from the panel.
- **CheckFox sync**: you'll need an API Key from the CheckFox [Accessibility Audit tool](https://checkfox.eu).
  - **Push** pre-filled findings into the matching Audit › Sample.
  - **Pull** existing findings as read-only context while auditing.
  - **Topic N/A inventory** — detects RGAA/RAWeb topics with no relevant
    elements on the page (e.g. no images → topic 1) and lets the auditor confirm
    and mark whole topics *Not Applicable*.
- **Side panel or popup** — toggle in Settings.
- **Bilingual UI** — English / French, switchable in Settings. Other languages will come.

---

## Architecture

- **Manifest V3**, Chrome-first, Firefox-compatible (`browser_specific_settings`).
- **axe-core** does the DOM scanning — deterministic, no LLM cost at scan time.
  axe's pre-built bundle is copied into the content script rather than re-bundled.
- **LLM enrichment happens server-side** in CheckFox, not in the extension — the
  extension sends raw violations; the server turns them into natural-language
  findings.
- **No headless browser** — the auditor's own browser *is* the scan environment,
  which naturally handles auth, SPA timing and CSP.
- **Auth** — a `cfx_live_…` Bearer token (from CheckFox › Settings › Integrations)
  stored in `chrome.storage.local`, for CheckFox Accessibility Audit App users.

### Project structure

```
public/
  manifest.json        MV3 manifest (localized via __MSG_*__ placeholders)
  _locales/            chrome.i18n catalogs for manifest name/description (en, fr)
  icons/               generated placeholder icons (replace before publishing)
src/
  api/                 CheckFox REST client (audits, samples, findings, prefill, mark-topic-na)
  background/          service worker
  content/             axe-runner + custom-checks (injected into the page)
  i18n/                EN/FR translation table
  inventory/           topic N/A detection (selectors + criteria per topic)
  mapping/             axe ruleId → WCAG/RGAA/RAWeb criterion mapping
  popup/               popup / side-panel UI
  tools/               the visual audit tool definitions
scripts/
  generate-icons.js    pure-Node placeholder icon generator
  split-and-zip.js     post-build: per-browser dist/ folders + upload zips
docs/                  project context + criteria JSON sources
```

---

## Development

Requires Node.js (ESM) and npm.

```bash
npm install
npm run generate-icons     # one-time: creates placeholder icons in public/icons
npm run build              # builds → dist/chrome/ and dist/firefox/ (each with a .zip)
```

> `npm run build` (a single `vite build`) builds the popup and service worker,
> chains the IIFE content-script build (axe-runner + a copy of axe-core), then
> splits the result into **`dist/chrome/`** and **`dist/firefox/`** — each with a
> browser-specific `manifest.json` and an upload-ready
> `checkfox-<browser>-v<version>.zip`. `public/manifest.json` is the single
> canonical manifest; the per-browser variants drop the keys the other browser
> doesn't understand (so neither store shows an "unrecognized key" warning) and
> rewrite the Firefox `background` to `scripts` (Firefox ships MV3
> `service_worker` disabled by default, still true at 140).
> Each folder also gets `third-party/axe-core-LICENSE.txt` — axe-core ships
> verbatim inside the content script and MPL-2.0 §3.2 requires its licence to
> travel with the build. If `node_modules/` is absent the build warns rather than
> failing, so never package a store upload from a tree you haven't `npm install`ed.
> Zipping uses the system `zip` utility (standard on macOS/Linux); if it's
> missing, the unpacked folders are still produced.

For iterative work:

```bash
npm run dev                # watch mode — rebuilds dist/chrome/ + dist/firefox/ (no zip)
```

### Load the extension

**Chrome** — `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/chrome/`. Freshly loaded MV3 extensions are unpinned —
use the 🧩 toolbar menu to pin CheckFox.

**Firefox** — `about:debugging#/runtime/this-firefox` → **Load Temporary
Add-on** → select `dist/firefox/manifest.json`.

For fast iteration, `npm run dev` rebuilds `dist/chrome/` and `dist/firefox/` on
every change (skipping the zip step) — load the folder for your browser and
reload it after each change.

### Connect to CheckFox

Open the extension → **Settings** → paste your `cfx_live_…` API key → **Save &
Connect**. The base URL defaults to `https://checkfox.eu`. Your key lives in
*User Settings › Integrations* on checkfox.eu, and **Disconnect** removes it
again at any time.

---

## Contributions, Inspiration & Sources

| Who | Contribution |
| --- | --- |
| **Geoffrey Crofte** — [@geoffreycrofte](https://github.com/geoffreycrofte) | Author of [CheckFox.eu](https://checkfox.eu) and of this extension. |
| **David Yarham** — [@davidyarham](https://github.com/davidyarham) | Author of the [pour.dev engine](https://github.com/pourdev/pour-engine), whose rules inspired 7 of the 8 checks added to the CheckFox checklist in 0.6.0. |
| **Deque Systems** — [@dequelabs](https://github.com/dequelabs) | [axe-core](https://github.com/dequelabs/axe-core) does the DOM scanning that every CheckFox report is built on. Its pre-built bundle ships inside the extension's content script, unmodified, under the [MPL-2.0](https://github.com/dequelabs/axe-core/blob/develop/LICENSE). |

The pour.dev-derived checks are adaptations, not copies: verdicts were re-tuned
for manual auditing, findings deduplicated by component shape, generic link-text
detection made bilingual (EN/FR), and every rule mapped explicitly to RGAA 4.1.2 /
RAWeb 1.1 criteria. The eighth check, `checkfox-placeholder-contrast`, is
CheckFox's own. See [`CHANGELOG.md`](./CHANGELOG.md#060---2026-08-16) for details.

---

## Criteria sources

- WCAG 2.2 — <https://www.w3.org/TR/WCAG22/>
- RGAA 4.1 — <https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/>
- RAWeb 1.1 — <https://accessibilite.public.lu/fr/raweb1/>
- axe rules — <https://dequeuniversity.com/rules/axe/>

See [`CHANGELOG.md`](./CHANGELOG.md) for the version history and
[`docs/checkfox-browser-extension.md`](./docs/checkfox-browser-extension.md) for
detailed development notes.
