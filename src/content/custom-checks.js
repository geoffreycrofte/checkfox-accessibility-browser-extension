// Custom accessibility checks for media elements not covered by axe-core.
// Results use the same shape as axe-runner.js mapRule() output so they flow
// through the same enrichViolations() pipeline in the popup.

const HELP = {
  pauseStopHide: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
  keyboard:      'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
  videoOnly:     'https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded.html',
}

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

  return { violations, incomplete }
}
