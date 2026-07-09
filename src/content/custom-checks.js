// Custom accessibility checks for media elements not covered by axe-core.
// Results use the same shape as axe-runner.js mapRule() output so they flow
// through the same enrichViolations() pipeline in the popup.

const HELP = {
  pauseStopHide: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
  keyboard:      'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
  videoOnly:     'https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded.html',
  changeOnRequest: 'https://www.w3.org/WAI/WCAG21/Understanding/change-on-request.html',
  infoRelationships: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  nonTextContent: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
  focusVisible:  'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
  parsing:       'https://www.w3.org/WAI/WCAG21/Understanding/parsing.html',
  nonTextContrast: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html',
  reflow:        'https://www.w3.org/WAI/WCAG21/Understanding/reflow.html',
}

// Bilingual (EN/FR) hint that a link warns it opens a new window or tab.
const NEW_WINDOW_HINT = /new window|new tab|opens? (in|a new)|external link|nouvelle fenêtre|nouvel onglet|ouvre dans|s'ouvre dans|nouvelle page/i

// Obsolete / purely presentational HTML elements (RAWeb/RGAA 8.9).
// blink and marquee are intentionally excluded — axe-core already flags them.
const DEPRECATED_PRESENTATIONAL = ['center', 'font', 'big', 'tt', 'strike', 'basefont']

// Obsolete presentational HTML *attributes* (RAWeb/RGAA 10.1). Presentation must
// live in CSS, not markup. width and height are intentionally excluded — they stay
// valid on replaced elements (img, canvas, svg, video, iframe), so flagging them
// would produce false positives.
const DEPRECATED_PRESENTATIONAL_ATTRS = [
  'align', 'bgcolor', 'background', 'bordercolor', 'border',
  'cellpadding', 'cellspacing', 'valign', 'nowrap',
  'hspace', 'vspace', 'frameborder', 'marginwidth', 'marginheight',
]

// Downloadable office-document formats (RAWeb/RGAA 13.3).
const OFFICE_DOC_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf']
const OFFICE_DOC_RE = new RegExp(`\\.(${OFFICE_DOC_EXT.join('|')})(?:[?#]|$)`, 'i')

