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
  // Checks adapted from pour engine — see the block at the end of runCustomChecks().
  focusNotObscured: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html',
  focusOrder:    'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
  errorIdentification: 'https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html',
  onInput:       'https://www.w3.org/WAI/WCAG22/Understanding/on-input.html',
  linkPurpose:   'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
  accessibleAuth: 'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html',
  contrastMinimum: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
  textSpacing:   'https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html',
}

// Natively focusable elements plus anything made focusable with tabindex.
const FOCUSABLE_SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])'

// Credential fields SC 3.3.8 is about.
const AUTH_FIELD_SELECTOR = 'input[type="password"], input[autocomplete~="current-password"], input[autocomplete~="new-password"], input[autocomplete~="one-time-code"]'

// Inline-handler bodies that navigate or submit, i.e. change the context.
const CONTEXT_CHANGE_RE = /\blocation\s*(=|\.\s*(href|assign|replace|reload))|\.(submit|requestSubmit)\s*\(|window\.open\s*\(/

// Link names that carry no destination on their own (RAWeb/RGAA 6.1). Bilingual:
// French sites are a first-class target, and "en savoir plus" is as common as
// "read more". Compared after normalizeLinkName(), so accents and punctuation
// are already stripped ("En savoir plus →" → "en savoir plus").
const GENERIC_LINK_TEXT = new Set([
  // English
  'read more', 'read more about this', 'more', 'much more', 'learn more',
  'click here', 'click', 'click this', 'tap here', 'press here',
  'here', 'this', 'this link', 'link', 'this page', 'go', 'go here',
  'more info', 'more information', 'further information',
  'see more', 'view more', 'show more', 'find out more', 'discover more',
  'continue', 'continue reading', 'keep reading', 'full story', 'full article',
  'details', 'see details', 'view details', 'more details',
  // French
  'en savoir plus', 'savoir plus', 'lire la suite', 'lire plus', 'plus',
  'cliquez ici', 'cliquer ici', 'clique ici', 'ici', 'ce lien', 'lien',
  'cette page', 'voir plus', 'en voir plus', 'afficher plus', 'afficher', 'voir', 'voir le détail',
  'voir les détails', 'plus de détails', 'plus d\'informations', 'plus d\'infos',
  'en savoir davantage', 'découvrir', 'découvrez', 'continuer', 'suite',
])

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

  // ══ Checks adapted from pour engine (MIT) ═════════════════════════════════
  // The eight blocks below are ported from https://github.com/pourdev/pour-engine
  // by David Yarham (MIT), a clean-room WCAG 2.2 engine. Each closes an
  // automation gap that neither axe-core 4.9.1 nor our own checks covered.
  // Adapted to our procedural shape, our violations/incomplete split and our
  // budget caps; French phrasings added where the original was English-only.
  // See docs/pour-engine-rule-port.md for the per-rule diff and attribution.

  // ── checkfox-focus-obscured ───────────────────────────────────────────────
  // WCAG 2.2 SC 2.4.11 (Focus Not Obscured). No axe rule exists. A sticky or
  // fixed opaque panel can entirely cover a control that already sits in the
  // viewport — the browser will not scroll it into view, so focus lands
  // invisibly. Always 'incomplete': whether it actually breaks 2.4.11 depends
  // on the scroll position when focus arrives, which a static scan can't know.
  const focusObscured = []
  if (!hasOpenModal()) {
    const overlayVerdict = new Map()
    const focusables = [...document.querySelectorAll(FOCUSABLE_SELECTOR)].slice(0, 1500)
    for (const el of focusables) {
      if (focusObscured.length >= 25) break
      const blocker = obscuringOverlayFor(el, overlayVerdict)
      if (blocker) focusObscured.push({ el, edge: blocker.edge })
    }
  }

  if (focusObscured.length > 0) {
    incomplete.push(rule(
      'checkfox-focus-obscured',
      'serious',
      'Focusable element sits under an opaque fixed panel — verify its focus indicator is never fully hidden',
      HELP.focusNotObscured,
      ['wcag2411'],
      focusObscured.map(({ el, edge }) => nodeInfo(el, `This element is currently underneath an opaque fixed or sticky panel. The browser does not scroll an element that is already in the viewport but merely covered, so focus can land invisibly. Tab through the page and verify the focus indicator is never entirely hidden. Fix: reserve room with scroll-padding-${edge || 'bottom'} on the scrolling container, or move focus clear of the panel while it is up`)),
    ))
  }

  // ── checkfox-visual-order ─────────────────────────────────────────────────
  // RAWeb/RGAA 12.8 (WCAG 2.4.3). Flexbox/grid `order` or `*-reverse` can lay
  // controls out in a different sequence from the DOM, so Tab jumps against
  // the visual layout. axe has no equivalent. Reported once per diverging
  // container, on its first control.
  const visualOrderGroups = collectVisualOrderDivergence()

  if (visualOrderGroups.length > 0) {
    incomplete.push(rule(
      'checkfox-visual-order',
      'moderate',
      'CSS reordering makes the tab sequence diverge from the visual order',
      HELP.focusOrder,
      ['wcag243'],
      visualOrderGroups.map(({ el, count, cause }) => nodeInfo(el, `Keyboard focus moves through these ${count} controls in DOM order, but ${cause} arranges them differently on screen, so Tab jumps against the visual layout. Verify the focus sequence still preserves meaning and operability. Fix: reorder the source to match the visual order rather than reordering with CSS`)),
    ))
  }

  // ── checkfox-error-message-linkage ────────────────────────────────────────
  // RAWeb/RGAA 11.10 (WCAG 3.3.1). A field marked aria-invalid must have its
  // error described in text and programmatically linked. axe checks neither.
  const errorLinkage = []
  for (const el of document.querySelectorAll('[aria-invalid="true"], [aria-invalid="spelling"], [aria-invalid="grammar"], [aria-errormessage]')) {
    if (errorLinkage.length >= 30) break
    const state = el.getAttribute('aria-invalid')
    const invalid = !!state && state !== 'false' && state !== 'undefined'

    if (el.hasAttribute('aria-errormessage')) {
      if (!invalid) continue // the reference is inert until the field is invalid
      const targets = idRefTargets(el, 'aria-errormessage')
      if (targets.some(hasReadableText)) continue
      errorLinkage.push({
        el,
        reason: targets.length
          ? 'this field is marked invalid, but the element its aria-errormessage points at is empty or hidden'
          : 'this field is marked invalid, but its aria-errormessage points at nothing',
      })
      continue
    }

    if (!invalid) continue
    if (idRefTargets(el, 'aria-describedby').some(hasReadableText)) continue
    errorLinkage.push({ el, reason: 'this field is marked invalid, but no error text is programmatically linked to it' })
  }

  if (errorLinkage.length > 0) {
    incomplete.push(rule(
      'checkfox-error-message-linkage',
      'serious',
      'Field marked invalid has no error text linked to it',
      HELP.errorIdentification,
      ['wcag331'],
      errorLinkage.map(({ el, reason }) => nodeInfo(el, `WCAG 3.3.1 requires the error to be described to the user in text: ${reason}. Screen readers follow the reference and find nothing. Verify a visible message exists and associate it with aria-describedby or aria-errormessage so it is announced with the field`)),
    ))
  }

  // ── checkfox-on-input-change ──────────────────────────────────────────────
  // RAWeb/RGAA 7.4 (WCAG 3.2.2 / 3.2.1). An inline onchange/oninput/onfocus
  // handler that navigates or submits changes context without the user asking.
  // Only inline handlers are statically visible; framework listeners are not,
  // so this is a floor, not a ceiling. axe has no equivalent.
  const contextChangers = []
  for (const el of document.querySelectorAll('[onchange], [oninput], [onfocus]')) {
    if (contextChangers.length >= 30) break
    const onfocus = el.getAttribute('onfocus')
    if (onfocus && CONTEXT_CHANGE_RE.test(onfocus)) {
      contextChangers.push({
        el,
        reason: 'Focusing this element appears to navigate or submit: its onfocus handler reaches for location, submit or window.open. A change of context on focus alone fails WCAG 3.2.1',
        fix: 'Trigger navigation from activation (click / Enter), never from focus',
      })
      continue
    }
    const onchange = el.getAttribute('onchange') || el.getAttribute('oninput')
    if (onchange && CONTEXT_CHANGE_RE.test(onchange)) {
      contextChangers.push({
        el,
        reason: 'Changing this control appears to navigate or submit: its onchange handler reaches for location, submit or window.open. WCAG 3.2.2 allows that only when users are warned beforehand',
        fix: 'Describe the behaviour before the control, or navigate from an explicit "Go" button instead of the change event',
      })
    }
  }

  if (contextChangers.length > 0) {
    incomplete.push(rule(
      'checkfox-on-input-change',
      'serious',
      'Inline handler changes context on focus or on input',
      HELP.onInput,
      ['wcag322'],
      contextChangers.map(({ el, reason, fix }) => nodeInfo(el, `${reason}. Verify what the handler actually does. Fix: ${fix}`)),
    ))
  }

  // ── checkfox-link-text-generic ────────────────────────────────────────────
  // RAWeb/RGAA 6.1 (WCAG 2.4.4). "Read more" / "En savoir plus" links whose
  // accessible name says nothing about the destination. 2.4.4 lets the
  // surrounding context supply the purpose, so this is always 'incomplete' —
  // a human confirms. axe's link-name only checks a name *exists*.
  const genericLinks = []
  for (const el of document.querySelectorAll('a[href], [role="link"]')) {
    if (genericLinks.length >= 50) break
    const name = accessibleText(el)
    if (!name) continue // nameless links are axe's link-name, not ours
    if (GENERIC_LINK_TEXT.has(normalizeLinkName(name))) genericLinks.push({ el, name })
  }

  if (genericLinks.length > 0) {
    incomplete.push(rule(
      'checkfox-link-text-generic',
      'moderate',
      'Link text does not describe where the link goes',
      HELP.linkPurpose,
      ['wcag244'],
      genericLinks.map(({ el, name }) => nodeInfo(el, `"${name}" does not say where this link goes. WCAG 2.4.4 lets the surrounding text supply the destination, so this passes only if the context a screen reader reaches (the same sentence, list item, table cell, or the heading of the card it sits in) makes it obvious. Verify it does, and remember that anyone browsing a list of the page's links sees this name on its own. Fix: put the destination in the link text itself, or extend the name with aria-label keeping the visible words at the start`)),
    ))
  }

  // ── checkfox-auth-obstruction ─────────────────────────────────────────────
  // WCAG 2.2 SC 3.3.8 (Accessible Authentication). Note 2 of the SC names two
  // separate mechanisms: password-manager support, and copy and paste.
  // Blocking paste removes one; autocomplete="off" discourages the other.
  // Both at once is a failure; either alone is a review, because a password
  // manager still fills a paste-blocked field and the page may offer an
  // alternative (passkey, federated sign-in) that a DOM scan cannot see.
  const authBlocked = []
  const authReview = []
  for (const el of document.querySelectorAll(AUTH_FIELD_SELECTOR)) {
    const blocking = ['onpaste', 'ondrop'].find(attr => /return\s+false|preventDefault/.test(el.getAttribute(attr) || ''))
    const autocompleteOff = (el.getAttribute('autocomplete') || '').trim().toLowerCase() === 'off'
    const action = blocking === 'onpaste' ? 'pasting' : 'dropping'
    if (blocking && autocompleteOff) {
      authBlocked.push({ el, action })
    } else if (blocking) {
      authReview.push({ el, reason: `this field blocks ${action}, which removes copy and paste, one of the two mechanisms SC 3.3.8 names. A password manager fills the field directly and is unaffected, so this only fails if nothing else here helps` })
    } else if (autocompleteOff) {
      authReview.push({ el, reason: 'this field sets autocomplete="off", discouraging password managers. Browsers often fill anyway' })
    }
  }

  if (authBlocked.length > 0) {
    violations.push(rule(
      'checkfox-auth-obstruction',
      'serious',
      'Authentication field blocks both paste and password managers',
      HELP.accessibleAuth,
      ['wcag338'],
      authBlocked.map(({ el, action }) => nodeInfo(el, `This authentication field blocks ${action} AND sets autocomplete="off", so both of the mechanisms WCAG 3.3.8 names are obstructed at once: copy and paste, and password-manager entry. What is left is typing the credential from memory. Remove the paste/drop blocking and drop autocomplete="off"`)),
    ))
  }

  if (authReview.length > 0) {
    incomplete.push(rule(
      'checkfox-auth-obstruction',
      'moderate',
      'Authentication field obstructs one of the mechanisms SC 3.3.8 relies on',
      HELP.accessibleAuth,
      ['wcag338'],
      authReview.map(({ el, reason }) => nodeInfo(el, `${reason}. Verify a password manager can complete this login without retyping, or that the page offers another way in (a passkey, a federated sign-in, an emailed link)`)),
    ))
  }

  // ── checkfox-placeholder-contrast ─────────────────────────────────────────
  // RAWeb/RGAA 3.2 (WCAG 1.4.3). axe's color-contrast already measures the
  // *value* text of form controls but never reads ::placeholder, which is
  // routinely styled far too light. Measured, not guessed: a definite
  // violation when the field background is known, review when it is not.
  const placeholderFails = []
  const placeholderUnknown = []
  for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
    if (placeholderFails.length + placeholderUnknown.length >= 30) break
    if (!(el.getAttribute('placeholder') || '').trim()) continue
    if (el.disabled || el.closest('[aria-disabled="true"]')) continue
    if (!isRendered(el)) continue

    const cs = getComputedStyle(el)
    const ph = parseCssColor(getComputedStyle(el, '::placeholder').color)
    if (!ph || ph.a === 0) continue // no distinct placeholder colour to measure

    const own = parseCssColor(cs.backgroundColor)
    let bg
    if (own && own.a >= 1) {
      bg = own
    } else if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      placeholderUnknown.push({ el, reason: 'this field is see-through or painted with a background image or gradient, so its real placeholder contrast depends on the pixels behind it' })
      continue
    } else {
      const behind = effectiveBackground(el.parentElement || el)
      bg = own && own.a > 0 ? compositeOver(own, behind) : behind
    }

    // WCAG "large text": >= 24px, or >= 18.66px (14pt) when bold.
    const size = parseFloat(cs.fontSize) || 16
    const weight = parseInt(cs.fontWeight, 10) || 400
    const required = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5
    const ratio = contrastRatio(compositeOver(ph, bg), bg)
    if (ratio < required) placeholderFails.push({ el, ratio: Math.round(ratio * 100) / 100, required })
  }

  if (placeholderFails.length > 0) {
    violations.push(rule(
      'checkfox-placeholder-contrast',
      'serious',
      'Placeholder text does not reach the minimum contrast ratio',
      HELP.contrastMinimum,
      ['wcag143'],
      placeholderFails.map(({ el, ratio, required }) => nodeInfo(el, `This field's placeholder text has ${ratio}:1 contrast against the field background, below the ${required}:1 minimum required by WCAG 1.4.3. Darken the ::placeholder colour until it reaches ${required}:1. Note that placeholder text is not a substitute for a label in any case`)),
    ))
  }

  if (placeholderUnknown.length > 0) {
    incomplete.push(rule(
      'checkfox-placeholder-contrast',
      'moderate',
      'Placeholder contrast could not be measured — verify it by eye',
      HELP.contrastMinimum,
      ['wcag143'],
      placeholderUnknown.map(({ el, reason }) => nodeInfo(el, `${reason}. Check the placeholder reaches 4.5:1 (or 3:1 for large text) against what is actually behind it`)),
    ))
  }

  // ── checkfox-text-spacing ─────────────────────────────────────────────────
  // RAWeb/RGAA 10.12 (WCAG 1.4.12). Active probe, in the spirit of the
  // criterion's own test procedure: apply the SC's exact spacing overrides and
  // look for containers that start clipping. axe's avoid-inline-spacing only
  // catches !important inline spacing declarations, not clipped boxes.
  //
  // Runs LAST, and synchronously: the probe stylesheet is injected and removed
  // inside a single tick, so no other check (and no axe run) can observe it.
  const textSpacing = probeTextSpacing()

  if (textSpacing.length > 0) {
    incomplete.push(rule(
      'checkfox-text-spacing',
      'serious',
      'Container overflows under the WCAG text-spacing overrides',
      HELP.textSpacing,
      ['wcag1412'],
      textSpacing.map(({ el, repeats }) => nodeInfo(el, `With the WCAG 1.4.12 text-spacing overrides applied (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph spacing 2em) this container overflows instead of growing. If that hides text rather than empty trailing spacing, users who need wider spacing lose content.${repeats > 1 ? ` The same component clips ${repeats} times on this page, so one CSS fix covers them all (up to 3 examples are listed).` : ''} Verify with the overrides applied; to be safe, let the container grow (min-height instead of height, and avoid overflow:hidden on text)`)),
    ))
  }

  return { violations, incomplete }
}

