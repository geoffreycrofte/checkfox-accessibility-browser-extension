import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Builds the content script as a self-contained IIFE that bundles axe-core.
// IIFE is required because content scripts run as classic scripts (not ES modules)
// unless the extension explicitly opts in to module content scripts — IIFE is
// the safest cross-browser choice for MV3.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content/axe-runner.js'),
      output: {
        entryFileNames: 'content/[name].js',
        format: 'iife',
        name: 'CheckFoxAxeRunner',
        inlineDynamicImports: true,
      },
    },
  },
})
