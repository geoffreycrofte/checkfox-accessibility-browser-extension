import { defineConfig, build } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { rmSync } from 'fs'
import contentConfig from './vite.config.content.js'
import { splitAndZip } from './scripts/split-and-zip.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Strip macOS .DS_Store files that publicDir may copy into the build output,
// so they never end up in the Web Store / AMO zip.
const stripDsStore = {
  name: 'strip-ds-store',
  closeBundle() {
    rmSync(resolve(__dirname, 'dist/.DS_Store'), { force: true })
    rmSync(resolve(__dirname, 'dist/icons/.DS_Store'), { force: true })
  },
}

// After the main (module) build, also build the IIFE content script into the
// same dist — so EVERY build (one-shot or watch rebuild) produces a COMPLETE
// extension and can never leave a half-built dist missing content/axe-core.js.
// This runs on watch rebuilds too: the main build's emptyOutDir wipes content/,
// so we must rebuild it each time. It targets dist/ (not src/), so it never
// retriggers the watcher.
const buildContentScript = {
  name: 'build-content-script',
  async closeBundle() {
    await build({ ...contentConfig, configFile: false, logLevel: 'warn' })
  },
}

// Final step: split the flat dist/ into dist/chrome/ and dist/firefox/, each with
// a browser-specific manifest. One-shot builds (`npm run build`) also produce an
// upload-ready .zip per browser. Watch mode (`npm run dev`) skips zipping so
// rebuilds stay fast, but still refreshes both folders for "Load unpacked".
const packageBuilds = {
  name: 'package-builds',
  closeBundle() {
    splitAndZip({ zip: !this.meta?.watchMode })
  },
}

// Builds the popup HTML (with inlined CSS/JS) and the background service worker.
// The content script is built with a separate config (IIFE format, needed to run
// as a non-module script in the page context) and chained in via the plugin above.
export default defineConfig({
  plugins: [stripDsStore, buildContentScript, packageBuilds],
  root: 'src',
  // Relative base so asset URLs work inside chrome-extension:// origins
  base: './',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'shared/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