// ─── Colours 3.2 — text contrast collection (Tools → Colors → Contrast) ────────
// Measures every text-bearing element's computed colour against its effective
// background and returns a flat list; the popup groups it by colour pair. This
// is the interactive complement to axe's flat `color-contrast` violation.
//
// Elements sitting over a background image or gradient can't have their real
// backdrop known from colour alone, so they are measured against a best-effort
// solid fallback and flagged `undetermined` (the popup shows them as a "needs
// review" alert) — never silently dropped. The solid-fallback fix itself is the
// future criterion-10.5 tool.
export function collectContrast() {
  const items = []

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IFRAME'])
  const all = document.body ? document.body.getElementsByTagName('*') : []
  const scanLimit = Math.min(all.length, 8000)

  for (let i = 0; i < scanLimit && items.length < 4000; i++) {
    const el = all[i]
    if (SKIP_TAGS.has(el.tagName)) continue
    if (!hasDirectText(el)) continue
    if (!isRendered(el)) continue

    const cs = getComputedStyle(el)
    const fg = parseCssColor(cs.color)
    if (!fg || fg.a === 0) continue // fully transparent text — nothing to read

    // Best-effort backdrop: composite solid background-colours up the ancestor
    // chain over the white page base. `hasImage` means a background image or
    // gradient sits over that solid colour, so the true backdrop is unknown — we
    // still report the element (flagged `undetermined` for manual review) rather
    // than dropping it, so image-backed text (a 3.2 risk, and a 10.5 fallback
    // concern) is never silently forgotten.
    const { bg, hasImage } = resolveBackground(el)
    const fgOpaque = compositeOver(fg, bg) // flatten translucent text onto its bg
    const ratio = contrastRatio(fgOpaque, bg)

    const size = parseFloat(cs.fontSize) || 16
    const weight = parseInt(cs.fontWeight, 10) || 400
    // WCAG "large text": ≥ 24px, or ≥ 18.66px (14pt) when bold.
    const isLarge = size >= 24 || (size >= 18.66 && weight >= 700)

    items.push({
      ...nodeInfo(el, ''),
      fg: rgbToHex(fgOpaque),
      bg: rgbToHex(bg),
      ratio: Math.round(ratio * 100) / 100,
      required: isLarge ? 3 : 4.5,
      isLarge,
      undetermined: hasImage,
    })
  }

  return { items }
}

