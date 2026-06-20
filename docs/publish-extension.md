# Publishing CheckFox • Accessibility Companion

A single source of truth for shipping the extension to the **Chrome Web Store
(CWS)** and **Firefox Add-ons (AMO)**. It lists every asset, the exact copy to
paste into each dashboard, file formats/dimensions, permission justifications,
privacy disclosures, and the packaging + submission steps.

Keep this file updated on every release (bump *Last updated* and the Version
history table). It is documentation only — exclude it from the shipped package.

> **Last updated:** 2026-06-19 · **Current version:** 0.3.0

---

## 0. Pre-flight (do these first)

- [x] **Replace the placeholder icons.** `public/icons/icon*.png` are generated
  placeholders (see README). The 128×128 is also your CWS/AMO store icon — ship
  a real, legible-at-16px logo before submitting.
- [x] **Bump the version** in `package.json` *and* `public/manifest.json` (they
  must match). Both stores reject an upload whose version ≤ the published one.
- [x] **Build cleanly:** `npm run build` → produces `dist/chrome/` and
  `dist/firefox/`, each with its zip. Confirm `content/axe-core.js` exists in both
  and no `.DS_Store` leaked in.
- [x] **Host the privacy policy** at a stable public URL (see §6). Required here
  because we use the `<all_urls>` host permission and transmit data off-device.
- [ ] **Smoke-test the built `dist/`** unpacked in *both* browsers (see §8 for the Firefox compatibility caveats — `side_panel` is Chromium-only).
- [x] **Contact email** that you actively monitor — both stores send takedown and
  policy notices there.

---

## 1. Assets — dimensions & formats

| Asset | Chrome Web Store | Firefox AMO | Notes |
|-------|------------------|-------------|-------|
| **Store icon** | 128×128 PNG (uploaded in dashboard) | 128×128 (square; PNG/JPG/SVG, up to 512×512) | No transparency tricks; must read at 16px. Reuse the real `icon128.png`. |
| **Screenshots** | **≥1 required**, 1280×800 **or** 640×400 PNG/JPG | ≥1 recommended, PNG/JPG; 1280×800 recommended | Show the extension *in action* on a real page, not just the popup. Up to 5 (CWS). Keep them current with the UI. |
| **Small promo tile** | 440×280 PNG/JPG (recommended) | — | Used for featured placement / category pages. |
| **Marquee promo tile** | 1400×560 PNG/JPG (optional) | — | Only for editorial featuring. |
| **Promo video** | 1 public/unlisted **YouTube URL** (no file upload) | No dedicated field — paste a YouTube link in the description | 30–60s screencast of a scan → results → push to CheckFox works well. |