function selectorOf(el) {
  const tag = el.tagName.toLowerCase()
  if (el.id) return `${tag}#${CSS.escape(el.id)}`
  const cls = [...el.classList].slice(0, 2).map(c => `.${CSS.escape(c)}`).join('')
  const siblings = el.parentElement
    ? [...el.parentElement.children].filter(c => c.tagName === el.tagName)
    : [el]
  const nth = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(el) + 1})` : ''
  return `${tag}${cls}${nth}`
}

function nodeInfo(el, failureSummary) {
  const outer = el.outerHTML
  const htmlSnippet = outer.match(/^<[^>]+>/)?.[0] ?? outer.slice(0, 200)
  return { selector: selectorOf(el), htmlSnippet, failureSummary }
}

function rule(ruleId, impact, description, helpUrl, wcagTags, nodes) {
  return { ruleId, impact, description, helpUrl, wcagTags, nodes }
}

// Best-effort accessible text for a link: its own text plus title/aria-label
// on the element and on descendants (e.g. an icon carrying a hidden label).
function accessibleText(el) {
  const parts = [
    el.textContent,
    el.getAttribute('title'),
    el.getAttribute('aria-label'),
    ...[...el.querySelectorAll('[aria-label], [alt], [title]')].map(n =>
      [n.getAttribute('aria-label'), n.getAttribute('alt'), n.getAttribute('title')].filter(Boolean).join(' ')),
  ]
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function runCustomChecks() {
  const violations = []
  const incomplete = []

  // ── checkfox-video-autoplay ───────────────────────────────────────────────
  // axe's no-autoplay-audio only flags audio output; this catches all autoplay
  // media regardless of muted state, since moving content violates WCAG 2.2.2
  // (RAWeb/RGAA 13.8) independently of whether there is audio.
  const autoplayMedia = [...document.querySelectorAll('video[autoplay], audio[autoplay]')]
  const noCtrl  = autoplayMedia.filter(el => !el.hasAttribute('controls'))
  const hasCtrl = autoplayMedia.filter(el =>  el.hasAttribute('controls'))

  if (noCtrl.length > 0) {
    violations.push(rule(
      'checkfox-video-autoplay',
      'serious',
      'Media autoplays without a mechanism to pause or stop it',
      HELP.pauseStopHide,
      ['wcag222'],
      noCtrl.map(el => nodeInfo(el, 'Add the controls attribute or provide a visible pause/stop button')),
    ))
  }

  if (hasCtrl.length > 0) {
    incomplete.push(rule(
      'checkfox-video-autoplay',
      'moderate',
      'Media autoplays with native controls — verify users can pause or stop it within 5 seconds',
      HELP.pauseStopHide,
      ['wcag222'],
      hasCtrl.map(el => nodeInfo(el, 'Verify: controls are reachable and allow stopping within 5 seconds of playback start')),
    ))
  }

  // ── checkfox-media-no-controls ────────────────────────────────────────────
  // Non-autoplaying media without native controls may still be played via JS.
  // Without controls, keyboard users cannot pause, seek, or adjust volume.
  const mediaNoCtrl = [...document.querySelectorAll('video:not([controls]), audio:not([controls])')]
    .filter(el => !el.hasAttribute('autoplay')) // already covered by checkfox-video-autoplay

  if (mediaNoCtrl.length > 0) {
    incomplete.push(rule(
      'checkfox-media-no-controls',
      'serious',
      'Media without native controls — verify custom controls are keyboard and AT accessible',
      HELP.keyboard,
      ['wcag211'],
      mediaNoCtrl.map(el => nodeInfo(el, 'Verify: all playback controls are reachable and operable by keyboard')),
    ))
  }

  // ── checkfox-video-description ────────────────────────────────────────────
  // Videos without an accessible name or any media track cannot be identified
  // or understood by users relying on text alternatives.
  const videosWithoutDesc = [...document.querySelectorAll('video')].filter(v => {
    const hasName  = v.getAttribute('aria-label') || v.getAttribute('aria-labelledby') || v.getAttribute('title')
    const hasTrack = v.querySelector('track[kind="descriptions"], track[kind="subtitles"], track[kind="captions"]')
    return !hasName && !hasTrack
  })

  if (videosWithoutDesc.length > 0) {
    incomplete.push(rule(
      'checkfox-video-description',
      'moderate',
      'Video without accessible name or media track — verify a transcript or audio description is provided',
      HELP.videoOnly,
      ['wcag121'],
      videosWithoutDesc.map(el => nodeInfo(el, 'Verify: provide a visible transcript, audio description track, or accessible alternative adjacent to the video')),
    ))
  }

  // ── checkfox-new-window-link ──────────────────────────────────────────────
  // RAWeb/RGAA 13.2 — links opening a new window or tab must warn the user.
  // axe-core has no rule for this. We surface only target="_blank" links with
  // no detectable warning text, as 'incomplete': a warning may legitimately be
  // conveyed by an icon or visually-hidden text we cannot reliably read.
  const unwarnedNewWindow = [...document.querySelectorAll('a[target="_blank"], area[target="_blank"]')]
    .filter(el => !NEW_WINDOW_HINT.test(accessibleText(el)))

  if (unwarnedNewWindow.length > 0) {
    incomplete.push(rule(
      'checkfox-new-window-link',
      'moderate',
      'Link opens a new window or tab with no detectable warning — verify the user is informed',
      HELP.changeOnRequest,
      ['wcag325'],
      unwarnedNewWindow.map(el => nodeInfo(el, 'Add a visible or assistive-technology indication that the link opens a new window (e.g. "(opens in a new window)")')),
    ))
  }

  // ── checkfox-deprecated-presentational ────────────────────────────────────
  // RAWeb/RGAA 8.9 — obsolete, purely presentational elements must not be used.
  // axe-core covers blink/marquee only; this catches the rest.
  const deprecatedEls = [...document.querySelectorAll(DEPRECATED_PRESENTATIONAL.join(', '))]

  if (deprecatedEls.length > 0) {
    violations.push(rule(
      'checkfox-deprecated-presentational',
      'minor',
      'Obsolete presentational element used — replace it with semantic HTML and CSS',
      HELP.infoRelationships,
      ['wcag131'],
      deprecatedEls.map(el => nodeInfo(el, `Replace the <${el.tagName.toLowerCase()}> element with appropriate semantic markup styled via CSS`)),
    ))
  }

  // ── checkfox-download-document ────────────────────────────────────────────
  // RAWeb/RGAA 13.3 — downloadable office documents must have an accessible
  // version. axe-core has no rule for this. We surface links pointing at an
  // office-format file as 'incomplete'; whether an accessible alternative
  // exists can only be confirmed by a human (RAPDF / Office checker).
  const docLinks = [...document.querySelectorAll('a[href], area[href]')]
    .filter(el => OFFICE_DOC_RE.test(el.getAttribute('href') || ''))

  if (docLinks.length > 0) {
    incomplete.push(rule(
      'checkfox-download-document',
      'moderate',
      'Link to a downloadable document — verify an accessible version of the file is provided',
      HELP.nonTextContent,
      [], // RAWeb/RGAA 13.3 is not anchored to a single WCAG success criterion
      docLinks.map(el => {
        const ext = (el.getAttribute('href').match(OFFICE_DOC_RE) || [, ''])[1].toLowerCase()
        return nodeInfo(el, `Verify the .${ext} file is accessible or that an accessible alternative version is offered`)
      }),
    ))
  }

  // ── checkfox-graphic-alt ──────────────────────────────────────────────────
  // RAWeb/RGAA 1.1.7 / 1.1.8 — <canvas> and <embed type="image/*"> that convey
  // information need role="img" plus an accessible name. axe-core checks
  // <object>/<svg> but not these two. We cannot know if a given graphic conveys
  // information, so anything lacking a name is reported as 'incomplete'.
  const namelessGraphics = [
    ...document.querySelectorAll('canvas, embed[type^="image/" i]'),
  ].filter(el => {
    const name = el.getAttribute('aria-label')
      || el.getAttribute('aria-labelledby')
      || el.getAttribute('title')
    return !name
  })

  if (namelessGraphics.length > 0) {
    incomplete.push(rule(
      'checkfox-graphic-alt',
      'serious',
      'Canvas or embedded image without an accessible name — verify it is decorative or add a text alternative',
      HELP.nonTextContent,
      ['wcag111'],
      namelessGraphics.map(el => nodeInfo(el, `If the <${el.tagName.toLowerCase()}> conveys information, add role="img" and an aria-label / aria-labelledby (or a text fallback inside it); if decorative, expose it as such`)),
    ))
  }

  // ── checkfox-svg-name-or-hide ─────────────────────────────────────────────
  // RAWeb/RGAA 1.1 / 1.2 / 1.3 — an inline <svg> that draws something is either
  // informative (needs role="img" + an accessible name → 1.1/1.3) or decorative
  // (must be removed from the a11y tree with aria-hidden/hidden → 1.2). The author
  // has to make that call. axe-core's svg-img-alt already covers the FIRST branch:
  // any svg-namespace element carrying role="img"/graphics-* with no name is
  // flagged by it. The gap it leaves — and what we fill here — is the svg that has
  // committed to NEITHER branch: it renders graphics, exposes them to AT, yet has
  // no role, no name and is not hidden. Reported 'incomplete' because only a human
  // knows whether the graphic conveys information. To avoid overlapping axe we skip
  // any svg that already declares role="img"/graphics-*/presentation/none (or holds
  // a descendant that does), that already has a name, or that is hidden from AT.
  const SVG_DRAWABLE = 'path, circle, rect, ellipse, line, polygon, polyline, use, image, text'
  const SVG_HANDLED_ROLES = ['img', 'graphics-document', 'graphics-symbol', 'presentation', 'none']
  const ambiguousSvgs = [...document.querySelectorAll('svg')].filter(el => {
    if (el.ownerSVGElement) return false                         // nested svg — judged via its outermost root
    const role = (el.getAttribute('role') || '').trim().toLowerCase()
    if (SVG_HANDLED_ROLES.includes(role)) return false           // author already declared intent (or axe's territory)
    if (el.querySelector('[role="img"], [role="graphics-symbol"], [role="graphics-document"]')) return false // axe flags the inner node
    if (svgHasAccessibleName(el)) return false                   // named → treated as informative, out of scope
    if (el.closest('[aria-hidden="true"], [hidden]')) return false // already ignored by AT (decorative decision made)
    if (!el.querySelector(SVG_DRAWABLE)) return false            // nothing rendered → nothing to describe
    return isSvgVisible(el)
  }).slice(0, 25)

  if (ambiguousSvgs.length > 0) {
    incomplete.push(rule(
      'checkfox-svg-name-or-hide',
      'serious',
      'Inline SVG exposed to assistive technologies with no accessible name — verify it is named if informative, or hidden if decorative',
      HELP.nonTextContent,
      ['wcag111'],
      ambiguousSvgs.map(el => nodeInfo(el, 'If this SVG conveys information, give it role="img" and an accessible name (aria-label / aria-labelledby, or a <title> child) — and make sure that name is relevant (RGAA 1.3). If it is purely decorative, remove it from the accessibility tree with aria-hidden="true" or the hidden attribute (RGAA 1.2)')),
    ))
  }

  // ── checkfox-focus-not-visible ────────────────────────────────────────────
  // RAWeb/RGAA 10.7 — focus must stay visible. axe-core has no rule for this.
  // We scan author stylesheets for :focus rules that suppress the outline with
  // no in-rule compensation (border/box-shadow/background). Reported as
  // 'incomplete': a visible indicator may be provided by a separate rule
  // (commonly :focus-visible), which only a human can confirm.
  const focusRules = collectOutlineSuppressingFocusRules()

  if (focusRules.length > 0) {
    incomplete.push(rule(
      'checkfox-focus-not-visible',
      'serious',
      'Focus outline is removed with no detected replacement — verify a visible focus indicator remains',
      HELP.focusVisible,
      ['wcag247'],
      focusRules.map(r => ({
        selector: r.selectorText,
        htmlSnippet: r.cssText.slice(0, 200),
        failureSummary: 'Verify a visible focus indicator (contrast ≥ 3:1) is provided, e.g. via a :focus-visible rule with outline, border, box-shadow or background change',
      })),
    ))
  }

  // ── checkfox-doctype-missing ──────────────────────────────────────────────
  // RAWeb/RGAA 8.1 — every page must declare a doctype. axe-core has no rule for
  // this. The WCAG anchor 4.1.1 (Parsing) is deprecated in WCAG 2.2 but retained
  // by RGAA, so we keep the tag for referential alignment. Deterministic.
  if (!document.doctype || document.doctype.name.toLowerCase() !== 'html') {
    const present = !!document.doctype
    violations.push(rule(
      'checkfox-doctype-missing',
      'moderate',
      present ? 'Document uses an obsolete or non-HTML doctype' : 'Document has no doctype declaration',
      HELP.parsing,
      ['wcag411'],
      [{
        selector: 'html',
        htmlSnippet: present ? `<!DOCTYPE ${document.doctype.name}>` : '(no DOCTYPE declaration)',
        failureSummary: 'Declare the HTML5 doctype as the very first line of the document: <!DOCTYPE html>',
      }],
    ))
  }

  // ── checkfox-duplicate-id ─────────────────────────────────────────────────
  // RAWeb/RGAA 8.2 — ids must be unique. axe-core's duplicate-id rule is
  // deprecated and disabled by default, so nothing in our run catches this.
  // Duplicate ids silently break label/ARIA associations and in-page anchors.
  const idMap = new Map()
  for (const el of document.querySelectorAll('[id]')) {
    if (!el.id) continue
    if (!idMap.has(el.id)) idMap.set(el.id, [])
    idMap.get(el.id).push(el)
  }
  const duplicatedIds = [...idMap.entries()].filter(([, els]) => els.length > 1)

  if (duplicatedIds.length > 0) {
    violations.push(rule(
      'checkfox-duplicate-id',
      'moderate',
      'Duplicate id attribute — each id must be unique within the page',
      HELP.parsing,
      ['wcag411'],
      duplicatedIds.flatMap(([id, els]) => els.map(el =>
        nodeInfo(el, `The id "${id}" is used ${els.length} times on the page. Make every id unique — duplicate ids break label, ARIA and in-page-link associations`))),
    ))
  }

  // ── checkfox-presentational-attr ──────────────────────────────────────────
  // RAWeb/RGAA 10.1 — presentation must be handled by CSS, not markup. Our
  // checkfox-deprecated-presentational rule catches obsolete *elements*; this
  // catches obsolete presentational *attributes* (see DEPRECATED_PRESENTATIONAL_ATTRS).
  const presentationalAttrEls = new Map() // el -> Set<attrName>
  for (const attr of DEPRECATED_PRESENTATIONAL_ATTRS) {
    for (const el of document.querySelectorAll(`[${attr}]`)) {
      if (attr === 'border' && el.tagName === 'IMG') continue // legacy border="0" on img: excluded to limit false positives
      if (!presentationalAttrEls.has(el)) presentationalAttrEls.set(el, new Set())
      presentationalAttrEls.get(el).add(attr)
    }
  }

  if (presentationalAttrEls.size > 0) {
    violations.push(rule(
      'checkfox-presentational-attr',
      'minor',
      'Presentational HTML attribute used — move the styling to CSS',
      HELP.infoRelationships,
      ['wcag131'],
      [...presentationalAttrEls.entries()].map(([el, attrs]) =>
        nodeInfo(el, `Remove the presentational attribute${attrs.size > 1 ? 's' : ''} ${[...attrs].map(a => `"${a}"`).join(', ')} from <${el.tagName.toLowerCase()}> and style it with CSS instead`)),
    ))
  }

  // ── checkfox-fieldset-missing ─────────────────────────────────────────────
  // RAWeb/RGAA 11.5 / 11.6 — fields of the same nature must be grouped and the
  // group given a legend. axe-core has no rule for this. Radio buttons sharing a
  // name (within a form) are a true group → violation. Checkboxes sharing a name
  // are only probably a group → incomplete (grouping necessity is human judgment).
  // A valid grouping = an enclosing <fieldset> with a non-empty <legend>, or a
  // role="group"/"radiogroup" with an accessible name.
  const formTokens = new Map()
  const formToken = el => {
    const f = el.form
    if (!f) return 'no-form'
    if (!formTokens.has(f)) formTokens.set(f, `form-${formTokens.size}`)
    return formTokens.get(f)
  }

  // Same-name controls grouped per form; keep groups of ≥2 where at least one
  // member lacks a valid grouping container.
  const ungroupedNamedGroups = selector => {
    const groups = new Map()
    for (const el of document.querySelectorAll(selector)) {
      if (!el.name) continue
      const key = `${formToken(el)}::${el.name}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(el)
    }
    return [...groups.values()].filter(g => g.length >= 2 && g.some(el => !hasGroupingContainer(el)))
  }

  const ungroupedRadios = ungroupedNamedGroups('input[type="radio"]')
  const ungroupedCheckboxes = ungroupedNamedGroups('input[type="checkbox"]')

  if (ungroupedRadios.length > 0) {
    violations.push(rule(
      'checkfox-fieldset-missing',
      'serious',
      'Group of radio buttons is not enclosed in a fieldset with a legend',
      HELP.infoRelationships,
      ['wcag131', 'wcag332'],
      ungroupedRadios.flatMap(g => g.map(el =>
        nodeInfo(el, `Wrap the "${el.name}" radio group in a <fieldset> with a <legend>, or a container with role="group"/"radiogroup" and an accessible name`))),
    ))
  }

  if (ungroupedCheckboxes.length > 0) {
    incomplete.push(rule(
      'checkfox-fieldset-missing',
      'moderate',
      'Checkboxes sharing a name are not grouped — verify whether they form a set needing a fieldset and legend',
      HELP.infoRelationships,
      ['wcag131', 'wcag332'],
      ungroupedCheckboxes.flatMap(g => g.map(el =>
        nodeInfo(el, `If these "${el.name}" checkboxes form a single question, wrap them in a <fieldset> with a <legend> (or a container with role="group" and an accessible name)`))),
    ))
  }

  // ── checkfox-motion-uncontrolled ──────────────────────────────────────────
  // RAWeb/RGAA 13.8 — moving/blinking content that starts automatically and lasts
  // more than 5s must be pausable/stoppable/hideable (WCAG 2.2.2). axe has no rule
  // for CSS-driven motion. We use the Web Animations timeline (getAnimations) to
  // find elements with an infinitely-looping animation — precise and cheap, no
  // full-tree walk. Reported 'incomplete': whether a pause control exists (or the
  // motion is under 5s) is human judgment. Guarded for engines without the API.
  if (typeof document.getAnimations === 'function') {
    let anims = []
    try { anims = document.getAnimations() } catch { anims = [] }
    const seenMotion = new Set()
    const loopingEls = []
    for (const a of anims) {
      if (loopingEls.length >= 25) break
      let timing = null
      try { timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null } catch { timing = null }
      if (!timing || timing.iterations !== Infinity) continue
      if (a.playState === 'idle' || a.playState === 'finished') continue
      const el = a.effect && a.effect.target
      if (!el || el.nodeType !== 1 || !el.isConnected || seenMotion.has(el)) continue
      seenMotion.add(el)
      loopingEls.push(el)
    }

    if (loopingEls.length > 0) {
      incomplete.push(rule(
        'checkfox-motion-uncontrolled',
        'serious',
        'Element has a continuously looping animation — verify it can be paused, stopped or hidden',
        HELP.pauseStopHide,
        ['wcag222'],
        loopingEls.map(el => nodeInfo(el, 'If this animation starts automatically and runs longer than 5 seconds, provide a visible mechanism to pause, stop or hide it, and honour prefers-reduced-motion: reduce')),
      ))
    }
  }

  // ── checkfox-nontext-contrast ─────────────────────────────────────────────
  // RAWeb/RGAA 3.3 — the visual boundary of a UI component must reach 3:1 against
  // adjacent colours (WCAG 1.4.11). axe does not check this. Scoped to form
  // controls to limit false positives: a control needs SOME visible boundary,
  // either a border or its own fill, contrasting ≥3:1 with what surrounds it. If
  // neither does, it's flagged 'incomplete' — a box-shadow, outline or icon we
  // did not measure may still provide the boundary, so a human confirms.
  const nonTextControls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, button')]
  const lowBoundaryControls = []
  for (const el of nonTextControls) {
    if (lowBoundaryControls.length >= 40) break
    if (!isRendered(el)) continue
    const cs = getComputedStyle(el)
    const adj = effectiveBackground(el.parentElement || el)
    const ownBg = parseCssColor(cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 }
    const fillContrast = contrastRatio(compositeOver(ownBg, adj), adj)

    let borderContrast = 0
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const w = parseFloat(cs[`border${side}Width`])
      const style = cs[`border${side}Style`]
      if (!(w >= 1 && style && style !== 'none' && style !== 'hidden')) continue
      const bc = parseCssColor(cs[`border${side}Color`])
      if (bc && bc.a > 0) borderContrast = Math.max(borderContrast, contrastRatio(compositeOver(bc, adj), adj))
    }

    if (Math.max(fillContrast, borderContrast) < 3) lowBoundaryControls.push(el)
  }

  if (lowBoundaryControls.length > 0) {
    incomplete.push(rule(
      'checkfox-nontext-contrast',
      'moderate',
      'Form control has no boundary reaching 3:1 contrast with its surroundings — verify its visual limits are perceivable',
      HELP.nonTextContrast,
      ['wcag1411'],
      lowBoundaryControls.map(el => nodeInfo(el, 'Give the control a border, background or focus/state indicator that contrasts at least 3:1 with the adjacent colour (WCAG 1.4.11). If a box-shadow, outline or icon already provides this, confirm it is sufficient')),
    ))
  }

  // ── checkfox-reflow ───────────────────────────────────────────────────────
  // RAWeb/RGAA 10.11 — content must reflow to a 320 CSS px viewport without a
  // second scroll direction (WCAG 1.4.10). We can't resize the viewport from an
  // injected check, so we flag the classic reflow blockers: a fixed pixel
  // min-width (which cannot shrink) or an inline fixed pixel width larger than
  // 320px on a non-replaced element. Reported 'incomplete' — final confirmation
  // needs an actual 320px render. Replaced elements (img/video/…) are excluded.
  const REFLOW_MIN = 320
  const REFLOW_REPLACED = new Set(['IMG', 'VIDEO', 'CANVAS', 'SVG', 'IFRAME', 'EMBED', 'OBJECT', 'PICTURE', 'MAP'])
  const reflowEls = []
  const allEls = document.body ? document.body.getElementsByTagName('*') : []
  const scanLimit = Math.min(allEls.length, 6000)
  for (let i = 0; i < scanLimit; i++) {
    if (reflowEls.length >= 50) break
    const el = allEls[i]
    if (REFLOW_REPLACED.has(el.tagName)) continue
    const cs = getComputedStyle(el)
    let reason = null
    const mw = cs.minWidth
    if (mw && mw.endsWith('px') && parseFloat(mw) > REFLOW_MIN) {
      reason = `min-width: ${mw}`
    } else {
      const iw = el.style && el.style.width
      if (iw && iw.endsWith('px') && parseFloat(iw) > REFLOW_MIN) reason = `width: ${iw}`
    }
    if (reason) reflowEls.push({ el, reason })
  }

  if (reflowEls.length > 0) {
    incomplete.push(rule(
      'checkfox-reflow',
      'moderate',
      'Fixed pixel width may prevent reflow to a 320px viewport',
      HELP.reflow,
      ['wcag1410'],
      reflowEls.map(({ el, reason }) => nodeInfo(el, `${reason} can force horizontal scrolling at small viewports. Verify content reflows to 320 CSS px (equivalent to 1280px at 400% zoom) without loss of information and without a second scroll direction`)),
    ))
  }

  return { violations, incomplete }
}

