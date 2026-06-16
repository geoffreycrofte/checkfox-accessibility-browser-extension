// ─── Shared badge CSS (injected via args:[SHARED_CSS] into page context) ──────
// Evaluated at module load time (extension context), serialized by Chrome,
// received as the first param of inject(css) in page context.

const SHARED_CSS = [
  '.__cfbadge{font-family:ui-monospace,"Cascadia Code","Fira Code",monospace!important;',
  'font-size:11px!important;font-weight:600!important;padding:2px 6px!important;',
  'border-radius:3px!important;display:block!important;width:max-content!important;',
  'max-width:100%!important;margin:2px 0!important;pointer-events:none!important;line-height:1.5!important}',
  '.__cfbadge--ok{background:#052e16!important;color:#86efac!important;border:1px solid #14532d!important}',
  '.__cfbadge--err{background:#3b1010!important;color:#fca5a5!important;border:1px solid #7f1d1d!important}',
  '.__cfbadge--warn{background:#431407!important;color:#fed7aa!important;border:1px solid #78350f!important}',
  '.__cfbadge--info{background:#1e1b4b!important;color:#a5b4fc!important;border:1px solid #3730a3!important}',
  '.__cfbadge--mute{background:#262636!important;color:#9898b0!important;border:1px solid #3a3a52!important}',
  '.__cfbadge--purple{background:#3b0764!important;color:#e9d5ff!important;border:1px solid #7e22ce!important}',
  '.__cfbadge--yellow{background:#2d2200!important;color:#fcd34d!important;border:1px solid #78350f!important}',
].join('')