// True if `el` has a non-whitespace direct text-node child, i.e. its own colour
// actually paints some text (as opposed to only wrapping other elements).
function hasDirectText(el) {
  for (const node of el.childNodes) {
    if (node.nodeType === 3 && node.nodeValue.trim() !== '') return true
  }
  return false
}

// Resolve the effective backdrop behind an element's text: composite every
// background-colour from the element up to (and including) the first fully
// opaque ancestor over the white page base, and report whether a background
// image or gradient sits at or above that opaque layer (i.e. paints over the
// solid colour we measured), which makes the true backdrop unknown.
//
// This is deliberately a read-only ancestor walk: `background-color: inherit`
// would only read one level, and mutating each element's style to read it back
// would force a reflow per element — the walk is both richer and cheaper.
function resolveBackground(el) {
  const layers = [] // nearest ancestor first
  let hasImage = false
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n)
    if (cs.backgroundImage && cs.backgroundImage !== 'none') hasImage = true
    const c = parseCssColor(cs.backgroundColor)
    if (c && c.a > 0) {
      layers.push(c)
      if (c.a === 1) break // opaque — nothing below it shows through
    }
  }
  let acc = { r: 255, g: 255, b: 255 }
  for (let i = layers.length - 1; i >= 0; i--) acc = compositeOver(layers[i], acc)
  return { bg: acc, hasImage }
}

