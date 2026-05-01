// ─── Shared label style fragments ────────────────────────────────────────────
// Applied to ::before / ::after pseudo-elements in injected CSS.
// Replaces the raw sans-serif / colored-background labels from the Stylus originals.

const B = 'font-family: ui-monospace, "Cascadia Code", "Fira Code", monospace !important; font-size: 11px !important; font-weight: 600 !important; line-height: 1.5 !important; padding: 2px 8px !important; border-radius: 4px !important; display: block !important; width: max-content !important; max-width: 100% !important; margin-bottom: 2px !important;'

const OK   = `${B} background: #052e16 !important; color: #86efac !important; border: 1px solid #14532d !important;`
const ERR  = `${B} background: #3b1010 !important; color: #fca5a5 !important; border: 1px solid #7f1d1d !important;`
const WARN = `${B} background: #431407 !important; color: #fed7aa !important; border: 1px solid #78350f !important;`
const INFO = `${B} background: #1e1b4b !important; color: #a5b4fc !important; border: 1px solid #3730a3 !important;`
const MUTE = `${B} background: #262636 !important; color: #9898b0 !important; border: 1px solid #3a3a52 !important;`

// Outline colours (replaces raw green/red/blue/orange/yellow/purple)
const C = {
  ok:    '#22c55e',
  err:   '#ef4444',
  warn:  '#f97316',
  caution: '#eab308',
  info:  '#6366f1',
  purple:'#a855f7',
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const TOOLS = [

  // ── STRUCTURE ────────────────────────────────────────────────────────────────

  {
    id: 'headings',
    group: 'Structure',
    label: 'Headings',
    description: 'Show heading hierarchy and levels',
    criteria: ['09.01'],
    type: 'css',
    css: `
/* CheckFox: headings */
h1,h2,h3,h4,h5,h6 { outline: 2px solid ${C.ok} !important; }
[role="heading"]   { outline: 2px solid ${C.caution} !important; }
h1[role],h2[role],h3[role],h4[role],h5[role],h6[role] { outline: 2px solid ${C.err} !important; }
h1[aria-hidden],h2[aria-hidden],h3[aria-hidden],h4[aria-hidden],h5[aria-hidden],h6[aria-hidden] { outline: 2px solid ${C.err} !important; }

h1::before { content: "<h1>"; ${OK} }
h2::before { content: "<h2>"; ${OK} }
h3::before { content: "<h3>"; ${OK} }
h4::before { content: "<h4>"; ${OK} }
h5::before { content: "<h5>"; ${OK} }
h6::before { content: "<h6>"; ${OK} }

[role="heading"]::before { content: "role='heading' aria-level='" attr(aria-level) "'"; ${WARN} }

h1[role]::before { content: "<h1 role='" attr(role) "'>"; ${ERR} }
h2[role]::before { content: "<h2 role='" attr(role) "'>"; ${ERR} }
h3[role]::before { content: "<h3 role='" attr(role) "'>"; ${ERR} }
h4[role]::before { content: "<h4 role='" attr(role) "'>"; ${ERR} }
h5[role]::before { content: "<h5 role='" attr(role) "'>"; ${ERR} }
h6[role]::before { content: "<h6 role='" attr(role) "'>"; ${ERR} }

h1[aria-hidden]::before { content: "<h1 aria-hidden='" attr(aria-hidden) "'>"; ${ERR} }
h2[aria-hidden]::before { content: "<h2 aria-hidden='" attr(aria-hidden) "'>"; ${ERR} }
h3[aria-hidden]::before { content: "<h3 aria-hidden='" attr(aria-hidden) "'>"; ${ERR} }
h4[aria-hidden]::before { content: "<h4 aria-hidden='" attr(aria-hidden) "'>"; ${ERR} }
h5[aria-hidden]::before { content: "<h5 aria-hidden='" attr(aria-hidden) "'>"; ${ERR} }
h6[aria-hidden]::before { content: "<h6 aria-hidden='" attr(aria-hidden) "'>"; ${ERR} }
`,
  },

  {
    id: 'landmarks',
    group: 'Structure',
    label: 'Landmarks',
    description: 'Highlight ARIA landmark roles and structural elements',
    criteria: ['12.06'],
    type: 'css',
    css: `
/* CheckFox: landmarks */
[role="main"],main         { outline: 2px solid ${C.info} !important; }
[role="banner"],header     { outline: 2px solid ${C.purple} !important; }
[role="navigation"],nav    { outline: 2px solid ${C.ok} !important; }
[role="search"]            { outline: 2px solid ${C.warn} !important; }
[role="contentinfo"],footer{ outline: 2px solid ${C.caution} !important; }

[role="main"]::before,main::before         { content: "role='main'";        ${INFO} }
[role="banner"]::before,header::before     { content: "role='banner'";      ${B} background:#3b0764!important;color:#e9d5ff!important;border:1px solid #7e22ce!important; }
[role="navigation"]::before,nav::before   { content: "role='navigation'";  ${OK} }
[role="search"]::before                   { content: "role='search'";       ${WARN} }
[role="contentinfo"]::before,footer::before { content: "role='contentinfo'"; ${B} background:#2d2200!important;color:#fcd34d!important;border:1px solid #78350f!important; }

/* Unroles: semantic element without matching ARIA role */
header:not([role="banner"])::before   { content: "<header — no role='banner'>"; ${ERR} }
nav:not([role="navigation"])::before  { content: "<nav — no role='navigation'>"; ${ERR} }
main:not([role="main"])::before       { content: "<main — no role='main'>"; ${ERR} }
footer:not([role="contentinfo"])::before { content: "<footer — no role='contentinfo'>"; ${ERR} }
`,
  },

  {
    id: 'lists',
    group: 'Structure',
    label: 'Lists',
    description: 'Show list elements and role overrides',
    criteria: ['09.03'],
    type: 'css',
    css: `
/* CheckFox: lists */
ul,ol,dl,[role="list"] { outline: 2px solid ${C.ok} !important; }
li,[role="listitem"]    { outline: 1px solid ${C.ok} !important; }
ul[role],ol[role],li[role],dl[role] { outline: 2px solid ${C.err} !important; }

ul::before                { content: "<ul>"; ${OK} }
ol::before                { content: "<ol>"; ${OK} }
dl::before                { content: "<dl>"; ${OK} }
li::before                { content: "<li>"; ${MUTE} }
[role="list"]::before     { content: "role='list'"; ${OK} }
[role="listitem"]::before { content: "role='listitem'"; ${MUTE} }

ul[role]::before { content: "<ul role='" attr(role) "'>"; ${ERR} }
ol[role]::before { content: "<ol role='" attr(role) "'>"; ${ERR} }
li[role]::before { content: "<li role='" attr(role) "'>"; ${ERR} }
dl[role]::before { content: "<dl role='" attr(role) "'>"; ${ERR} }
`,
  },

  {
    id: 'tables',
    group: 'Structure',
    label: 'Tables',
    description: 'Highlight tables, headers, captions and scope attributes',
    criteria: ['05.01', '05.02', '05.03', '05.04'],
    type: 'css',
    css: `
/* CheckFox: tables */
table,[role="table"] { outline: 2px solid ${C.ok} !important; }
th,[role="columnheader"],[role="rowheader"] { outline: 2px solid ${C.purple} !important; }
caption { outline: 2px solid ${C.info} !important; }
table[role]::after { content: "<table role='" attr(role) "'>"; ${ERR} }

table::before,[role="table"]::before { content: "table"; ${OK} }
table[summary]::before { content: "table summary='" attr(summary) "'"; ${WARN} }

th::before,[role="columnheader"]::before,[role="rowheader"]::before {
  content: "th scope='" attr(scope) "'"; ${B} background:#3b0764!important;color:#e9d5ff!important;border:1px solid #7e22ce!important;
}
caption::before { content: "caption"; ${INFO} }
`,
  },

  // ── CONTENT ──────────────────────────────────────────────────────────────────

  {
    id: 'images',
    group: 'Content',
    label: 'Images',
    description: 'Show alt text and flag missing or decorative attributes',
    criteria: ['01.01', '01.02', '01.03'],
    type: 'css',
    css: `
/* CheckFox: images */
img                      { outline: 2px solid ${C.purple} !important; max-width: 150px; }
img:not([alt])           { outline: 3px solid ${C.err} !important; }
img[alt=""]              { outline: 2px solid ${C.ok} !important; }
svg                      { outline: 2px solid ${C.ok} !important; max-width: 150px; }
svg[aria-hidden="true"]  { outline: 2px dashed ${C.ok} !important; }
[role="img"]             { outline: 2px solid ${C.purple} !important; }
[role="img"][aria-hidden="true"] { outline: 2px dashed ${C.purple} !important; }
area                     { outline: 2px solid ${C.warn} !important; }
input[type="image"]      { outline: 2px solid ${C.purple} !important; }

img:not([alt])::before           { content: "img — ALT MISSING"; ${ERR} }
img[alt=""]::before              { content: "img alt='' (decorative)"; ${OK} }
img[alt]:not([alt=""])::before   { content: "alt='" attr(alt) "'"; ${OK} }
svg[role="img"]::before          { content: "svg role='img' — " attr(aria-label); ${OK} }
svg[aria-hidden="true"]::before  { content: "svg aria-hidden='true' (decorative)"; ${MUTE} }
[role="img"][aria-label]::before { content: "role='img' aria-label='" attr(aria-label) "'"; ${OK} }
[role="img"]:not([aria-label]):not([aria-labelledby])::before { content: "role='img' — NO LABEL"; ${ERR} }
`,
  },

  {
    id: 'links',
    group: 'Content',
    label: 'Links',
    description: 'Audit link types, accessible names and hidden children',
    criteria: ['06.01', '06.02'],
    type: 'css',
    css: `
/* CheckFox: links */
a[href],a[tabindex="0"],a[role="link"],[role="link"] { outline: 2px solid ${C.info} !important; }
a[onclick],a[href^="javascript"],a[href=""],a[href="#"],a:not([href]) { outline: 2px dashed ${C.err} !important; }
a[tabindex="-1"] { outline: 2px solid ${C.warn} !important; }

a[role]::before,[role="link"]::before { content: "role='" attr(role) "'"; ${WARN} }
a[aria-label]::before,[role="link"][aria-label]::before { content: "aria-label='" attr(aria-label) "'"; ${OK} }
a[aria-labelledby]::before { content: "aria-labelledby='" attr(aria-labelledby) "'"; ${INFO} }
a[aria-describedby]::before { content: "aria-describedby='" attr(aria-describedby) "'"; ${MUTE} }

a *[aria-hidden="true"],a *[hidden],[role="link"] *[aria-hidden="true"] {
  outline: 2px solid ${C.err} !important;
}
a *[aria-hidden="true"]::before,[role="link"] *[aria-hidden="true"]::before {
  content: "aria-hidden='true' inside link"; ${ERR}
}

/* Images inside links */
a img,a svg,a [role="img"],[role="link"] img,[role="link"] svg { outline: 2px solid ${C.err} !important; }
`,
  },

  {
    id: 'lang',
    group: 'Content',
    label: 'Language',
    description: 'Show lang and dir attribute values on all elements',
    criteria: ['08.03', '08.04', '08.07', '08.08', '08.10'],
    type: 'css',
    css: `
/* CheckFox: language */
:not(html)[lang] { outline: 2px solid ${C.ok} !important; }
:not(html)[lang]::before { content: "lang='" attr(lang) "'"; ${OK} }

:not(html)[dir] { outline: 2px solid ${C.info} !important; }
:not(html)[dir]::before { content: "dir='" attr(dir) "'"; ${INFO} }
`,
  },

  {
    id: 'hidden',
    group: 'Content',
    label: 'Hidden content',
    description: 'Reveal hidden and aria-hidden elements',
    criteria: ['10.08'],
    type: 'css',
    css: `
/* CheckFox: hidden content */
[hidden]          { outline: 2px solid ${C.err} !important; background: rgba(239,68,68,0.08) !important; }
[aria-hidden="true"] { outline: 2px solid ${C.warn} !important; background: rgba(247,115,22,0.08) !important; }

[hidden]::before          { content: "hidden"; ${ERR} }
[aria-hidden="true"]::before { content: "aria-hidden='" attr(aria-hidden) "'"; ${WARN} }
`,
  },

  // ── INTERACTION ──────────────────────────────────────────────────────────────

  {
    id: 'focus',
    group: 'Interaction',
    label: 'Focus / Tab order',
    description: 'Highlight focus ring and tabindex values on interactive elements',
    criteria: ['10.07', '12.08'],
    type: 'css',
    css: `
/* CheckFox: focus / tab order */
*:focus { outline: 3px solid ${C.warn} !important; outline-offset: 2px !important; }

a[tabindex],button[tabindex],input[tabindex],select[tabindex],textarea[tabindex],[role="button"][tabindex],[role="link"][tabindex] {
  outline: 2px solid ${C.err} !important;
}
a[tabindex="-1"],button[tabindex="-1"],input[tabindex="-1"],select[tabindex="-1"],textarea[tabindex="-1"],[role="button"][tabindex="-1"],[role="link"][tabindex="-1"] {
  outline: 2px dashed ${C.err} !important;
}
a[tabindex="0"],button[tabindex="0"],input[tabindex="0"],select[tabindex="0"],textarea[tabindex="0"] {
  outline: 2px dotted ${C.caution} !important;
}

a[tabindex]::after,button[tabindex]::after,input[tabindex]::after,select[tabindex]::after,textarea[tabindex]::after,[role="button"][tabindex]::after,[role="link"][tabindex]::after {
  content: "tabindex='" attr(tabindex) "'"; ${ERR}
}
`,
  },

  {
    id: 'aria',
    group: 'Interaction',
    label: 'ARIA roles & states',
    description: 'Show ARIA roles and state/property attributes',
    criteria: ['07.01', '07.02', '07.03'],
    type: 'css',
    css: `
/* CheckFox: ARIA roles & states */
[role]:not([role="navigation"],[role="main"],[role="banner"],[role="contentinfo"],[role="search"],[role="heading"],[role="img"],[role="alert"],[role="log"],[role="status"],[role="progressbar"],[role="list"],[role="listitem"]) {
  outline: 2px solid ${C.err} !important;
}
[aria-label],[aria-labelledby],[aria-describedby],[aria-expanded],[aria-pressed],[aria-checked],[aria-selected],[aria-disabled],[aria-required],[aria-invalid],[aria-live],[aria-controls],[aria-owns],[aria-haspopup],[aria-current] {
  outline: 2px solid ${C.ok} !important;
}

[role]:not([role="navigation"],[role="main"],[role="banner"],[role="contentinfo"],[role="search"],[role="heading"],[role="img"],[role="alert"],[role="log"],[role="status"],[role="progressbar"],[role="list"],[role="listitem"])::before {
  content: "role='" attr(role) "'"; ${ERR}
}
[role][aria-label]:not([role="navigation"],[role="main"],[role="banner"],[role="contentinfo"],[role="search"])::before {
  content: "role='" attr(role) "' aria-label='" attr(aria-label) "'"; ${OK}
}
[role][aria-labelledby]:not([role="navigation"],[role="main"],[role="banner"],[role="contentinfo"],[role="search"])::before {
  content: "role='" attr(role) "' aria-labelledby='" attr(aria-labelledby) "'"; ${OK}
}
:not([role])[aria-label]::before   { content: "aria-label='" attr(aria-label) "'"; ${OK} }
:not([role])[aria-expanded]::before { content: "aria-expanded='" attr(aria-expanded) "'"; ${INFO} }
:not([role])[aria-pressed]::before  { content: "aria-pressed='" attr(aria-pressed) "'"; ${INFO} }
:not([role])[aria-current]::before  { content: "aria-current='" attr(aria-current) "'"; ${INFO} }
:not([role])[aria-invalid]::before  { content: "aria-invalid='" attr(aria-invalid) "'"; ${ERR} }
:not([role])[aria-required]::before { content: "aria-required='" attr(aria-required) "'"; ${WARN} }
`,
  },

  {
    id: 'forms',
    group: 'Interaction',
    label: 'Forms & buttons',
    description: 'Audit labels, fieldsets, button accessible names',
    criteria: ['11.01', '11.05', '11.09'],
    type: 'css',
    css: `
/* CheckFox: forms & buttons */
/* Labels */
label               { outline: 2px solid ${C.ok} !important; }
label:not([for])    { outline: 2px solid ${C.warn} !important; }
input:not([aria-label]):not([title]):not([id])  { outline: 2px solid ${C.err} !important; }
input[aria-label],input[title],input[id]        { outline: 2px solid ${C.ok} !important; }

/* Fieldsets */
fieldset            { outline: 2px solid ${C.ok} !important; }
fieldset:not(:has(legend)) { outline: 2px solid ${C.err} !important; }
fieldset > :first-child:not(legend) { outline: 3px solid ${C.err} !important; }
legend              { outline: 2px solid ${C.ok} !important; }
[role="group"]:not([aria-label]):not([aria-labelledby]) { outline: 2px solid ${C.err} !important; }
[role="group"][aria-label],[role="group"][aria-labelledby] { outline: 2px solid ${C.ok} !important; }

label::before           { content: "<label for='" attr(for) "'>"; ${OK} }
label:not([for])::before{ content: "<label — no [for]>"; ${WARN} }
fieldset::after         { content: "<fieldset>"; ${OK} }
legend::before          { content: "<legend>"; ${OK} }
[role="group"]::after                         { content: "role='group' — NO LABEL"; ${ERR} }
[role="group"][aria-label]::after             { content: "role='group' aria-label='" attr(aria-label) "'"; ${OK} }
[role="group"][aria-labelledby]::after        { content: "role='group' aria-labelledby='" attr(aria-labelledby) "'"; ${OK} }

/* Buttons */
button { outline: 2px solid ${C.ok} !important; }
button[role]:not([role="button"]) { outline: 2px solid ${C.err} !important; }
[role="button"] { outline: 2px dashed ${C.warn} !important; }
button[tabindex="-1"],[role="button"][tabindex="-1"] { outline: 2px solid ${C.warn} !important; }

button::before                        { content: "<button>"; ${OK} }
button[aria-label]::before            { content: "<button aria-label='" attr(aria-label) "'>"; ${OK} }
button[aria-labelledby]::before       { content: "<button aria-labelledby='" attr(aria-labelledby) "'>"; ${OK} }
button[role]:not([role="button"])::before { content: "<button role='" attr(role) "'>"; ${ERR} }
[role="button"]::before               { content: "role='button'"; ${WARN} }
[role="button"][aria-label]::before   { content: "role='button' aria-label='" attr(aria-label) "'"; ${OK} }
`,
  },

  {
    id: 'status',
    group: 'Interaction',
    label: 'Status messages',
    description: 'Show live regions and ARIA status roles',
    criteria: ['07.05'],
    type: 'css',
    css: `
/* CheckFox: status messages */
[role="alert"]       { outline: 2px solid ${C.err} !important; }
[role="status"]      { outline: 2px solid ${C.ok} !important; }
[role="log"]         { outline: 2px solid ${C.info} !important; }
[role="progressbar"] { outline: 2px solid ${C.purple} !important; }
[aria-live]          { outline: 2px solid ${C.caution} !important; }

[role="alert"]::before       { content: "role='alert'"; ${ERR} }
[role="status"]::before      { content: "role='status'"; ${OK} }
[role="log"]::before         { content: "role='log'"; ${INFO} }
[role="progressbar"]::before { content: "role='progressbar'"; ${B} background:#3b0764!important;color:#e9d5ff!important;border:1px solid #7e22ce!important; }
[aria-live]::before          { content: "aria-live='" attr(aria-live) "'"; ${WARN} }
`,
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
    // inject / remove are called with (tabId, active) by the popup
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