// ─── Outline colour palette (used in inject CSS strings and legend arrays) ────
// These are module-scope — do NOT reference inside inject/remove function bodies.
const C = { ok: '#22c55e', err: '#ef4444', warn: '#f97316', caution: '#eab308', info: '#6366f1', purple: '#a855f7' }

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const TOOLS = [

  // ── 1. IMAGES ────────────────────────────────────────────────────────────────

  {
    id: 'images',
    group: 'Images',
    label: 'Images',
    description: 'Shows alt text on each image and outlines by accessibility status',
    criteria: ['01.01', '01.02', '01.03'],
    legend: [
      { border: `2px solid ${C.purple}`, label: 'img — has alt text' },
      { border: `2px solid ${C.ok}`,     label: 'img — decorative (alt="")' },
      { border: `3px solid ${C.err}`,    label: 'img — missing alt attribute' },
      { border: `2px dashed ${C.ok}`,    label: 'svg / role="img" — hidden from AT' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'images'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'img{outline:2px solid #a855f7!important;max-width:150px}' +
        'img:not([alt]){outline:3px solid #ef4444!important}' +
        'img[alt=""]{outline:2px solid #22c55e!important}' +
        'svg{outline:2px solid #22c55e!important;max-width:150px}' +
        'svg[aria-hidden="true"]{outline:2px dashed #22c55e!important}' +
        '[role="img"]{outline:2px solid #a855f7!important}' +
        '[role="img"][aria-hidden="true"]{outline:2px dashed #a855f7!important}' +
        'area{outline:2px solid #f97316!important}' +
        'input[type="image"]{outline:2px solid #a855f7!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('img').forEach(img => {
        const alt = img.getAttribute('alt')
        let badge
        if (alt === null) {
          badge = mk(s.altMissing, 'err')
        } else if (alt === '') {
          badge = mk(s.decorative, 'mute')
        } else {
          badge = mk(`alt="${alt}"`, 'ok')
        }
        img.insertAdjacentElement('afterend', badge)
      })
    },
    remove: () => {
      const ID = 'images'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── 2. FRAMES ────────────────────────────────────────────────────────────────

  {
    id: 'frames',
    group: 'Frames',
    label: 'Frames & iframes',
    description: 'Show frame and iframe title attributes',
    criteria: ['02.01', '02.02'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'frames'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'frame{outline:3px solid #ef4444!important}' +
        'iframe{outline:3px solid #eab308!important}' +
        'iframe[title]{outline:2px solid #22c55e!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('frame,iframe').forEach(el => {
        const tag = el.tagName.toLowerCase()
        const title = el.getAttribute('title')
        if (!title) {
          el.insertAdjacentElement('beforebegin', mk(`<${tag}> — ${s.noTitle}`, 'err'))
        } else if (title.trim() === '') {
          el.insertAdjacentElement('beforebegin', mk(`<${tag} title=""> — ${s.emptyTitle}`, 'warn'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`<${tag} title="${title}">`, 'ok'))
        }
      })
    },
    remove: () => {
      const ID = 'frames'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── 5. TABLES ────────────────────────────────────────────────────────────────

  {
    id: 'table-summary',
    group: 'Tables',
    label: 'Table summary',
    description: 'Show the summary of data tables for relevance review; complex tables need one',
    criteria: ['05.01', '05.02'],
    legend: [
      { border: `2px solid ${C.ok}`,      label: 'summary / aria-describedby present' },
      { border: `2px solid ${C.caution}`, label: 'no summary (required only if complex)' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'table-summary'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'table{outline:2px solid #eab308!important}' +
        '[data-cfsum="ok"]{outline:2px solid #22c55e!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }
      const trunc = (str, n) => str && str.length > n ? str.slice(0, n) + '…' : (str ?? '')

      document.querySelectorAll('table').forEach(el => {
        if (el.getAttribute('role') === 'presentation' || el.getAttribute('role') === 'none') return
        const summary = el.getAttribute('summary')
        const describedby = el.getAttribute('aria-describedby')
        if (summary !== null) {
          el.dataset.cfsum = 'ok'
          el.insertAdjacentElement('beforebegin', mk(`summary="${trunc(summary, 40)}"`, 'ok'))
        } else if (describedby) {
          const refText = describedby.trim().split(/\s+/).map(r => document.getElementById(r)?.textContent?.trim() ?? r).join(' ')
          el.dataset.cfsum = 'ok'
          el.insertAdjacentElement('beforebegin', mk(`aria-describedby → "${trunc(refText, 34)}"`, 'ok'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(s.noSummary, 'warn'))
        }
      })
    },
    remove: () => {
      const ID = 'table-summary'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfsum]').forEach(e => e.removeAttribute('data-cfsum'))
    },
  },

  {
    id: 'table-caption',
    group: 'Tables',
    label: 'Table caption',
    description: 'Show how each data table is titled and whether the title is associated',
    criteria: ['05.04', '05.05'],
    legend: [
      { border: `2px solid ${C.ok}`,   label: '<caption> child element' },
      { border: `2px solid ${C.info}`, label: 'aria-label / aria-labelledby' },
      { border: `3px solid ${C.err}`,  label: 'no title / caption' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'table-caption'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'caption{outline:2px solid #22c55e!important}' +
        '[data-cfcap="none"]{outline:3px solid #ef4444!important}' +
        '[data-cfcap="aria"]{outline:2px solid #6366f1!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }
      const trunc = (str, n) => str && str.length > n ? str.slice(0, n) + '…' : (str ?? '')

      document.querySelectorAll('table').forEach(el => {
        if (el.getAttribute('role') === 'presentation' || el.getAttribute('role') === 'none') return
        const caption = el.querySelector(':scope > caption')
        const label = el.getAttribute('aria-label')
        const labelledby = el.getAttribute('aria-labelledby')
        if (caption) {
          el.insertAdjacentElement('beforebegin', mk(`<caption> "${trunc(caption.textContent?.trim(), 34)}"`, 'ok'))
        } else if (label) {
          el.dataset.cfcap = 'aria'
          el.insertAdjacentElement('beforebegin', mk(`aria-label="${trunc(label, 34)}"`, 'info'))
        } else if (labelledby) {
          const refText = labelledby.trim().split(/\s+/).map(r => document.getElementById(r)?.textContent?.trim() ?? r).join(' ')
          el.dataset.cfcap = 'aria'
          el.insertAdjacentElement('beforebegin', mk(`aria-labelledby → "${trunc(refText, 28)}"`, 'info'))
        } else {
          el.dataset.cfcap = 'none'
          el.insertAdjacentElement('beforebegin', mk(s.noCaption, 'err'))
        }
      })
    },
    remove: () => {
      const ID = 'table-caption'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfcap]').forEach(e => e.removeAttribute('data-cfcap'))
    },
  },

  {
    id: 'table-headers',
    group: 'Tables',
    label: 'Table headers',
    description: 'Show header cells, scope, and cell→header associations; flag data tables with no headers',
    criteria: ['05.06', '05.07'],
    legend: [
      { border: `2px solid ${C.purple}`, label: '<th> / header cell (shows scope)' },
      { border: `2px solid ${C.info}`,   label: 'td with headers="…" association' },
      { border: `3px solid ${C.err}`,    label: 'data table with no header cells' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'table-headers'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'th,[role="columnheader"],[role="rowheader"]{outline:2px solid #a855f7!important}' +
        'td[headers]{outline:2px solid #6366f1!important}' +
        '[data-cfhdr="none"]{outline:3px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('table').forEach(el => {
        if (el.getAttribute('role') === 'presentation' || el.getAttribute('role') === 'none') return
        const headers = el.querySelectorAll('th,[role="columnheader"],[role="rowheader"]')
        if (headers.length === 0) {
          el.dataset.cfhdr = 'none'
          el.insertAdjacentElement('beforebegin', mk(s.noHeaders, 'err'))
        }
      })

      document.querySelectorAll('th,[role="columnheader"],[role="rowheader"]').forEach(el => {
        const scope = el.getAttribute('scope')
        const id = el.id
        const tag = el.tagName.toLowerCase() === 'th' ? 'th' : `role=${el.getAttribute('role')}`
        const idPart = id ? ` id="${id}"` : ''
        el.insertAdjacentElement('beforebegin', mk(`${tag} scope="${scope ?? '—'}"${idPart}`, 'purple'))
      })

      document.querySelectorAll('td[headers]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`headers="${el.getAttribute('headers')}"`, 'info'))
      })
    },
    remove: () => {
      const ID = 'table-headers'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfhdr]').forEach(e => e.removeAttribute('data-cfhdr'))
    },
  },

  {
    id: 'table-layout',
    group: 'Tables',
    label: 'Layout tables',
    description: 'Flag layout tables (role=presentation) and any data-table elements misused inside them',
    criteria: ['05.03', '05.08'],
    legend: [
      { border: `2px solid ${C.caution}`, label: 'layout table (role=presentation/none)' },
      { border: `3px solid ${C.err}`,     label: 'data-table element inside a layout table' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'table-layout'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[data-cflayout]{outline:2px solid #eab308!important}' +
        '[data-cflayout="bad"]{outline:3px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('table[role="presentation"],table[role="none"]').forEach(el => {
        const misused = el.querySelector('th,caption,thead,tfoot,[scope]') || el.hasAttribute('summary')
        el.dataset.cflayout = misused ? 'bad' : 'ok'
        el.insertAdjacentElement('beforebegin', mk(s.layoutTable, 'warn'))
        if (misused) el.insertAdjacentElement('beforebegin', mk(s.dataInLayout, 'err'))
      })
    },
    remove: () => {
      const ID = 'table-layout'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cflayout]').forEach(e => e.removeAttribute('data-cflayout'))
    },
  },

  // ── 6. LINKS ─────────────────────────────────────────────────────────────────

  {
    id: 'links',
    group: 'Links',
    label: 'Links',
    description: 'Audit link types, accessible names and hidden children',
    criteria: ['06.01', '06.02'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'links'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'a[href],a[tabindex="0"],[role="link"]{outline:2px solid #6366f1!important}' +
        'a[onclick],a[href^="javascript"],a[href=""],a[href="#"],a:not([href]){outline:2px dashed #ef4444!important}' +
        'a[tabindex="-1"]{outline:2px solid #f97316!important}' +
        'a *[aria-hidden="true"],[role="link"] *[aria-hidden="true"]{outline:2px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('a,[role="link"]').forEach(el => {
        const role = el.getAttribute('role')
        const ariaLabel = el.getAttribute('aria-label')
        const ariaLabelledby = el.getAttribute('aria-labelledby')
        const href = el.getAttribute('href')
        const tabindex = el.getAttribute('tabindex')

        if (ariaLabel) {
          el.insertAdjacentElement('afterend', mk(`aria-label='${ariaLabel}'`, 'ok'))
        } else if (ariaLabelledby) {
          el.insertAdjacentElement('afterend', mk(`aria-labelledby='${ariaLabelledby}'`, 'info'))
        } else if (role && role !== 'link') {
          el.insertAdjacentElement('afterend', mk(`role='${role}'`, 'warn'))
        } else if (el.tagName.toLowerCase() === 'a' && (href === null || href === '' || href === '#' || (href && href.startsWith('javascript')))) {
          el.insertAdjacentElement('afterend', mk(`${s.badHref}: ${href ?? s.missingHref}`, 'err'))
        } else if (tabindex === '-1') {
          el.insertAdjacentElement('afterend', mk(`tabindex='-1'`, 'warn'))
        }
      })

      document.querySelectorAll('a *[aria-hidden="true"],[role="link"] *[aria-hidden="true"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(s.ariaHiddenInLink, 'err'))
      })
    },
    remove: () => {
      const ID = 'links'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── 7. SCRIPTS ───────────────────────────────────────────────────────────────

  {
    id: 'aria',
    group: 'Scripts',
    label: 'ARIA roles & states',
    description: 'Show ARIA roles and state/property attributes',
    criteria: ['07.01'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'aria'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const EXCLUDED = new Set(['navigation','main','banner','contentinfo','search','heading','img','alert','log','status','progressbar','list','listitem'])
      const ARIA_ATTRS = ['aria-label','aria-labelledby','aria-describedby','aria-expanded','aria-pressed','aria-checked','aria-selected','aria-disabled','aria-required','aria-invalid','aria-live','aria-controls','aria-owns','aria-haspopup','aria-current']

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      const excludedSel = [...EXCLUDED].map(r => `[role="${r}"]`).join(',')
      style.textContent = css +
        `[role]:not(${excludedSel}){outline:2px solid #ef4444!important}` +
        `${ARIA_ATTRS.map(a => `[${a}]`).join(',')}{outline:2px solid #22c55e!important}`
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      const seen = new WeakSet()

      const badge = (el, text, v) => {
        if (seen.has(el)) return
        seen.add(el)
        el.insertAdjacentElement('beforebegin', mk(text, v))
      }

      document.querySelectorAll('[role]').forEach(el => {
        const role = el.getAttribute('role')
        if (EXCLUDED.has(role)) return
        const ariaLabel = el.getAttribute('aria-label')
        const ariaLabelledby = el.getAttribute('aria-labelledby')
        if (ariaLabel) {
          badge(el, `role='${role}' aria-label='${ariaLabel}'`, 'ok')
        } else if (ariaLabelledby) {
          badge(el, `role='${role}' aria-labelledby='${ariaLabelledby}'`, 'ok')
        } else {
          badge(el, `role='${role}'`, 'err')
        }
      })

      document.querySelectorAll('[aria-expanded]').forEach(el => {
        badge(el, `aria-expanded='${el.getAttribute('aria-expanded')}'`, 'info')
      })

      document.querySelectorAll('[aria-pressed]').forEach(el => {
        badge(el, `aria-pressed='${el.getAttribute('aria-pressed')}'`, 'info')
      })

      document.querySelectorAll('[aria-current]').forEach(el => {
        badge(el, `aria-current='${el.getAttribute('aria-current')}'`, 'info')
      })

      document.querySelectorAll('[aria-invalid]').forEach(el => {
        badge(el, `aria-invalid='${el.getAttribute('aria-invalid')}'`, 'err')
      })

      document.querySelectorAll('[aria-required]').forEach(el => {
        badge(el, `aria-required='${el.getAttribute('aria-required')}'`, 'warn')
      })
    },
    remove: () => {
      const ID = 'aria'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'dp-button',
    group: 'Scripts',
    label: 'Design-pattern buttons',
    description: 'Highlight scripted role="button" controls and check focusability and accessible name',
    criteria: ['07.01'],
    legend: [
      { border: `2px solid ${C.ok}`,     label: 'focusable + named — verify key handling' },
      { border: `3px solid ${C.err}`,    label: 'not keyboard-focusable' },
      { border: `3px dashed ${C.err}`,   label: 'no accessible name' },
      { border: `2px solid ${C.info}`,   label: 'aria-disabled' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'dp-button'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      // Only scripted "design pattern" buttons — exclude native <button>/<input>.
      style.textContent = css +
        '[data-cfdp="ok"]{outline:2px solid #22c55e!important}' +
        '[data-cfdp="nofocus"]{outline:3px solid #ef4444!important}' +
        '[data-cfdp="noname"]{outline:3px dashed #ef4444!important}' +
        '[data-cfdp="disabled"]{outline:2px solid #6366f1!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }
      const trunc = (str, n) => str && str.length > n ? str.slice(0, n) + '…' : (str ?? '')

      // role="button" on anything that is not a native button control.
      const DP_SEL = '[role="button"]:not(button):not(input)'

      document.querySelectorAll(DP_SEL).forEach(el => {
        const tabindex = el.getAttribute('tabindex')
        const nativelyFocusable = el.matches('a[href], select, textarea, [contenteditable=""], [contenteditable="true"]')
        const focusable = nativelyFocusable || (tabindex !== null && Number(tabindex) >= 0)

        const ariaLabel = el.getAttribute('aria-label')
        const labelledby = el.getAttribute('aria-labelledby')
        const title = el.getAttribute('title')
        const text = el.textContent?.trim()
        let name = ''
        if (ariaLabel) name = `aria-label="${trunc(ariaLabel, 28)}"`
        else if (labelledby) {
          const refText = labelledby.trim().split(/\s+/).map(r => document.getElementById(r)?.textContent?.trim() ?? r).join(' ')
          name = `aria-labelledby → "${trunc(refText, 26)}"`
        } else if (text) name = `"${trunc(text, 30)}"`
        else if (title) name = `title="${trunc(title, 28)}"`

        // Lead badge shows what the element is, so role hijacking is visible.
        const tag = el.tagName.toLowerCase()
        el.insertAdjacentElement('beforebegin', mk(`<${tag}> role="button"`, 'mute'))

        let state
        if (!name) {
          state = 'noname'
          el.insertAdjacentElement('afterend', mk(s.noAccessibleName, 'err'))
        } else if (!focusable) {
          state = 'nofocus'
          el.insertAdjacentElement('afterend', mk(s.notFocusable, 'err'))
        } else if (el.getAttribute('aria-disabled') === 'true') {
          state = 'disabled'
          el.insertAdjacentElement('afterend', mk(`${name} · aria-disabled`, 'info'))
        } else {
          state = 'ok'
          const tabInfo = tabindex !== null ? ` · tabindex="${tabindex}"` : ''
          el.insertAdjacentElement('afterend', mk(`${name}${tabInfo}`, 'ok'))
        }
        el.setAttribute('data-cfdp', state)
      })
    },
    remove: () => {
      const ID = 'dp-button'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfdp]').forEach(e => e.removeAttribute('data-cfdp'))
    },
  },

  {
    id: 'status',
    group: 'Scripts',
    label: 'Status messages',
    description: 'Show live regions and ARIA status roles',
    criteria: ['07.05'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'status'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[role="alert"]{outline:2px solid #ef4444!important}' +
        '[role="status"]{outline:2px solid #22c55e!important}' +
        '[role="log"]{outline:2px solid #6366f1!important}' +
        '[role="progressbar"]{outline:2px solid #a855f7!important}' +
        '[aria-live]{outline:2px solid #eab308!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('[role="alert"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`role='alert'`, 'err'))
      })
      document.querySelectorAll('[role="status"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`role='status'`, 'ok'))
      })
      document.querySelectorAll('[role="log"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`role='log'`, 'info'))
      })
      document.querySelectorAll('[role="progressbar"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`role='progressbar'`, 'purple'))
      })
      document.querySelectorAll('[aria-live]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`aria-live='${el.getAttribute('aria-live')}'`, 'warn'))
      })
    },
    remove: () => {
      const ID = 'status'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── 8. MANDATORY ELEMENTS ────────────────────────────────────────────────────

  {
    id: 'page-lang',
    group: 'Mandatory elements',
    label: 'Page language',
    description: 'Check the <html> lang attribute is present and looks like a valid language code',
    criteria: ['08.03', '08.04'],
    legend: [
      { border: `2px solid ${C.ok}`,  label: '<html> has a valid-looking lang' },
      { border: `3px solid ${C.err}`, label: 'missing or invalid <html> lang' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'page-lang'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        `[data-cf="${ID}"]{position:fixed!important;top:8px!important;left:8px!important;z-index:2147483647!important}`
      document.head.appendChild(style)

      const lang = document.documentElement.getAttribute('lang')
      // BCP-47-ish: 2–3 letter primary subtag, optional region/script subtags.
      const valid = lang !== null && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(lang.trim())

      const b = document.createElement('span')
      b.dataset.cf = ID
      if (lang === null) {
        b.className = '__cfbadge __cfbadge--err'
        b.textContent = s.pageLangMissing
      } else if (!valid) {
        b.className = '__cfbadge __cfbadge--warn'
        b.textContent = `${s.invalidLangCode} <html lang="${lang}">`
      } else {
        b.className = '__cfbadge __cfbadge--ok'
        b.textContent = `<html lang="${lang}">`
      }
      document.body.insertAdjacentElement('afterbegin', b)
    },
    remove: () => {
      const ID = 'page-lang'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'lang-changes',
    group: 'Mandatory elements',
    label: 'Language changes',
    description: 'Show inline lang attributes that mark a language change and flag invalid codes',
    criteria: ['08.07', '08.08'],
    legend: [
      { border: `2px solid ${C.ok}`,      label: 'inline lang with a valid-looking code' },
      { border: `2px solid ${C.caution}`, label: 'inline lang with an invalid code' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'lang-changes'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        ':not(html)[lang]{outline:2px solid #22c55e!important}' +
        '[data-cflang="bad"]{outline:2px solid #eab308!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('[lang]').forEach(el => {
        if (el.tagName.toLowerCase() === 'html') return
        const lang = el.getAttribute('lang')
        const valid = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(lang.trim())
        if (valid) {
          el.insertAdjacentElement('beforebegin', mk(`lang="${lang}"`, 'ok'))
        } else {
          el.dataset.cflang = 'bad'
          el.insertAdjacentElement('beforebegin', mk(`${s.invalidLangCode} lang="${lang}"`, 'warn'))
        }
      })
    },
    remove: () => {
      const ID = 'lang-changes'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cflang]').forEach(e => e.removeAttribute('data-cflang'))
    },
  },

  {
    id: 'text-direction',
    group: 'Mandatory elements',
    label: 'Reading direction',
    description: 'Show inline dir attributes marking a change of reading direction; flag invalid values',
    criteria: ['08.10'],
    legend: [
      { border: `2px solid ${C.info}`, label: 'dir="ltr" / "rtl" / "auto"' },
      { border: `3px solid ${C.err}`,  label: 'invalid dir value' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'text-direction'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        ':not(html)[dir]{outline:2px solid #6366f1!important}' +
        '[data-cfdir="bad"]{outline:3px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('[dir]').forEach(el => {
        if (el.tagName.toLowerCase() === 'html') return
        const dir = el.getAttribute('dir')
        if (/^(ltr|rtl|auto)$/i.test(dir.trim())) {
          el.insertAdjacentElement('beforebegin', mk(`dir="${dir}"`, 'info'))
        } else {
          el.dataset.cfdir = 'bad'
          el.insertAdjacentElement('beforebegin', mk(`${s.invalidDir} dir="${dir}"`, 'err'))
        }
      })
    },
    remove: () => {
      const ID = 'text-direction'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfdir]').forEach(e => e.removeAttribute('data-cfdir'))
    },
  },

  {
    id: 'tag-misuse',
    group: 'Mandatory elements',
    label: 'Tag misuse',
    description: 'Detect semantic elements used for visual layout only',
    criteria: ['08.09'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'tag-misuse'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'blockquote,q{outline:2px solid #22c55e!important}' +
        'b,i,u{outline:2px solid #eab308!important}' +
        'center,font,marquee,blink{outline:3px solid #ef4444!important}' +
        '[role="none"],[role="presentation"]{outline:2px solid #f97316!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('blockquote,q').forEach(el => {
        const tag = el.tagName.toLowerCase()
        el.insertAdjacentElement('beforebegin', mk(`<${tag}>`, 'ok'))
      })

      document.querySelectorAll('b,i,u').forEach(el => {
        const tag = el.tagName.toLowerCase()
        el.insertAdjacentElement('beforebegin', mk(`<${tag}> — ${s.useSemantic}`, 'warn'))
      })

      document.querySelectorAll('center,font,marquee,blink').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`<${el.tagName.toLowerCase()}> — ${s.deprecated}`, 'err'))
      })

      document.querySelectorAll('[role="none"],[role="presentation"]').forEach(el => {
        const tag = el.tagName.toLowerCase()
        const role = el.getAttribute('role')
        el.insertAdjacentElement('beforebegin', mk(`<${tag} role='${role}'> — ${s.semanticRemoved}`, 'warn'))
      })
    },
    remove: () => {
      const ID = 'tag-misuse'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── 9. INFORMATION STRUCTURE ─────────────────────────────────────────────────

  {
    id: 'headings',
    group: 'Information structure',
    label: 'Headings',
    description: 'Show heading hierarchy and levels',
    criteria: ['09.01'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'headings'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'h1,h2,h3,h4,h5,h6{outline:2px solid #22c55e!important}' +
        '[role="heading"]{outline:2px solid #eab308!important}' +
        'h1[role],h2[role],h3[role],h4[role],h5[role],h6[role]{outline:2px solid #ef4444!important}' +
        'h1[aria-hidden],h2[aria-hidden],h3[aria-hidden],h4[aria-hidden],h5[aria-hidden],h6[aria-hidden]{outline:2px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
        const tag = el.tagName.toLowerCase()
        const role = el.getAttribute('role')
        const ariaHidden = el.getAttribute('aria-hidden')
        if (role) {
          el.insertAdjacentElement('beforebegin', mk(`<${tag} role='${role}'>`, 'err'))
        } else if (ariaHidden !== null) {
          el.insertAdjacentElement('beforebegin', mk(`<${tag} aria-hidden='${ariaHidden}'>`, 'err'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`<${tag}>`, 'ok'))
        }
      })

      document.querySelectorAll('[role="heading"]').forEach(el => {
        if (/^h[1-6]$/i.test(el.tagName)) return
        const level = el.getAttribute('aria-level') ?? ''
        el.insertAdjacentElement('beforebegin', mk(`role='heading' aria-level='${level}'`, 'warn'))
      })
    },
    remove: () => {
      const ID = 'headings'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'document-structure',
    group: 'Information structure',
    label: 'Document structure',
    description: 'Check structural landmark elements for uniqueness and correct use',
    criteria: ['09.02'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'document-structure'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'header,main,footer,nav,aside,section,article{outline:2px solid #6366f1!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      const mainEls = document.querySelectorAll('main')
      const headerEls = [...document.querySelectorAll('header')].filter(el => el.closest('article,section,aside') === null)
      const footerEls = [...document.querySelectorAll('footer')].filter(el => el.closest('article,section,aside') === null)

      document.querySelectorAll('header,main,footer,nav,aside,section,article').forEach(el => {
        const tag = el.tagName.toLowerCase()
        const ariaLabel = el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby') ?? ''
        const label = ariaLabel ? ` (${ariaLabel})` : ''
        let variant = 'ok'
        let note = ''

        if (tag === 'main' && mainEls.length > 1) { variant = 'err'; note = ` — ${s.multipleMain}` }
        else if (tag === 'header' && headerEls.length > 1 && headerEls[0] !== el && !el.closest('article,section,aside')) { variant = 'warn'; note = ` — ${s.duplicate}` }
        else if (tag === 'footer' && footerEls.length > 1 && footerEls[0] !== el && !el.closest('article,section,aside')) { variant = 'warn'; note = ` — ${s.duplicate}` }

        el.insertAdjacentElement('beforebegin', mk(`<${tag}${label}>${note}`, variant))
      })
    },
    remove: () => {
      const ID = 'document-structure'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'lists',
    group: 'Information structure',
    label: 'Lists',
    description: 'Show list elements and role overrides',
    criteria: ['09.03'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'lists'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'ul,ol,dl,[role="list"]{outline:2px solid #22c55e!important}' +
        'li,[role="listitem"]{outline:1px solid #22c55e!important}' +
        'ul[role],ol[role],li[role],dl[role]{outline:2px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('ul,ol,dl').forEach(el => {
        const tag = el.tagName.toLowerCase()
        const role = el.getAttribute('role')
        if (role) {
          el.insertAdjacentElement('beforebegin', mk(`<${tag} role='${role}'>`, 'err'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`<${tag}>`, 'ok'))
        }
      })

      document.querySelectorAll('li').forEach(el => {
        const role = el.getAttribute('role')
        if (role) {
          el.insertAdjacentElement('beforebegin', mk(`<li role='${role}'>`, 'err'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`<li>`, 'mute'))
        }
      })

      document.querySelectorAll('[role="list"]').forEach(el => {
        if (/^(ul|ol|dl)$/i.test(el.tagName)) return
        el.insertAdjacentElement('beforebegin', mk(`role='list'`, 'ok'))
      })

      document.querySelectorAll('[role="listitem"]').forEach(el => {
        if (/^li$/i.test(el.tagName)) return
        el.insertAdjacentElement('beforebegin', mk(`role='listitem'`, 'mute'))
      })
    },
    remove: () => {
      const ID = 'lists'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'citations',
    group: 'Information structure',
    label: 'Citations',
    description: 'Highlight block and inline quotations',
    criteria: ['09.04'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'citations'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'blockquote{outline:2px solid #22c55e!important}' +
        'q{outline:2px solid #6366f1!important}' +
        'cite{outline:2px solid #a855f7!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('blockquote').forEach(el => {
        const cite = el.getAttribute('cite')
        el.insertAdjacentElement('beforebegin', mk(cite ? `<blockquote cite="${cite}">` : `<blockquote>`, 'ok'))
      })

      document.querySelectorAll('q').forEach(el => {
        const cite = el.getAttribute('cite')
        el.insertAdjacentElement('beforebegin', mk(cite ? `<q cite="${cite}">` : `<q>`, 'info'))
      })

      document.querySelectorAll('cite').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`<cite>`, 'purple'))
      })
    },
    remove: () => {
      const ID = 'citations'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── 10. PRESENTATION OF INFORMATION ──────────────────────────────────────────

  {
    id: 'presentation-attrs',
    group: 'Presentation of information',
    label: 'Presentation attributes',
    description: 'Detect deprecated HTML presentation attributes and elements',
    criteria: ['10.01'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'presentation-attrs'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[align],[bgcolor],[color],[face],[hspace],[vspace]{outline:3px solid #ef4444!important}' +
        '[border]:not(img):not(table){outline:2px solid #f97316!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      const PRES_ATTRS = ['align', 'bgcolor', 'color', 'face', 'hspace', 'vspace', 'border']
      const seen = new WeakSet()

      document.querySelectorAll(PRES_ATTRS.map(a => `[${a}]`).join(',')).forEach(el => {
        if (seen.has(el)) return
        seen.add(el)
        const found = PRES_ATTRS.filter(a => el.hasAttribute(a)).map(a => `${a}="${el.getAttribute(a)}"`)
        el.insertAdjacentElement('beforebegin', mk(`${el.tagName.toLowerCase()} ${found.join(' ')}`, 'err'))
      })
    },
    remove: () => {
      const ID = 'presentation-attrs'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'css-content',
    group: 'Presentation of information',
    label: 'CSS generated content',
    description: 'Outline elements with ::before or ::after pseudo-elements carrying content',
    criteria: ['10.02'],
    type: 'css',
    css: `
/* CheckFox: CSS generated content (RAWeb 10.02) */
*::before,
*::after {
  outline: 2px dashed #a855f7 !important;
}
`,
  },

  {
    id: 'no-css',
    group: 'Presentation of information',
    label: 'Disable CSS',
    description: 'Toggle all page stylesheets off to inspect unstyled structure',
    criteria: ['10.03'],
    type: 'js',
    inject: () => {
      Array.from(document.styleSheets).forEach(sheet => {
        if (sheet.ownerNode?.id?.startsWith('__checkfox')) return
        try { sheet.disabled = true } catch (_) {}
      })
      document.documentElement.setAttribute('data-checkfox-nocss', 'on')
    },
    remove: () => {
      Array.from(document.styleSheets).forEach(sheet => {
        if (sheet.ownerNode?.id?.startsWith('__checkfox')) return
        try { sheet.disabled = false } catch (_) {}
      })
      document.documentElement.removeAttribute('data-checkfox-nocss')
    },
  },

  {
    id: 'focus-visible',
    group: 'Presentation of information',
    label: 'Focus visibility',
    description: 'Force a strong focus ring so you can Tab through the page and trace keyboard focus',
    criteria: ['10.07'],
    legend: [
      { border: `3px solid ${C.warn}`, label: 'forced focus outline — Tab to test, compare with the page’s own indicator' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'focus-visible'
      document.getElementById(`__checkfox_${ID}`)?.remove()

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '*:focus{outline:3px solid #f97316!important;outline-offset:2px!important}'
      document.head.appendChild(style)
    },
    remove: () => {
      const ID = 'focus-visible'
      document.getElementById(`__checkfox_${ID}`)?.remove()
    },
  },

  {
    id: 'tab-order',
    group: 'Navigation',
    label: 'Tab order',
    description: 'Show tabindex values; flag positive tabindex that breaks the natural navigation sequence',
    criteria: ['12.08'],
    legend: [
      { border: `3px solid ${C.err}`,     label: 'positive tabindex — breaks tab order' },
      { border: `2px dotted ${C.caution}`, label: 'tabindex="0" — in natural order' },
      { border: `2px dashed ${C.err}`,    label: 'tabindex="-1" — not in tab order' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'tab-order'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[data-cfti="pos"]{outline:3px solid #ef4444!important}' +
        '[data-cfti="zero"]{outline:2px dotted #eab308!important}' +
        '[data-cfti="neg"]{outline:2px dashed #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('[tabindex]').forEach(el => {
        const raw = el.getAttribute('tabindex')
        const n = Number(raw)
        if (n > 0) {
          el.dataset.cfti = 'pos'
          el.insertAdjacentElement('afterend', mk(`${s.breaksTabOrder} (tabindex="${raw}")`, 'err'))
        } else if (n === 0) {
          el.dataset.cfti = 'zero'
          el.insertAdjacentElement('afterend', mk(`tabindex="0"`, 'mute'))
        } else if (n < 0) {
          el.dataset.cfti = 'neg'
          el.insertAdjacentElement('afterend', mk(s.notInTabOrder, 'warn'))
        }
      })
    },
    remove: () => {
      const ID = 'tab-order'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfti]').forEach(e => e.removeAttribute('data-cfti'))
    },
  },

  {
    id: 'hidden',
    group: 'Presentation of information',
    label: 'Hidden content',
    description: 'Reveal hidden and aria-hidden elements',
    criteria: ['10.08'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'hidden'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[hidden]{display:block!important;outline:2px solid #ef4444!important;background:rgba(239,68,68,0.08)!important}' +
        '[aria-hidden="true"]{outline:2px solid #f97316!important;background:rgba(247,115,22,0.08)!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('[hidden]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`hidden`, 'err'))
      })

      document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`aria-hidden='true'`, 'warn'))
      })
    },
    remove: () => {
      const ID = 'hidden'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'text-spacing',
    group: 'Presentation of information',
    label: 'Text spacing',
    description: 'Apply WCAG 1.4.12 text spacing overrides to test reflow',
    criteria: ['10.12'],
    type: 'css',
    css: `
/* CheckFox: text spacing (WCAG 1.4.12) */
* {
  line-height: 1.5em !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p { margin-bottom: 2em !important; }
`,
  },

  // ── 11. FORMS ────────────────────────────────────────────────────────────────

  {
    id: 'form-labels',
    group: 'Forms',
    label: 'Form labels',
    description: 'Check each form field has an accessible label',
    criteria: ['11.01'],
    legend: [
      { border: `2px solid ${C.ok}`,     label: 'label[for] or wrapped in label' },
      { border: `2px solid ${C.purple}`, label: 'aria-label / aria-labelledby' },
      { border: `2px solid ${C.caution}`, label: 'title attribute only' },
      { border: `3px solid ${C.err}`,    label: 'no label found' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'form-labels'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[data-cflabeled="ok"]{outline:2px solid #22c55e!important}' +
        '[data-cflabeled="aria"]{outline:2px solid #a855f7!important}' +
        '[data-cflabeled="title"]{outline:2px solid #eab308!important}' +
        '[data-cflabeled="none"]{outline:3px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }
      const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s ?? '')

      const FIELDS = [
        'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="image"])',
        'select', 'textarea',
        '[role="textbox"],[role="combobox"],[role="listbox"],[role="spinbutton"],[role="slider"],[role="searchbox"]',
      ].join(',')

      document.querySelectorAll(FIELDS).forEach(el => {
        const id = el.id
        const labelledby = el.getAttribute('aria-labelledby')
        const ariaLabel = el.getAttribute('aria-label')
        const title = el.getAttribute('title')

        let labelType, text, variant

        if (labelledby) {
          const refs = labelledby.trim().split(/\s+/)
          const refText = refs.map(r => document.getElementById(r)?.textContent?.trim() ?? r).join(' ')
          labelType = 'aria'; text = `aria-labelledby → "${trunc(refText, 28)}"`; variant = 'purple'
        } else if (ariaLabel) {
          labelType = 'aria'; text = `aria-label="${trunc(ariaLabel, 28)}"`; variant = 'purple'
        } else if (id) {
          const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`)
          if (lbl) { labelType = 'ok'; text = `label[for="${id}"] "${trunc(lbl.textContent.trim(), 22)}"`; variant = 'ok' }
        }

        if (!labelType && el.closest('label')) {
          labelType = 'ok'; text = s.wrappedInLabel; variant = 'ok'
        }
        if (!labelType && title) {
          labelType = 'title'; text = `title="${trunc(title, 28)}"`; variant = 'warn'
        }
        if (!labelType) {
          labelType = 'none'; text = s.noLabel; variant = 'err'
        }

        el.setAttribute('data-cflabeled', labelType)
        el.insertAdjacentElement('beforebegin', mk(text, variant))
      })
    },
    remove: () => {
      const ID = 'form-labels'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cflabeled]').forEach(e => e.removeAttribute('data-cflabeled'))
    },
  },

  {
    id: 'form-groups',
    group: 'Forms',
    label: 'Form groupings',
    description: 'Check related controls are grouped with fieldset or ARIA group role',
    criteria: ['11.05'],
    legend: [
      { border: `2px solid ${C.ok}`,     label: 'fieldset element' },
      { border: `2px solid ${C.purple}`, label: 'role="group" / role="radiogroup"' },
      { border: `3px solid ${C.err}`,    label: 'ungrouped radio/checkbox cluster' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'form-groups'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'fieldset{outline:2px solid #22c55e!important}' +
        '[role="group"]{outline:2px solid #a855f7!important}' +
        '[role="radiogroup"]{outline:2px solid #a855f7!important}' +
        '[data-cfungrouped]{outline:3px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('fieldset').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk('<fieldset>', 'ok'))
      })

      document.querySelectorAll('[role="group"]').forEach(el => {
        if (/^fieldset$/i.test(el.tagName)) return
        el.insertAdjacentElement('beforebegin', mk('role="group"', 'purple'))
      })

      document.querySelectorAll('[role="radiogroup"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk('role="radiogroup"', 'purple'))
      })

      // Detect ungrouped radio/checkbox clusters (same name, not inside a grouping element)
      const GROUP_CTX = 'fieldset,[role="group"],[role="radiogroup"]'
      ;['radio', 'checkbox'].forEach(type => {
        const clusters = {}
        document.querySelectorAll(`input[type="${type}"][name]`).forEach(r => {
          const n = r.getAttribute('name')
          if (!clusters[n]) clusters[n] = []
          clusters[n].push(r)
        })
        for (const [name, inputs] of Object.entries(clusters)) {
          if (inputs.length < 2) continue
          inputs.forEach(r => {
            if (!r.closest(GROUP_CTX)) {
              r.setAttribute('data-cfungrouped', '')
              r.insertAdjacentElement('beforebegin', mk(`${type} name="${name}" — ${s.notGrouped}`, 'err'))
            }
          })
        }
      })
    },
    remove: () => {
      const ID = 'form-groups'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfungrouped]').forEach(e => e.removeAttribute('data-cfungrouped'))
    },
  },

  {
    id: 'form-group-names',
    group: 'Forms',
    label: 'Group names',
    description: 'Check each form group has a legend or accessible name',
    criteria: ['11.06'],
    legend: [
      { border: `2px solid ${C.ok}`,     label: 'group has legend / aria-label' },
      { border: `2px solid ${C.purple}`, label: 'individual field with grouping context' },
      { border: `3px solid ${C.err}`,    label: 'group has no accessible name' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'form-group-names'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'fieldset{outline:2px solid #22c55e!important}' +
        'fieldset:not(:has(legend)){outline:3px solid #ef4444!important}' +
        '[role="group"],[role="radiogroup"]{outline:2px solid #22c55e!important}' +
        '[role="group"]:not([aria-label]):not([aria-labelledby]),' +
        '[role="radiogroup"]:not([aria-label]):not([aria-labelledby]){outline:3px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }
      const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s ?? '')

      document.querySelectorAll('fieldset').forEach(el => {
        const legend = el.querySelector(':scope > legend')
        if (legend) {
          el.insertAdjacentElement('beforebegin', mk(`<fieldset> legend: "${trunc(legend.textContent.trim(), 30)}"`, 'ok'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`<fieldset> — ${s.noLegend}`, 'err'))
        }
      })

      document.querySelectorAll('[role="group"],[role="radiogroup"]').forEach(el => {
        if (/^fieldset$/i.test(el.tagName)) return
        const role = el.getAttribute('role')
        const ariaLabel = el.getAttribute('aria-label')
        const labelledby = el.getAttribute('aria-labelledby')
        if (ariaLabel) {
          el.insertAdjacentElement('beforebegin', mk(`role="${role}" aria-label="${trunc(ariaLabel, 25)}"`, 'ok'))
        } else if (labelledby) {
          const refText = labelledby.trim().split(/\s+/).map(r => document.getElementById(r)?.textContent?.trim() ?? r).join(' ')
          el.insertAdjacentElement('beforebegin', mk(`role="${role}" → "${trunc(refText, 25)}"`, 'ok'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`role="${role}" — ${s.noLabel}`, 'err'))
        }
      })

      // Individual fields outside groups: show any grouping-context attributes
      const GROUP_CTX = 'fieldset,[role="group"],[role="radiogroup"]'
      const FIELD_SEL = [
        'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="image"])',
        'select', 'textarea',
      ].join(',')
      document.querySelectorAll(FIELD_SEL).forEach(el => {
        if (el.closest(GROUP_CTX)) return
        const title = el.getAttribute('title')
        const ariaLabel = el.getAttribute('aria-label')
        const labelledby = el.getAttribute('aria-labelledby')
        const describedby = el.getAttribute('aria-describedby')
        const parts = [
          title && `title="${trunc(title, 20)}"`,
          ariaLabel && `aria-label="${trunc(ariaLabel, 20)}"`,
          labelledby && `aria-labelledby="${labelledby}"`,
          describedby && `aria-describedby="${describedby}"`,
        ].filter(Boolean)
        if (parts.length) el.insertAdjacentElement('beforebegin', mk(parts.join(' '), 'purple'))
      })
    },
    remove: () => {
      const ID = 'form-group-names'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'form-buttons',
    group: 'Forms',
    label: 'Button labels',
    description: 'Show the accessible name source for each button',
    criteria: ['11.09'],
    legend: [
      { border: `2px solid ${C.ok}`,     label: 'aria-label / aria-labelledby' },
      { border: `2px solid ${C.purple}`, label: 'visible text / value attribute' },
      { border: `2px solid ${C.caution}`, label: 'title attribute only' },
      { border: `3px solid ${C.err}`,    label: 'no accessible name' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'form-buttons'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'button,input[type="submit"],input[type="reset"],input[type="button"],input[type="image"],[role="button"]{outline:2px solid #22c55e!important}' +
        '[data-cfbtn="none"]{outline:3px solid #ef4444!important}' +
        '[data-cfbtn="title"]{outline:2px solid #eab308!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }
      const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s ?? '')

      const BTN_SEL = 'button,input[type="submit"],input[type="reset"],input[type="button"],input[type="image"],[role="button"]:not(button)'

      document.querySelectorAll(BTN_SEL).forEach(el => {
        const tag = el.tagName.toLowerCase()
        const ariaLabel = el.getAttribute('aria-label')
        const labelledby = el.getAttribute('aria-labelledby')
        const title = el.getAttribute('title')
        const value = el.getAttribute('value')
        const alt = el.getAttribute('alt')
        const textContent = el.textContent?.trim()

        let btnType, text, variant

        if (ariaLabel) {
          btnType = 'aria'; text = `aria-label="${trunc(ariaLabel, 30)}"`; variant = 'ok'
        } else if (labelledby) {
          const refText = labelledby.trim().split(/\s+/).map(r => document.getElementById(r)?.textContent?.trim() ?? r).join(' ')
          btnType = 'aria'; text = `aria-labelledby → "${trunc(refText, 28)}"`; variant = 'ok'
        } else if (tag === 'input' && el.type === 'image' && alt !== null) {
          btnType = 'alt'; text = `alt="${trunc(alt, 30)}"`; variant = 'purple'
        } else if (tag !== 'input' && textContent) {
          btnType = 'text'; text = `"${trunc(textContent, 32)}"`; variant = 'purple'
        } else if (value) {
          btnType = 'value'; text = `value="${trunc(value, 30)}"`; variant = 'purple'
        } else if (title) {
          btnType = 'title'; text = `title="${trunc(title, 30)}"`; variant = 'warn'
        } else {
          btnType = 'none'; text = s.noAccessibleName; variant = 'err'
        }

        el.setAttribute('data-cfbtn', btnType)
        el.insertAdjacentElement('afterend', mk(text, variant))
      })
    },
    remove: () => {
      const ID = 'form-buttons'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfbtn]').forEach(e => e.removeAttribute('data-cfbtn'))
    },
  },

  {
    id: 'form-autocomplete',
    group: 'Forms',
    label: 'Autocomplete',
    description: 'Show autocomplete attribute values on form fields',
    criteria: ['11.13'],
    legend: [
      { border: `2px solid ${C.purple}`, label: 'autocomplete value present' },
      { border: `2px solid ${C.caution}`, label: 'autocomplete="off"' },
      { border: `2px dotted ${C.info}`,  label: 'no autocomplete attribute' },
    ],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'form-autocomplete'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[data-cfauto="value"]{outline:2px solid #a855f7!important}' +
        '[data-cfauto="off"]{outline:2px solid #eab308!important}' +
        '[data-cfauto="none"]{outline:2px dotted #6366f1!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      const FIELDS = [
        'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="image"]):not([type="range"]):not([type="color"]):not([type="file"])',
        'select', 'textarea',
      ].join(',')

      document.querySelectorAll(FIELDS).forEach(el => {
        const ac = el.getAttribute('autocomplete')
        if (ac === null) {
          el.setAttribute('data-cfauto', 'none')
          el.insertAdjacentElement('beforebegin', mk(s.noAutocomplete, 'mute'))
        } else if (ac === 'off' || ac === '') {
          el.setAttribute('data-cfauto', 'off')
          el.insertAdjacentElement('beforebegin', mk(`autocomplete="${ac || 'off'}"`, 'warn'))
        } else {
          el.setAttribute('data-cfauto', 'value')
          el.insertAdjacentElement('beforebegin', mk(`autocomplete="${ac}"`, 'purple'))
        }
      })
    },
    remove: () => {
      const ID = 'form-autocomplete'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfauto]').forEach(e => e.removeAttribute('data-cfauto'))
    },
  },

  // ── 12. NAVIGATION ───────────────────────────────────────────────────────────

  {
    id: 'landmarks',
    group: 'Navigation',
    label: 'Landmarks',
    description: 'Highlight ARIA landmark roles and structural elements',
    criteria: ['12.06'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'landmarks'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '[role="main"],main{outline:2px solid #6366f1!important}' +
        '[role="banner"],header{outline:2px solid #a855f7!important}' +
        '[role="navigation"],nav{outline:2px solid #22c55e!important}' +
        '[role="search"]{outline:2px solid #f97316!important}' +
        '[role="contentinfo"],footer{outline:2px solid #eab308!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      const seen = new WeakSet()

      const badge = (el, text, v) => {
        if (seen.has(el)) return
        seen.add(el)
        el.insertAdjacentElement('beforebegin', mk(text, v))
      }

      document.querySelectorAll('main,[role="main"]').forEach(el => {
        const hasRole = el.getAttribute('role') === 'main'
        if (el.tagName.toLowerCase() === 'main' && !hasRole) {
          badge(el, `<main — ${s.noRoleMain}>`, 'err')
        } else {
          badge(el, `role='main'`, 'info')
        }
      })

      document.querySelectorAll('header,[role="banner"]').forEach(el => {
        const hasRole = el.getAttribute('role') === 'banner'
        if (el.tagName.toLowerCase() === 'header' && !hasRole) {
          badge(el, `<header — ${s.noRoleBanner}>`, 'err')
        } else {
          badge(el, `role='banner'`, 'purple')
        }
      })

      document.querySelectorAll('nav,[role="navigation"]').forEach(el => {
        const hasRole = el.getAttribute('role') === 'navigation'
        if (el.tagName.toLowerCase() === 'nav' && !hasRole) {
          badge(el, `<nav — ${s.noRoleNav}>`, 'err')
        } else {
          badge(el, `role='navigation'`, 'ok')
        }
      })

      document.querySelectorAll('[role="search"]').forEach(el => {
        badge(el, `role='search'`, 'warn')
      })

      document.querySelectorAll('footer,[role="contentinfo"]').forEach(el => {
        const hasRole = el.getAttribute('role') === 'contentinfo'
        if (el.tagName.toLowerCase() === 'footer' && !hasRole) {
          badge(el, `<footer — ${s.noRoleFooter}>`, 'err')
        } else {
          badge(el, `role='contentinfo'`, 'yellow')
        }
      })
    },
    remove: () => {
      const ID = 'landmarks'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── 13. CONSULTATION ─────────────────────────────────────────────────────────

  {
    id: 'office-docs',
    group: 'Consultation',
    label: 'Office documents',
    description: 'Highlight links to downloadable office and PDF files',
    criteria: ['13.03', '13.04'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css, s) => {
      const ID = 'office-docs'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const EXT_RE = /\.(pdf|docx?|xlsx?|pptx?|od[tsp]|rtf|csv)(\?[^"]*)?$/i

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'a[data-cfext]{outline:2px solid #f97316!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('a[href]').forEach(el => {
        const href = el.getAttribute('href') ?? ''
        const m = href.match(EXT_RE)
        if (!m) return
        el.setAttribute('data-cfext', m[1].toLowerCase())
        el.insertAdjacentElement('afterend', mk(`.${m[1].toLowerCase()} — ${s.checkAccessibleVersion}`, 'warn'))
      })
    },
    remove: () => {
      const ID = 'office-docs'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
      document.querySelectorAll('[data-cfext]').forEach(e => e.removeAttribute('data-cfext'))
    },
  },

  // ── CUSTOM ───────────────────────────────────────────────────────────────────

  {
    id: 'custom',
    group: 'Custom',
    label: 'Custom CSS',
    description: 'Inject your own CSS into the page',
    criteria: [],
    type: 'custom',
  },
]

export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.id, t]))
export const TOOL_GROUPS = [...new Set(TOOLS.map(t => t.group))]
