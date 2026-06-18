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
}

// Bilingual (EN/FR) hint that a link warns it opens a new window or tab.
const NEW_WINDOW_HINT = /new window|new tab|opens? (in|a new)|external link|nouvelle fenêtre|nouvel onglet|ouvre dans|s'ouvre dans|nouvelle page/i

// Obsolete / purely presentational HTML elements (RAWeb/RGAA 8.9).
// blink and marquee are intentionally excluded — axe-core already flags them.
const DEPRECATED_PRESENTATIONAL = ['center', 'font', 'big', 'tt', 'strike', 'basefont']

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

  return { violations, incomplete }
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