// Format an opaque { r, g, b } (0–255, possibly fractional) as a #rrggbb string.
function rgbToHex({ r, g, b }) {
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
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

// ═══ Helpers for the checks adapted from pour engine (MIT, David Yarham) ══════
// https://github.com/pourdev/pour-engine — see docs/pour-engine-rule-port.md.

// True if a visible modal dialog is open. SC 2.4.11 is not meaningfully
// testable underneath one: everything behind the dialog is legitimately
// covered, so checkfox-focus-obscured abstains entirely.
function hasOpenModal() {
  for (const el of document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]')) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return true
  }
  return false
}

// The fixed/sticky opaque panel currently covering `el` in full, or null.
// Returns { edge } where edge is 'top' | 'bottom' | null, naming which viewport
// edge the panel is pinned to, so the message can suggest the right
// scroll-padding. `verdicts` memoises the "is this layer an opaque panel?"
// answer across elements — the same header is hit over and over.
function obscuringOverlayFor(el, verdicts) {
  const win = document.defaultView
  if (!win || el.matches(':disabled')) return null
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  // Off-screen elements are not "obscured", they are simply not shown yet.
  if (rect.bottom < 0 || rect.right < 0 || rect.top > win.innerHeight || rect.left > win.innerWidth) return null

  const x = Math.min(Math.max(rect.left + rect.width / 2, 0), win.innerWidth - 1)
  const y = Math.min(Math.max(rect.top + rect.height / 2, 0), win.innerHeight - 1)
  const stack = document.elementsFromPoint(x, y)
  const index = stack.indexOf(el)
  if (index <= 0) return null // topmost at its own centre, or not hit-testable

  const isOpaquePanel = layer => {
    if (verdicts.has(layer)) return verdicts.get(layer)
    let verdict = false
    const cs = getComputedStyle(layer)
    if (cs.position === 'fixed' || cs.position === 'sticky') {
      const parts = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1]?.split(',')
      const alpha = parts && parts[3] !== undefined ? parseFloat(parts[3]) : 1
      const r = layer.getBoundingClientRect()
      verdict = alpha >= 0.9 && r.width >= 40 && r.height >= 24
    }
    verdicts.set(layer, verdict)
    return verdict
  }

  const blocker = stack.slice(0, index).find(layer => {
    if (layer.contains(el) || el.contains(layer)) return false
    if (!isOpaquePanel(layer)) return false
    const p = layer.getBoundingClientRect()
    // Fully covered, not merely overlapped: a partly-visible indicator passes.
    return rect.left >= p.left && rect.right <= p.right && rect.top >= p.top && rect.bottom <= p.bottom
  })
  if (!blocker) return null

  const p = blocker.getBoundingClientRect()
  const edge = p.top <= 1 && p.bottom < win.innerHeight ? 'top'
    : p.bottom >= win.innerHeight - 1 ? 'bottom'
    : null

  // scroll-padding on the scroller is what the Understanding document cites as
  // sufficient: it keeps the browser's own scroll-into-view clear of the panel.
  if (edge) {
    const scroller = document.scrollingElement || document.documentElement
    const cs = getComputedStyle(scroller)
    const value = edge === 'top' ? cs.scrollPaddingTop : cs.scrollPaddingBottom
    const px = value && value.endsWith('px') ? parseFloat(value) : 0
    if (px >= p.height - 1) return null
  }

  return { edge }
}