// True if an <svg> is actually painted. Unlike isRendered(), this avoids
// offsetParent — an HTMLElement-only property that is undefined on SVG elements
// and would read as "rendered" even inside a display:none ancestor. getClientRects
// is empty both for hidden subtrees and in layout-less engines (jsdom), so the
// check is correct in the browser and inert in tests.
function isSvgVisible(el) {
  if (!el.isConnected) return false
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false
  if (parseFloat(cs.opacity) === 0) return false
  return (el.getClientRects ? el.getClientRects().length : 0) > 0
}

// True if an <svg> exposes an accessible name to assistive technologies: an
// aria-label / aria-labelledby, a title *attribute*, or a non-empty <title>
// child (the SVG-native naming mechanism, which must be a direct child to name
// the root). Used by checkfox-svg-name-or-hide to skip already-named graphics.
function svgHasAccessibleName(el) {
  if (el.getAttribute('aria-label')?.trim()) return true
  if (el.getAttribute('aria-labelledby')?.trim()) return true
  if (el.getAttribute('title')?.trim()) return true
  const title = el.querySelector(':scope > title')
  return !!(title && title.textContent.trim())
}

// True if `el` is enclosed by a <fieldset> carrying a non-empty <legend>, or by
// an element with role="group"/"radiogroup" that has an accessible name. Used to
// decide whether grouped form controls (RAWeb/RGAA 11.5/11.6) are correctly grouped.
function hasGroupingContainer(el) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node.tagName === 'FIELDSET') {
      const legend = node.querySelector(':scope > legend')
      if (legend && legend.textContent.trim()) return true
    }
    const role = node.getAttribute('role')
    if ((role === 'group' || role === 'radiogroup') &&
        (node.getAttribute('aria-label')?.trim() || node.getAttribute('aria-labelledby'))) {
      return true
    }
  }
  return false
}

