# axe → RGAA/RAWeb criterion mapping: reconciliation with the official table

## Context

`src/mapping/rule-overrides.js` stamps a fixed list of RGAA 4.2 / RAWeb 1.1
criteria onto each axe `ruleId`, bypassing the generic WCAG-SC → criteria chain
(too broad for SCs like 1.3.1 or 4.1.2, which each fan out to a dozen criteria).

Luxembourg publishes its own axe→criterion table for the RAWeb **contrôle
simplifié** (the reduced, automatable subset used for national monitoring). Our
table was cross-checked against it. This document records where we now agree,
where we deliberately do not, and why — so that a future contributor doesn't
"fix" an intentional divergence.

Two structural facts explain most of the deltas:

- The official table maps each axe rule to a **single, coarser criterion**, drawn
  from the reduced subset the monitoring actually reports on. It collapses whole
  families onto one criterion (e.g. every ARIA-validity rule → 8.2).
- CheckFox covers **~140 rules** (including `checkfox-*` custom checks) against
  the official table's 53, and maps to the semantically precise criterion.

RAWeb 1.1 and RGAA 4.2 share identical criterion numbering, so every decision
below applies to both referentials — hence the single `both()` entry per rule.

## Adopted from the official table

These were CheckFox divergences that the official table got right. Changed.

| axe rule                                  | Was              | Now       | Why |
| ----------------------------------------- | ---------------- | --------- | --- |
| `aria-hidden-body`, `aria-hidden-focus`   | 7.1 / 7.3        | **10.8**  | Both describe content wrongly removed from (or left in) the a11y tree — a hidden-content concern, not script/ARIA compatibility. |
| `blink`, `marquee`                        | 13.1             | **13.8**  | Moving/blinking content must be controllable (13.8). 13.1 is about *time limits*. |
| `region`, `landmark-no-duplicate-main`    | 12.6             | **9.2**   | "Is every region inside a landmark / is there exactly one main?" is document-structure consistency, not a navigation mechanism. |
| `area-alt`                                | 1.1, 6.1, 6.2    | **1.1, 1.2** | An `<area>` is an image region: it needs a text alternative, or to be correctly ignored. Not a link-wording question. |
| `frame-title`                             | 2.1, 2.2         | **2.1**   | axe checks the title *exists* (2.1); whether it is *relevant* (2.2) needs human judgement. |
| `video-caption`                           | 4.3, 4.4         | **4.3**   | axe checks captions *exist* (4.3); their relevance (4.4) is manual. |
| `td-headers-attr`, `th-has-data-cells`    | 5.6/5.7 and 5.4/5.5 | **5.7** | Both verify the header↔cell *association technique*, which is 5.7. 5.4–5.6 are about captions and header relevance. |
| `label`                                   | 11.1, 11.2       | **11.1**  | axe checks a label *exists* (11.1); whether it is *relevant* (11.2) is manual. |
| `label-title-only`                        | 11.1, 11.2       | **11.1**  | Same as `label`: a `title`-only input has no proper label. Existence, not relevance. |
| `html-has-lang`                           | 8.3, 8.4         | **8.3**   | A default language is *declared*. |
| `html-lang-valid`                         | 8.3, 8.4         | **8.4**   | That language code is *valid*. Each rule checks exactly one of the two. |
| `valid-lang`                              | 8.7, 8.8         | **8.8**   | The language code of a change of language is valid (8.8); 8.7 is whether the change is *indicated at all*. |
| `bypass`                                  | 9.1, 12.6, 12.7  | **12.7**  | The rule only verifies something exists to jump past the header. |
| `duplicate-id-active`, `duplicate-id`     | 8.1, 8.2         | **8.2**   | Duplicate IDs are a source-validity failure. 8.1 is doctype presence. |
| `meta-refresh`, `meta-refresh-no-exceptions` | 13.1, 13.8    | **13.1**  | A refresh is an uncontrolled *time limit*, not moving content. |