// Flex/grid containers whose children are laid out in a different sequence from
// the DOM (via `order` or a `*-reverse` direction), which makes Tab jump against
// the visual order. Returns one entry per diverging container, anchored on its
// first control: { el, count, cause }.
function collectVisualOrderDivergence() {
  const FLEXGRID = /^(inline-)?(flex|grid)$/
  const groups = new Map()
  const candidates = [...document.querySelectorAll(FOCUSABLE_SELECTOR)].slice(0, 1500)
  for (const el of candidates) {
    if (el.disabled || el.tabIndex < 0) continue
    const parent = el.parentElement
    if (!parent) continue
    if (!groups.has(parent)) groups.set(parent, [])
    groups.get(parent).push(el)
  }

  const found = []
  for (const [parent, children] of groups) {
    if (found.length >= 20) break
    if (children.length < 2) continue
    const pcs = getComputedStyle(parent)
    if (!FLEXGRID.test(pcs.display)) continue

    const entries = []
    for (const el of children) {
      const cs = getComputedStyle(el)
      // Out-of-flow children are positioned by the author, not by the container.
      if (cs.position === 'absolute' || cs.position === 'fixed') continue
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) entries.push({ el, order: cs.order, rect })
    }
    if (entries.length < 2) continue

    const reversed = /-reverse$/.test(pcs.flexDirection)
    const usesOrder = entries.some(e => e.order !== '0')
    if (!reversed && !usesOrder) continue

    const visual = visualSequence(entries, pcs.direction === 'rtl')
    if (!visual.some((e, i) => e !== entries[i])) continue

    found.push({
      el: entries[0].el,
      count: entries.length,
      cause: reversed ? `flex-direction: ${pcs.flexDirection}` : 'CSS order',
    })
  }
  return found
}