// Walk author stylesheets and return :focus rules that remove the outline
// without providing an alternative indicator in the same rule. Cross-origin
// sheets throw on .cssRules access and are skipped.
function collectOutlineSuppressingFocusRules() {
  const matches = []

  const suppressesOutline = s =>
    s.outlineStyle === 'none' || s.outline === 'none' ||
    s.outlineWidth === '0px' || s.outline === '0px' || s.outline === '0'

  const hasAlternativeIndicator = s =>
    (s.boxShadow && s.boxShadow !== 'none') ||
    (s.borderStyle && s.borderStyle !== 'none' && s.borderStyle !== '') ||
    !!s.borderColor || !!s.backgroundColor || !!s.background ||
    (!!s.outlineOffset && !suppressesOutline(s))

  const visit = rules => {
    for (const r of rules) {
      if (r.cssRules) { visit(r.cssRules); continue } // @media, @supports, …
      if (!r.selectorText || !r.selectorText.includes(':focus')) continue
      if (suppressesOutline(r.style) && !hasAlternativeIndicator(r.style)) matches.push(r)
    }
  }

  for (const sheet of document.styleSheets) {
    let rules
    try { rules = sheet.cssRules } catch { continue } // cross-origin
    if (rules) visit(rules)
  }
  return matches
}

