import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Builds the popup HTML (with inlined CSS/JS) and the background service worker.
// The content script is built separately via vite.config.content.js because it
// needs IIFE format to run as a non-module script in the page context.
export default defineConfig({
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