// Visual reading order of sibling rects: group into rows by vertical overlap,
// rows top to bottom, then within a row along the inline direction.
function visualSequence(entries, rightToLeft) {
  const rows = []
  for (const entry of [...entries].sort((a, b) => a.rect.top - b.rect.top)) {
    const row = rows.find(candidates => {
      const first = candidates[0].rect
      const overlap = Math.min(first.bottom, entry.rect.bottom) - Math.max(first.top, entry.rect.top)
      return overlap > Math.min(first.height, entry.rect.height) / 2
    })
    if (row) row.push(entry)
    else rows.push([entry])
  }
  return rows.flatMap(row => row.sort((a, b) =>
    rightToLeft ? b.rect.right - a.rect.right : a.rect.left - b.rect.left))
}

// Elements referenced by a space-separated IDREF list attribute, resolved
// against the element's root so it works inside a shadow root too.
function idRefTargets(el, attr) {
  const root = el.getRootNode()
  return (el.getAttribute(attr) || '').trim().split(/\s+/).filter(Boolean)
    .map(id => (root.getElementById ? root.getElementById(id) : document.getElementById(id)))
    .filter(Boolean)
}

// True if a referenced element actually exposes text a screen reader would read.
function hasReadableText(el) {
  if (!isRendered(el)) return false
  return !!(el.textContent.trim() || accessibleText(el))
}

