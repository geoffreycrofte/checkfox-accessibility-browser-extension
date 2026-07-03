# Element-routed criteria (Label-in-Name)

## Context

Most axe rules map cleanly to a fixed set of RGAA 4.2 / RAWeb 1.1 criteria, so
`src/mapping/rule-overrides.js` stamps one static criteria list per `ruleId`.

`label-content-name-mismatch` (WCAG 2.5.3 — *Label in Name*) breaks that
assumption. axe fires it on **any** interactive element whose visible text label
is not contained in its accessible name — links, buttons, and form fields alike.
Here "label" means the *accessible name* (e.g. `aria-label`), not the HTML
`<label>` element. RGAA/RAWeb split this single WCAG SC across three criteria by
element type:

| Offending element                                             | Criterion |
| ------------------------------------------------------------- | --------- |
| `<a href>`, `<area href>`, `role="link"`                      | **6.1** (Links) |
| `<button>`, `<summary>`, `<input type=submit\|button\|reset\|image>`, `role="button"` | **11.9** (Buttons) |
| `<input>` (other), `<select>`, `<textarea>`, form-field roles | **11.2** (Form field labels) |

The previous static mapping (`['11.2', '11.9']`) mislabelled every occurrence:
a mismatched link was pushed to 11.2 **and** 11.9, and 6.1 was never reached.

## Decision

Resolve the criterion **per affected node**, from the node's HTML, rather than
per rule.

- **`src/mapping/classify-target.js`** — `classifyLabelInName(htmlSnippet)` parses
  the opening tag (pure string parsing, no DOM) and returns `'6.1' | '11.9' |
  '11.2' | null`. `null` means "couldn't classify" and callers fall back to the
  rule's full set so no criterion is ever silently dropped.
- **`src/mapping/rule-overrides.js`** — the `byTarget(domain, classify)` helper
  produces an override carrying the full `domain` (for display) plus a
  `resolve(node)` function. `rgaa`/`raweb` still equal `domain`, so the coverage
  checks and the generic display path keep working unchanged.
- **`src/mapping/index.js`** — `enrichViolation` detects `override.resolve`,
  attaches a resolved `criteria` to each node, and sets the violation-level
  `criteria.rgaa/raweb` to the **union of the triggered** node criteria (plural
  when a page has, say, both a bad link and a bad button). It also adds
  `criteria.domain` = the full candidate set.
- **`src/popup/popup.js`**
  - *Display*: the card renders the full `domain`; criteria that no element
    matched are muted (`.tag--possible`, dashed border) with an `sr-only` suffix
    so the triggered/possible state is not colour-only.
  - *Push*: `toApiPayloads(v)` splits an element-routed violation into one prefill
    payload **per criterion group**, each carrying only its matching nodes. A
    mismatched link pre-fills 6.1 with the link as evidence; a mismatched button
    pre-fills 11.9 with the button — never cross-contaminated. Non-routed
    violations map 1:1. The push call uses `flatMap(toApiPayloads)`.

One card in the UI; precise, per-element routing on push.

## Extending to other split rules

Any rule where one WCAG SC maps to different criteria by element type can reuse
this: write a classifier, wire it with `byTarget([...domain], classify)` in
`rule-overrides.js`. No changes to the enrich pipeline, card, or push logic.

## Assumption to verify

The push split assumes the CheckFox `prefill` endpoint reads each **violation's**
`criteria` and attaches that violation's `nodes` as evidence. That's why we emit
one violation per criterion. If the backend instead reads a per-node criteria
field, the split becomes unnecessary — but the current approach is
backend-agnostic and needs no API change.

## Validation

`node src/mapping/coverage.js` includes classifier unit cases and end-to-end
enrichment checks (`[5b]`) for the link/button/field split, the triggered union,
the full domain, and the unknown-element fallback.
