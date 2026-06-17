// CodeMirror 6 CSS editor for the Custom CSS tool.
// Provides syntax highlighting, CSS property/value autocompletion (via
// @codemirror/lang-css), line numbers, bracket matching and a dark theme.

import { EditorView, basicSetup } from 'codemirror'
import { keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'

/**
 * Create a CSS code editor inside `parent`.
 *
 * @param {object}   opts
 * @param {Element}  opts.parent       container to mount into
 * @param {string}   [opts.doc]        initial content
 * @param {string}   [opts.placeholder]
 * @param {Function} [opts.onApply]    called on Cmd/Ctrl+Enter
 * @returns {EditorView}
 */
export function createCssEditor({ parent, doc = '', placeholder = '', onApply }) {
  return new EditorView({
    doc,
    parent,
    extensions: [
      basicSetup,
      css(),
      oneDark,
      EditorView.lineWrapping,
      cmPlaceholder(placeholder),
      keymap.of([
        { key: 'Mod-Enter', preventDefault: true, run: () => { onApply?.(); return true } },
      ]),
      EditorView.theme({
        '&': { height: '100%', fontSize: '12px' },
        '.cm-scroller': { fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace' },
      }),
    ],
  })
}
