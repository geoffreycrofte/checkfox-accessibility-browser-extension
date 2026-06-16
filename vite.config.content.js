import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Copies axe-core's pre-built minified bundle instead of re-bundling it,
// keeping the runner chunk small and avoiding the 500 kB warning.
const copyAxeCore = {
  name: 'copy-axe-core',
  closeBundle() {
    mkdirSync(resolve(__dirname, 'dist/content'), { recursive: true })
    copyFileSync(
      resolve(__dirname, 'node_modules/axe-core/axe.min.js'),
      resolve(__dirname, 'dist/content/axe-core.js'),
    )
  },
}

export default defineConfig({
  // The main build already copies public/ → dist/. Disable it here so this
  // second pass doesn't re-copy public assets (and a stray .DS_Store) on top.
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content/axe-runner.js'),
      external: ['axe-core'],
      output: {
        entryFileNames: 'content/[name].js',
        format: 'iife',
        name: 'CheckFoxAxeRunner',
        inlineDynamicImports: true,
        globals: { 'axe-core': 'axe' },
      },
    },
  },
  plugins: [copyAxeCore],
})
