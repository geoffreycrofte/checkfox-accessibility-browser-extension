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

  // ── STRUCTURE ────────────────────────────────────────────────────────────────

  {
    id: 'headings',
    group: 'Structure',
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
    id: 'landmarks',
    group: 'Structure',
    label: 'Landmarks',
    description: 'Highlight ARIA landmark roles and structural elements',
    criteria: ['12.06'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
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
          badge(el, `<main — no role='main'>`, 'err')
        } else {
          badge(el, `role='main'`, 'info')
        }
      })

      document.querySelectorAll('header,[role="banner"]').forEach(el => {
        const hasRole = el.getAttribute('role') === 'banner'
        if (el.tagName.toLowerCase() === 'header' && !hasRole) {
          badge(el, `<header — no role='banner'>`, 'err')
        } else {
          badge(el, `role='banner'`, 'purple')
        }
      })

      document.querySelectorAll('nav,[role="navigation"]').forEach(el => {
        const hasRole = el.getAttribute('role') === 'navigation'
        if (el.tagName.toLowerCase() === 'nav' && !hasRole) {
          badge(el, `<nav — no role='navigation'>`, 'err')
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
          badge(el, `<footer — no role='contentinfo'>`, 'err')
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

  {
    id: 'lists',
    group: 'Structure',
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
    id: 'tables',
    group: 'Structure',
    label: 'Tables',
    description: 'Highlight tables, headers, captions and scope attributes',
    criteria: ['05.01', '05.02', '05.03', '05.04'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'tables'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'table,[role="table"]{outline:2px solid #22c55e!important}' +
        'th,[role="columnheader"],[role="rowheader"]{outline:2px solid #a855f7!important}' +
        'caption{outline:2px solid #6366f1!important}' +
        'table[role]{outline:2px solid #ef4444!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('table').forEach(el => {
        const role = el.getAttribute('role')
        const summary = el.getAttribute('summary')
        if (role) {
          el.insertAdjacentElement('beforebegin', mk(`<table role='${role}'>`, 'err'))
        } else if (summary !== null) {
          el.insertAdjacentElement('beforebegin', mk(`table summary='${summary}'`, 'warn'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`table`, 'ok'))
        }
      })

      document.querySelectorAll('[role="table"]').forEach(el => {
        if (/^table$/i.test(el.tagName)) return
        el.insertAdjacentElement('beforebegin', mk(`role='table'`, 'ok'))
      })

      document.querySelectorAll('th,[role="columnheader"],[role="rowheader"]').forEach(el => {
        const scope = el.getAttribute('scope') ?? 'none'
        el.insertAdjacentElement('beforebegin', mk(`th scope='${scope}'`, 'purple'))
      })

      document.querySelectorAll('caption').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`caption`, 'info'))
      })
    },
    remove: () => {
      const ID = 'tables'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  // ── CONTENT ──────────────────────────────────────────────────────────────────

  {
    id: 'images',
    group: 'Content',
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
    inject: (css) => {
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
          badge = mk('ALT MISSING', 'err')
        } else if (alt === '') {
          badge = mk('alt="" (decorative)', 'mute')
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

  {
    id: 'links',
    group: 'Content',
    label: 'Links',
    description: 'Audit link types, accessible names and hidden children',
    criteria: ['06.01', '06.02'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
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
          el.insertAdjacentElement('afterend', mk(`bad href: ${href ?? 'missing'}`, 'err'))
        } else if (tabindex === '-1') {
          el.insertAdjacentElement('afterend', mk(`tabindex='-1'`, 'warn'))
        }
      })

      document.querySelectorAll('a *[aria-hidden="true"],[role="link"] *[aria-hidden="true"]').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`aria-hidden inside link`, 'err'))
      })
    },
    remove: () => {
      const ID = 'links'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'lang',
    group: 'Content',
    label: 'Language',
    description: 'Show lang and dir attribute values on all elements',
    criteria: ['08.03', '08.04', '08.07', '08.08', '08.10'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'lang'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        ':not(html)[lang]{outline:2px solid #22c55e!important}' +
        ':not(html)[dir]{outline:2px solid #6366f1!important}'
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
        el.insertAdjacentElement('beforebegin', mk(`lang='${el.getAttribute('lang')}'`, 'ok'))
      })

      document.querySelectorAll('[dir]').forEach(el => {
        if (el.tagName.toLowerCase() === 'html') return
        el.insertAdjacentElement('beforebegin', mk(`dir='${el.getAttribute('dir')}'`, 'info'))
      })
    },
    remove: () => {
      const ID = 'lang'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'hidden',
    group: 'Content',
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

  // ── INTERACTION ──────────────────────────────────────────────────────────────

  {
    id: 'focus',
    group: 'Interaction',
    label: 'Focus / Tab order',
    description: 'Highlight focus ring and tabindex values on interactive elements',
    criteria: ['10.07', '12.08'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'focus'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        '*:focus{outline:3px solid #f97316!important;outline-offset:2px!important}' +
        'a[tabindex],button[tabindex],input[tabindex],select[tabindex],textarea[tabindex],[role="button"][tabindex],[role="link"][tabindex]{outline:2px solid #ef4444!important}' +
        'a[tabindex="-1"],button[tabindex="-1"],input[tabindex="-1"],select[tabindex="-1"],textarea[tabindex="-1"],[role="button"][tabindex="-1"],[role="link"][tabindex="-1"]{outline:2px dashed #ef4444!important}' +
        'a[tabindex="0"],button[tabindex="0"],input[tabindex="0"],select[tabindex="0"],textarea[tabindex="0"]{outline:2px dotted #eab308!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      const sel = 'a[tabindex],button[tabindex],input[tabindex],select[tabindex],textarea[tabindex],[role="button"][tabindex],[role="link"][tabindex]'
      document.querySelectorAll(sel).forEach(el => {
        el.insertAdjacentElement('afterend', mk(`tabindex='${el.getAttribute('tabindex')}'`, 'err'))
      })
    },
    remove: () => {
      const ID = 'focus'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'aria',
    group: 'Interaction',
    label: 'ARIA roles & states',
    description: 'Show ARIA roles and state/property attributes',
    criteria: ['07.01', '07.02', '07.03'],
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
    id: 'forms',
    group: 'Interaction',
    label: 'Forms & buttons',
    description: 'Audit labels, fieldsets, button accessible names',
    criteria: ['11.01', '11.05', '11.09'],
    type: 'js',
    args: [SHARED_CSS],
    inject: (css) => {
      const ID = 'forms'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())

      const style = document.createElement('style')
      style.id = `__checkfox_${ID}`
      style.textContent = css +
        'label{outline:2px solid #22c55e!important}' +
        'label:not([for]){outline:2px solid #f97316!important}' +
        'input:not([aria-label]):not([title]):not([id]){outline:2px solid #ef4444!important}' +
        'input[aria-label],input[title],input[id]{outline:2px solid #22c55e!important}' +
        'fieldset{outline:2px solid #22c55e!important}' +
        'fieldset:not(:has(legend)){outline:2px solid #ef4444!important}' +
        'legend{outline:2px solid #22c55e!important}' +
        '[role="group"]:not([aria-label]):not([aria-labelledby]){outline:2px solid #ef4444!important}' +
        '[role="group"][aria-label],[role="group"][aria-labelledby]{outline:2px solid #22c55e!important}' +
        'button{outline:2px solid #22c55e!important}' +
        'button[role]:not([role="button"]){outline:2px solid #ef4444!important}' +
        '[role="button"]{outline:2px dashed #f97316!important}'
      document.head.appendChild(style)

      const mk = (text, v) => {
        const b = document.createElement('span')
        b.className = `__cfbadge __cfbadge--${v}`
        b.dataset.cf = ID
        b.textContent = text
        return b
      }

      document.querySelectorAll('label').forEach(el => {
        const forAttr = el.getAttribute('for')
        if (forAttr) {
          el.insertAdjacentElement('beforebegin', mk(`<label for='${forAttr}'>`, 'ok'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`<label — no [for]>`, 'warn'))
        }
      })

      document.querySelectorAll('fieldset').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`<fieldset>`, 'ok'))
      })

      document.querySelectorAll('legend').forEach(el => {
        el.insertAdjacentElement('beforebegin', mk(`<legend>`, 'ok'))
      })

      document.querySelectorAll('[role="group"]').forEach(el => {
        const ariaLabel = el.getAttribute('aria-label')
        const ariaLabelledby = el.getAttribute('aria-labelledby')
        if (ariaLabel) {
          el.insertAdjacentElement('beforebegin', mk(`role='group' aria-label='${ariaLabel}'`, 'ok'))
        } else if (ariaLabelledby) {
          el.insertAdjacentElement('beforebegin', mk(`role='group' aria-labelledby='${ariaLabelledby}'`, 'ok'))
        } else {
          el.insertAdjacentElement('beforebegin', mk(`role='group' — NO LABEL`, 'err'))
        }
      })

      document.querySelectorAll('button').forEach(el => {
        const role = el.getAttribute('role')
        const ariaLabel = el.getAttribute('aria-label')
        if (role && role !== 'button') {
          el.insertAdjacentElement('afterend', mk(`<button role='${role}'>`, 'err'))
        } else if (ariaLabel) {
          el.insertAdjacentElement('afterend', mk(`<button aria-label='${ariaLabel}'>`, 'ok'))
        } else {
          el.insertAdjacentElement('afterend', mk(`<button>`, 'ok'))
        }
      })

      document.querySelectorAll('[role="button"]').forEach(el => {
        if (/^button$/i.test(el.tagName)) return
        el.insertAdjacentElement('afterend', mk(`role='button'`, 'warn'))
      })
    },
    remove: () => {
      const ID = 'forms'
      document.getElementById(`__checkfox_${ID}`)?.remove()
      document.querySelectorAll(`[data-cf="${ID}"]`).forEach(e => e.remove())
    },
  },

  {
    id: 'status',
    group: 'Interaction',
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

  // ── PRESENTATION ─────────────────────────────────────────────────────────────

  {
    id: 'text-spacing',
    group: 'Presentation',
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

  {
    id: 'no-css',
    group: 'Presentation',
    label: 'Disable CSS',
    description: 'Toggle all page stylesheets off to inspect unstyled structure',
    criteria: [],
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
    id: 'custom',
    group: 'Presentation',
    label: 'Custom CSS',
    description: 'Inject your own CSS into the page',
    criteria: [],
    type: 'custom',
  },
]

export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.id, t]))
export const TOOL_GROUPS = [...new Set(TOOLS.map(t => t.group))]