**No phone/tablet mockups** unless the extension actually runs there. **No
trademarked logos** (other companies') in screenshots.

### Recommended screenshot set (4)
1. Popup after a scan — violation list with WCAG/RGAA/RAWeb criterion badges.
2. A custom-check result (e.g. "link opens new window" or focus-visibility) with
   the in-page element highlighted.
3. Side-panel mode open beside a real page being audited.
4. CheckFox sync — Push/Pull and Topic N/A inventory in Settings.

Store source files (not shipped) under a `store-assets/` folder so they're
versioned but excluded from the package.

---

## 2. Listing copy — paste-ready

### Name (≤75 chars · canonical source is `_locales/<locale>/messages.json`)
The manifest uses `"name": "__MSG_extName__"` with `default_locale: "en"`, so the
displayed name comes from the `extName` message per locale (the store shows it in
the user's browser language):
```
en  CheckFox • Accessibility Companion
fr  CheckFox • Compagnon d'accessibilité
```

### Short description / AMO summary (CWS ≤132 · AMO ≤250)
```
Run axe-core scans and map each result to WCAG 2.2, RGAA 4.1.2 and RAWeb 1.1, then sync findings to your CheckFox audits.
```
(121 chars — fits the CWS 132 limit and AMO. The packaged `extDescription`
message in `_locales/en/messages.json`, 72 chars, is also fine as a fallback —
and `_locales/fr` carries the French equivalent.)

### Single purpose (CWS dashboard field — reviewers read this closely)
```
Scans the active web page for accessibility issues and maps each result to WCAG, RGAA and RAWeb criteria to speed up professional manual audits.
```

### Detailed description (CWS ≤16,000 · AMO description)
CWS strips markdown — this is plain text with line breaks on purpose.
```
CheckFox • Accessibility Companion accelerates manual accessibility audits. It runs an automated axe-core scan on the page you're auditing, maps every result to WCAG 2.2, RGAA 4.1.2 and RAWeb 1.1 criteria, and gives you a library of in-page visual tools to verify what automation can't.

It's a starting point, not an autopilot: the extension pre-fills findings and surfaces evidence — you always validate or override.

FEATURES
• Automated scan — injects axe-core into the active tab and returns a structured violation list (rule, impact, selector, HTML snippet, help link, WCAG tags).
• Extended coverage — custom checks reach RAWeb/RGAA criteria axe-core doesn't cover: media (autoplay, controls, descriptions), links opening new windows (13.2), obsolete presentational elements (8.9), downloadable documents (13.3), canvas/embedded images (1.1.7–1.1.8) and focus visibility (10.7).
• Triple criteria mapping — every result is mapped to WCAG 2.2, RGAA 4.1.2 and RAWeb 1.1 criterion IDs via a self-contained, auditable mapping layer.
• Visual audit tools — 30+ toggleable in-page overlays for images, links, headings, landmarks, ARIA, tables, language & reading direction, focus, tab order and forms.
• CheckFox sync — push pre-filled findings into your matching audit sample, pull existing findings as read-only context, and mark whole topics Not Applicable.
• Side panel or popup, and a bilingual EN/FR interface — both toggleable in Settings.

HOW TO USE
1. Click the CheckFox icon in the toolbar (or open the side panel).
2. Click Scan to run axe-core + custom checks on the current page.
3. Review the findings and their WCAG/RGAA/RAWeb criteria.
4. (Optional) In Settings, paste your CheckFox API key to push findings to an audit on checkfox.eu.

PRIVACY
The extension only acts on the active tab when you run a scan or toggle a tool. Your CheckFox API key and preferences are stored locally on your device. Page data (the URL and the findings you choose to push) is sent only to your own CheckFox account at checkfox.eu, over HTTPS, and only when you explicitly connect or push. No analytics, no tracking, no data sold or shared. Full policy: [PRIVACY POLICY URL]

PERMISSIONS
• "Read and change data on sites you visit" — needed to inject the scanner and read the DOM of the page you're auditing. Auditors can't know which sites they'll audit in advance, so all-sites access is required; the extension only activates on the active tab when you act.

SUPPORT
Questions or bugs? Email [SUPPORT EMAIL] or open an issue at [REPO/ISSUES URL].

Version 0.3.0 — Added five custom checks extending axe-core into RAWeb/RGAA criteria (new windows, obsolete elements, downloads, canvas/embed images, focus visibility).
```

### Category
- **Chrome:** primary **Developer Tools** (best fit for the auditor audience).
  *Accessibility* is also a valid CWS category if you'd rather lead with that.
- **Firefox:** **Web Development** (pick up to 2; *Other* as secondary).

### Primary language
English. (UI is bilingual EN/FR — you may add a French listing translation in
both dashboards later.)

---

## 3. Permission justifications

Both dashboards require a plain-English reason per permission. "Required for
functionality" gets rejected. Manifest declares: `activeTab`, `scripting`,
`storage`, `alarms`, `sidePanel`, and `host_permissions: <all_urls>`.

| Permission | Type | Justification |
|-----------|------|---------------|
| `activeTab` | permission | Grants temporary access to the current tab when the auditor clicks Scan or toggles a tool, so axe-core and the overlays can run on the page being audited. No persistent background access. |
| `scripting` | permission | Injects the axe-core scanner and the in-page visual audit overlays into the active tab on demand. |
| `storage` | permission | Stores the auditor's CheckFox API key, interface language, side-panel preference, and a short-lived audit-context cache locally (`chrome.storage.local`/`session`). `chrome.storage.sync` is **not** used. |
| `alarms` | permission | Schedules periodic refresh of the cached audit/sample list from the CheckFox API so URL matches stay current without re-fetching on every popup open. |
| `sidePanel` | permission | Provides the optional side-panel mode so the audit UI stays open alongside the page being audited. |
| `<all_urls>` | host_permission | Auditors audit arbitrary client websites that aren't known in advance, so the scanner needs to run on any site. Access is exercised only on the active tab and only when the auditor explicitly runs a scan or toggles a tool. |

> **Reducing scrutiny:** `<all_urls>` is the single biggest review-risk flag and
> is what makes a privacy policy mandatory. It's justified here, but if you ever
> scope the product to known domains, switch to specific host patterns.

---

## 4. Privacy & data-use disclosure (CWS form)

**Does the extension collect user data?** **Yes** (in the store's broad sense).

| Data type | Collected | Sent off-device | Purpose | Shared w/ third parties |
|-----------|-----------|-----------------|---------|--------------------------|
| Authentication info (CheckFox API key) | Yes | Sent to **checkfox.eu** as a Bearer token to authenticate API calls | App functionality | No |
| Website content (DOM snippets/selectors from scanned pages) | Yes | Sent to **checkfox.eu** only when the auditor pushes findings | App functionality | No |
| User activity (the audited page URL) | Yes | Sent to **checkfox.eu** to match the active tab to an audit/sample | App functionality | No |
| PII, health, financial, location, web history (browsing), personal comms | No | — | — | — |

**Data use certification — all true:**
- [x] Data is **not** sold to third parties.
- [x] Data is **not** used for purposes unrelated to core functionality.
- [x] Data is **not** used for creditworthiness or lending.

Notes for reviewers: all transmission is to `https://checkfox.eu` (the user's own
CheckFox account), over HTTPS, only on explicit user action (Save & Connect,
Push, Pull, mark-topic-N/A). No analytics or telemetry. No remote code is loaded
or executed — axe-core is bundled in the package.

---

## 5. Privacy policy

Required (because of `<all_urls>` + off-device transmission). Host at a stable
public URL — e.g. `https://checkfox.eu/extension-privacy` or GitHub Pages. The
text must match the §4 disclosure exactly. Starter content:

```
Privacy Policy — CheckFox • Accessibility Companion
Last updated: 2026-06-19

WHAT DATA WE PROCESS
• CheckFox API key — the personal access token you paste in Settings.
• Page URL of the tab you audit — used to match it to a CheckFox audit/sample.
• Accessibility findings — rule IDs, impact, CSS selectors and HTML snippets
  produced by scanning a page you choose to audit.

HOW IT IS STORED
Your API key and preferences are stored locally on your device using the
browser's extension storage (chrome.storage.local). We do not use
chrome.storage.sync, so this data is never sent to browser-vendor servers.

HOW IT IS USED / TRANSMITTED
Data leaves your device only to your own CheckFox account at https://checkfox.eu,
over HTTPS, and only when you explicitly connect, push findings, pull findings, or
mark a topic Not Applicable. The page URL and findings are sent so they can be
saved to the corresponding audit. The API key is sent as an authentication token.

THIRD PARTIES
We do not use analytics or third-party trackers. We do not sell or share your
data. The only external service contacted is the CheckFox API you authenticate to.

RETENTION & CONTROL
The cached audit context is short-lived. Use the Disconnect button in Settings to
delete your stored API key and cached audits at any time. Removing the extension
clears all local extension data.

CHANGES
We will update this policy and its date if our practices change.

CONTACT
[SUPPORT EMAIL]
```

---

## 6. Packaging

`npm run build` does it all — no manual zipping. It produces a per-browser
folder and an upload-ready zip for each store:

```
dist/
  chrome/   <built files> + checkfox-chrome-v<version>.zip
  firefox/  <built files> + checkfox-firefox-v<version>.zip
```

Each folder gets a browser-specific `manifest.json` derived from the canonical
`public/manifest.json` (the build drops the keys the other browser doesn't
understand, so neither store shows an "unrecognized key" warning):

- **Chrome** keeps `side_panel`, the `sidePanel` permission and
  `minimum_chrome_version`; drops `sidebar_action` and `browser_specific_settings`.
- **Firefox** keeps `sidebar_action` and `browser_specific_settings`; drops
  `side_panel`, the `sidePanel` permission and `minimum_chrome_version`; and
  rewrites `background.service_worker` → `background.scripts` (keeping
  `type: "module"`), because Firefox 128 ships MV3 service workers disabled by
  default and refuses to install otherwise.

Both packages also include the `_locales/` catalogs (`en`, `fr`) referenced by
the manifest's `__MSG_extName__` / `__MSG_extDescription__` placeholders and
`default_locale: "en"`, so the store shows the name/description in the user's
browser language.

The `manifest.json` sits at each zip's root (not nested) — exactly what both
stores expect. Zipping uses the system `zip` utility; if it's unavailable the
unpacked folders are still produced and you can zip them manually (the zip's
contents must be the folder's *contents*, not the folder itself).

> Bump the version in **both** `package.json` and `public/manifest.json` before
> building — the zip filename and the in-package manifest both read from there.

---

## 7. Chrome Web Store — submission

1. One-time: register a developer account ($5 lifetime fee) at the
   [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. **New item** → upload `dist/chrome/checkfox-chrome-v<version>.zip` (§6).
3. Fill **Store listing** (name, descriptions, category, language) from §2,
   upload graphics from §1.
4. Fill **Privacy practices**: single purpose (§2), per-permission justifications
   (§3), data-use disclosures (§4), privacy-policy URL (§5).
5. Set **Distribution**: Public (or Unlisted for a soft launch), regions, free.
6. **Submit for review.** First review typically 1–3 business days; updates often
   <24h. You can defer publishing and release manually within 30 days of approval.

---

## 8. Firefox Add-ons (AMO) — submission

The manifest already carries `browser_specific_settings.gecko`
(`id: extension@checkfox.eu`, `strict_min_version: 128.0`).

1. Account at [addons.mozilla.org](https://addons.mozilla.org/developers/).
2. **Submit a New Add-on** → "On this site" (listed) → upload
   `dist/firefox/checkfox-firefox-v<version>.zip` (§6). AMO signs every add-on;
   listed submissions distribute via AMO.
3. **Source code is required** for our build: Vite + bundled axe-core produces
   minified output, and AMO reviewers must reproduce it. Upload a source archive
   (the repo without `node_modules/`/`dist/`) plus build instructions:
   ```
   Build: Node.js 18+. Run `npm install` then `npm run build`.
   The reviewable Firefox extension is the contents of dist/firefox/.
   ```
4. Fill **Summary** (≤250), **Description**, **Categories** (Web Development),
   screenshots and the 128×128 icon (§1–§2).
5. Add the **privacy policy** (AMO has a dedicated field) — reuse §5.
6. **Submit for review.**

> **⚠ Firefox compatibility — verify before submitting (functionality
> rejections are common):**
> - **Sidebar — handled.** `side_panel` is Chromium-only, so the manifest now
>   also declares `sidebar_action` (same `popup/popup.html`) for Firefox. The
>   code feature-detects: Chrome keeps the `chrome.sidePanel` behavior; Firefox
>   opens/closes its native sidebar via `browser.sidebarAction`. Chrome logs a
>   benign *"Unrecognized manifest key 'sidebar_action'"* warning — expected, not
>   an error. Note one UX difference: on Firefox the toolbar icon always opens
>   the popup, while the sidebar is opened from the Settings toggle or Firefox's
>   own sidebar UI (the two surfaces are independent in Firefox).
> - **`background.service_worker`** is disabled by default on Firefox 128, which
>   makes the install fail with *"background.service_worker is currently disabled.
>   Add background.scripts."* This is now handled: the build rewrites the Firefox
>   manifest's `background` to `{ scripts: [...], type: "module" }` (see §6.3).
>   The bundled worker is an ES module, so `type: "module"` must stay. Still
>   confirm the worker actually runs (alarms, storage, sync) on Firefox 128.
> - Firefox also warns that the `sidePanel` permission is unsupported — benign;
>   Chrome needs it, so leave it.
> - Re-run a full scan + sync flow in Firefox before shipping; don't assume the
>   Chrome build is 1:1.

---

## 9. Pre-publish checklist (run every release)

**Package & manifest**
- [ ] `manifest_version: 3`; version bumped in `package.json` + `manifest.json` (match).
- [ ] Real icons (not placeholders); `icon128.png` legible.
- [ ] Upload the per-browser zip from `dist/<browser>/` (build excludes `.git/`,
      `node_modules/`, `src/`, `docs/` by construction — only built files ship).
- [ ] Manifest `description` ≤132 chars.

**Listing**
- [ ] Short description ≤132 (CWS) / summary ≤250 (AMO).
- [ ] Single purpose is one narrow sentence.
- [ ] Description matches actual features (no claims for unbuilt features).
- [ ] ≥1 screenshot at correct dimensions, current to the UI.

**Privacy & permissions**
- [ ] Every permission + `<all_urls>` has a specific justification (§3).
- [ ] Data-use disclosure matches the code (§4); no `storage.sync` claim.
- [ ] Privacy-policy URL is **live**, public (no login wall), and matches §4.
- [ ] No remote code execution; axe-core bundled; code minified, **not** obfuscated.

**Functionality**
- [ ] Loads unpacked in Chrome *and* Firefox with no console errors.
- [ ] Scan, custom checks, visual tools, side panel/popup, EN/FR, and CheckFox
      sync all work; graceful on `chrome://`/restricted pages.

---

## 10. Version history (store submissions)

| Version | Date | Changes | CWS | AMO |
|---------|------|---------|-----|-----|
| 0.3.0 | 2026-06-19 | Five custom checks (new windows, obsolete elements, downloads, canvas/embed images, focus visibility). | Draft | Draft |

<!-- Status: Draft | Submitted | In Review | Published | Rejected -->

### Rejection log
<!-- | Date | Store | Reason | Fix | Resubmitted | -->
```
(none yet)
```