Two rules absent from the official table were aligned by the same reasoning, to
avoid an inconsistent map: `td-has-header` and `scope-attr-valid` (5.6/5.7 →
**5.7**), which are header-association rules like `td-headers-attr`.

The general principle these share: **an axe rule maps to the criterion it can
actually verify.** Where RGAA/RAWeb splits a topic into an *existence* criterion
and a *relevance* criterion (2.1/2.2, 4.3/4.4, 8.3/8.4, 11.1/11.2), automated
tooling can only speak to existence. Claiming the relevance criterion produces
false conformance signals in an audit.

## Deliberate divergences — do not "fix"

| axe rules                                              | Official | CheckFox | Rationale |
| ------------------------------------------------------ | -------- | -------- | --------- |
| All ARIA-validity rules (`aria-allowed-attr`, `aria-roles`, `aria-valid-attr`, `aria-required-attr`, `aria-roledescription`, …) | 8.2 (valid source code) | **7.1** (script compatibility) | The official table collapses ~15 rules onto "invalid code". Invalid ARIA is a *scripted-component compatibility* failure: the component is not correctly exposed to assistive tech. 7.1 is the criterion an auditor would actually cite, and it keeps 8.2 meaningful (real DTD/parsing validity). |
| `list`, `listitem`, `definition-list`, `dlitem`        | 8.2      | **9.3**  | A broken list is a *structure* failure (9.3, "is each list correctly structured?"), which is exactly what the criterion exists for. Filing it under code validity loses the signal. |
| `link-name`                                            | 6.2      | **6.2**  | (Agreement, noted for the record.) "Links must have discernible text" = the link *has* an accessible name → 6.2. **Not** 6.1 (the link text is *explicit* / relevant), which needs human judgement. WCAG 2.4.4 fans to both; we narrow it. |
| `link-in-text-block`                                   | —        | **10.6** | Link visibility relative to surrounding text, not the generic "information by colour alone" (3.1). WCAG 1.4.1 fans to both; we narrow it. |
| `label-content-name-mismatch` (Label-in-Name)          | —        | 6.1 / 11.2 / 11.9, routed per element | See [element-routed-criteria.md](./element-routed-criteria.md). |

Note that the ARIA and list decisions run **opposite** to the "adopt the official
table" decisions above. That is intentional and not an inconsistency: we adopt
the official mapping when it is *more precise* than ours, and keep ours when it
is *less* precise (a coarse catch-all like 8.2). The goal is audit-grade
accuracy, not byte-identical reproduction of the national monitoring output.

If CheckFox ever needs to emit results directly comparable to the Luxembourg
monitoring report, that is a **presentation-layer** concern — add a "simplified
control" projection that folds 7.1 and 9.3 back into 8.2 — not a reason to change
the underlying map.

## Coverage

- Official simplified-control table: **53 rules**.
- CheckFox `RULE_CRITERIA`: **118 rules**, including `checkfox-*` custom checks
  and many axe rules the official table omits.

Rules in our table but absent from the official one carry no divergence risk;
they are simply broader coverage.

## Verifying the map

Every criterion ID used in `rule-overrides.js` must exist in both referentials.
To re-check after an edit:

```js
// node --input-type=module
import { RULE_CRITERIA } from './src/mapping/rule-overrides.js'
import fs from 'node:fs'
const valid = new Set()
for (const f of ['docs/raweb-1.1.json', 'docs/rgaa-4.2.json']) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const t of d.topics) for (const c of t.criteria) valid.add(`${t.number}.${c.criterium.number}`)
}
for (const [rule, v] of Object.entries(RULE_CRITERIA)) {
  for (const id of [...v.rgaa, ...v.raweb]) if (!valid.has(id)) console.log('INVALID', rule, id)
  if (JSON.stringify(v.rgaa) !== JSON.stringify(v.raweb)) console.log('DIVERGENT', rule)
}
```