// Lowercased, accents folded, punctuation and arrows dropped, spaces collapsed,
// so "Read more →", "Click here!", "READ  MORE" and "En savoir plus…" all
// compare equal against GENERIC_LINK_TEXT.
function normalizeLinkName(name) {
  return name
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Apply the WCAG 1.4.12 text-spacing overrides and return the containers that
// only start clipping once they are applied. Injection and removal happen in a
// single synchronous tick, so the page never paints the probed state and no
// other check can observe it.
//
// Reported as review, never as a failure: the scroll-size delta proves the box
// OVERFLOWS under the override, not that glyphs are lost. The 0.12em
// letter-spacing lands after the final glyph too, so a snug box can overflow by
// trailing empty spacing that hides no ink. Proving ink loss would need
// per-glyph rects against the clip box; until then it is a human call.
function probeTextSpacing() {
  const OVERRIDE = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`
  const clipped = el => el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2

  const all = document.body ? document.body.getElementsByTagName('*') : []
  // Past this scale the per-element getComputedStyle cost dwarfs the yield, and
  // huge documents are mostly plain flowing text, the least likely to clip.
  if (all.length > 20000) return []

  // Only containers that hide overflow and hold text can lose content.
  // Collapsed containers (an accordion panel at height 0) show nothing, so
  // there is no visible text for the override to clip.
  const candidates = []
  const scanLimit = Math.min(all.length, 6000)
  for (let i = 0; i < scanLimit && candidates.length < 400; i++) {
    const el = all[i]
    if (!el.textContent || !el.textContent.trim()) continue
    const cs = getComputedStyle(el)
    if (!/(hidden|clip)/.test(`${cs.overflowX} ${cs.overflowY}`)) continue
    if (el.clientWidth > 4 && el.clientHeight > 4) candidates.push(el)
  }
  if (candidates.length === 0) return []

  // Content already truncated by design (an ellipsis clamp) is judged
  // as-authored, so only NEW clipping counts.
  const before = candidates.map(clipped)
  const probe = document.createElement('style')
  probe.setAttribute('data-checkfox-probe', 'text-spacing')
  probe.textContent = OVERRIDE
  document.documentElement.appendChild(probe)
  let after
  try {
    void document.documentElement.offsetHeight // force the reflow we measure
    after = candidates.map(clipped)
  } finally {
    probe.remove()
  }

  const hits = candidates.filter((el, i) => !before[i] && after[i])

  // One clipped design-system component repeated across a card grid is ONE CSS
  // fix, so listing all 30 instances is noise, not evidence (measured on a real
  // news homepage: 30 identical `div.ds-card` rows). Group by tag + classes and
  // keep at most 3 examples per shape, carrying the true count in the message.
  const bySignature = new Map()
  for (const el of hits) {
    const signature = `${el.tagName}.${[...el.classList].join('.')}`
    if (!bySignature.has(signature)) bySignature.set(signature, [])
    bySignature.get(signature).push(el)
  }

  const reported = []
  for (const group of bySignature.values()) {
    for (const el of group.slice(0, 3)) reported.push({ el, repeats: group.length })
    if (reported.length >= 30) break
  }
  return reported.slice(0, 30)
}
