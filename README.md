# CheckFox Accessibility Auditor

A Manifest V3 browser extension that accelerates manual accessibility audits for
professional auditors. It runs an automated [axe-core](https://github.com/dequelabs/axe-core)
scan on the active tab, maps the results to **WCAG 2.2**, **RGAA 4.1.2** and
**RAWeb 1.1** criteria, provides a library of in-page visual audit tools, and
syncs bidirectionally with the [CheckFox](https://checkfox.eu) web app.

> The extension is a **starting point, not an autopilot.** It pre-fills findings
> and surfaces evidence; the auditor always validates or overrides.

---

## Features

- **Automated scan** — injects axe-core into the active tab and returns a
  structured violation list (`ruleId`, `impact`, `selector`, `htmlSnippet`,
  `helpUrl`, WCAG tags). Custom CheckFox checks extend axe for media elements.
- **Criteria mapping** — every violation is mapped to WCAG 2.2, RGAA 4.1.2 and
  RAWeb 1.1 criterion IDs via a self-contained, auditable mapping layer.
- **Visual audit tools** — 30+ toggleable in-page overlays that highlight
  images, links, headings, landmarks, ARIA, tables (summary / caption / headers /
  layout), language & reading direction, focus visibility, tab order, forms, and
  more. Each maps to the specific criteria it helps assess.
- **CheckFox sync**
  - **Push** pre-filled findings into the matching Audit › Sample.
  - **Pull** existing findings as read-only context while auditing.
  - **Topic N/A inventory** — detects RGAA/RAWeb topics with no relevant
    elements on the page (e.g. no images → topic 1) and lets the auditor confirm
    and mark whole topics *Not Applicable*.
- **Side panel or popup** — toggle in Settings.
- **Bilingual UI** — English / French, switchable in Settings.

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
  stored in `chrome.storage.local`.

### Project structure

```
public/
  manifest.json        MV3 manifest
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
docs/                  project context + criteria JSON sources
```

---

## Development

Requires Node.js (ESM) and npm.

```bash
npm install
npm run generate-icons     # one-time: creates placeholder icons in public/icons
npm run build              # two-step build → dist/
```

> **Always use `npm run build`** — it runs *two* Vite passes (main bundle +
> content script). A bare `vite build` wipes `dist/` and omits the content
> script, which makes Chrome refuse to load the extension.

For iterative work:

```bash
npm run dev                # rebuilds both bundles on change
```

### Load the extension

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select the `dist/` folder.
3. Reload from this page after each `npm run build`. Freshly loaded MV3
   extensions are unpinned — use the 🧩 toolbar menu to pin CheckFox.

### Connect to CheckFox

Open the extension → **Settings** → paste your `cfx_live_…` API key → **Save &
Connect**. The base URL defaults to `https://checkfox.eu`.

---

## Criteria sources

- WCAG 2.2 — <https://www.w3.org/TR/WCAG22/>
- RGAA 4.1 — <https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/>
- RAWeb 1.1 — <https://accessibilite.public.lu/fr/raweb1/>
- axe rules — <https://dequeuniversity.com/rules/axe/>

See [`CHANGELOG.md`](./CHANGELOG.md) for the version history and
[`docs/checkfox-browser-extension.md`](./docs/checkfox-browser-extension.md) for
detailed development notes.
