// Page inventory → topic N/A detection.
//
// Replaces the Stylus "0.Thématiques NA" counter style. For RGAA / RAWeb
// audits, some whole topics can be marked Not Applicable when the page
// contains no relevant elements at all (e.g. no images → topic 1 N/A,
// no form controls → topic 11 N/A).
//
// Only DOM-detectable topics are covered. Topics whose applicability cannot
// be inferred from a single page's elements (colours, scripts, structure,
// navigation, consultation, etc.) are never auto-flagged.

// Guidelines that have a topic structure compatible with this detection.
export const INVENTORY_GUIDELINES = ['rgaa', 'raweb']

export function isInventoryGuideline(guideline) {
  return INVENTORY_GUIDELINES.includes(String(guideline ?? '').toLowerCase())
}

// Each topic carries the CSS selector used to count relevant elements, and the
// criterion IDs to mark N/A per referential. RGAA and RAWeb share numbering for
// these topics except Multimedia, where RAWeb adds 4.14–4.18 (EN 301 549 only).
export const INVENTORY_TOPICS = [
  {
    key: 'images',
    topicNumber: 1,
    selector: 'img, svg, canvas, picture, area, [role="img"], object[type^="image"], embed[type^="image"], input[type="image"]',
    criteria: {
      rgaa:  ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'],
      raweb: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'],
    },
  },
  {
    key: 'frames',
    topicNumber: 2,
    selector: 'iframe, frame',
    criteria: {
      rgaa:  ['2.1', '2.2'],
      raweb: ['2.1', '2.2'],
    },
  },
  {
    key: 'multimedia',
    topicNumber: 4,
    selector: 'audio, video, object[type^="audio"], object[type^="video"], embed[type^="audio"], embed[type^="video"], bgsound',
    criteria: {
      rgaa:  ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11', '4.12', '4.13'],
      raweb: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11', '4.12', '4.13', '4.14', '4.15', '4.16', '4.17', '4.18'],
    },
  },
  {
    key: 'tables',
    topicNumber: 5,
    selector: 'table, [role="table"], [role="grid"], [role="treegrid"]',
    criteria: {
      rgaa:  ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8'],
      raweb: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8'],
    },
  },
  {
    key: 'links',
    topicNumber: 6,
    selector: 'a[href], [role="link"]',
    criteria: {
      rgaa:  ['6.1', '6.2'],
      raweb: ['6.1', '6.2'],
    },
  },
  {
    key: 'forms',
    topicNumber: 11,
    // Any form control, native or ARIA. Excludes type=hidden.
    selector: [
      'input:not([type="hidden"])', 'textarea', 'select', 'button', 'form', 'fieldset', 'meter', 'progress', 'output',
      '[contenteditable=""]', '[contenteditable="true"]',
      '[role="button"]', '[role="checkbox"]', '[role="radio"]', '[role="textbox"]', '[role="combobox"]',
      '[role="listbox"]', '[role="slider"]', '[role="spinbutton"]', '[role="switch"]', '[role="searchbox"]',
      '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="radiogroup"]', '[role="group"]',
    ].join(', '),
    criteria: {
      rgaa:  ['11.1', '11.2', '11.3', '11.4', '11.5', '11.6', '11.7', '11.8', '11.9', '11.10', '11.11', '11.12', '11.13'],
      raweb: ['11.1', '11.2', '11.3', '11.4', '11.5', '11.6', '11.7', '11.8', '11.9', '11.10', '11.11', '11.12', '11.13'],
    },
  },
]

// Resolve the criterion IDs to mark N/A for a topic under the audit's guideline.
export function criteriaForGuideline(topic, guideline) {
  const g = String(guideline ?? '').toLowerCase()
  return topic.criteria[g] ?? []
}

// Pure DOM counter, injected into the page via chrome.scripting.executeScript.
// Receives [{ key, selector }] and returns { key: count }. Self-contained so it
// serialises cleanly — do NOT reference module scope from inside.
export function countTopics(topicSelectors) {
  const counts = {}
  for (const { key, selector } of topicSelectors) {
    try {
      counts[key] = document.querySelectorAll(selector).length
    } catch {
      counts[key] = -1 // selector failed — treat as "unknown", never N/A
    }
  }
  return counts
}