// True if the element is actually rendered (in the box tree and not visually
// hidden). Used by the non-text-contrast check so we never measure invisible
// controls. In non-layout engines (jsdom) getClientRects is empty and
// offsetParent is null, so this returns false and the check stays inert there.
function isRendered(el) {
  if (!el || !el.isConnected) return false
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false
  if (parseFloat(cs.opacity) === 0) return false
  const rects = el.getClientRects ? el.getClientRects() : []
  return el.offsetParent !== null || cs.position === 'fixed' || rects.length > 0
}

// Parse a CSS colour as returned by getComputedStyle into { r, g, b, a } (0–255,
// alpha 0–1), or null if it isn't a resolvable rgb/rgba value. Handles both the
// legacy comma form `rgb(0, 0, 0)` / `rgba(0, 0, 0, .5)` and the modern
// space/slash form `rgb(0 0 0 / .5)` that recent engines emit. `transparent`
// resolves to fully transparent black.
function parseCssColor(str) {
  if (!str) return null
  const s = String(str).trim().toLowerCase()
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const m = s.match(/^rgba?\(([^)]+)\)$/)
  if (!m) return null
  const parts = m[1].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const r = parseFloat(parts[0])
  const g = parseFloat(parts[1])
  const b = parseFloat(parts[2])
  const a = parts.length >= 4 ? parseFloat(parts[3]) : 1
  if ([r, g, b].some(Number.isNaN)) return null
  return { r, g, b, a: Number.isNaN(a) ? 1 : a }
}

// Composite a (possibly translucent) foreground colour over an opaque background,
// returning the resulting opaque { r, g, b }.
function compositeOver(fg, bg) {
  const a = fg.a == null ? 1 : fg.a
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  }
}

// The opaque colour visible *behind* an element: walk ancestors compositing their
// background-colours (nearest last) over an assumed white page base, stopping at
// the first fully-opaque background.
function effectiveBackground(el) {
  const stack = [] // nearest ancestor first
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const c = parseCssColor(getComputedStyle(n).backgroundColor)
    if (c && c.a > 0) stack.push(c)
    if (c && c.a === 1) break
  }
  let acc = { r: 255, g: 255, b: 255 }
  for (let i = stack.length - 1; i >= 0; i--) acc = compositeOver(stack[i], acc)
  return acc
}

// WCAG relative luminance of an opaque { r, g, b } (0–255).
function relativeLuminance({ r, g, b }) {
  const f = v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

// WCAG contrast ratio between two opaque colours (1–21).
function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1)
  const l2 = relativeLuminance(c2)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}
