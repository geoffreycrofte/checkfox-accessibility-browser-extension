// Post-build step: split the flat dist/ payload into per-browser folders, each
// with a browser-specific manifest and a ready-to-upload .zip:
//
//   dist/chrome/   <built files> + checkfox-chrome-v<version>.zip
//   dist/firefox/  <built files> + checkfox-firefox-v<version>.zip
//
// public/manifest.json is the single canonical (union) manifest; the per-browser
// variants below are derived from it by dropping the keys the other browser
// doesn't understand — so neither store sees an "unrecognized key" warning.

import { resolve, join } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, cpSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { execFileSync } from 'child_process'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const dist = resolve(root, 'dist')

// Derive the Chrome and Firefox manifests from the canonical one.
function manifestVariants() {
  const base = JSON.parse(readFileSync(resolve(root, 'public/manifest.json'), 'utf8'))

  // Chrome: drop the Firefox-only keys.
  const chrome = structuredClone(base)
  delete chrome.sidebar_action
  delete chrome.browser_specific_settings

  // Firefox: drop the Chromium-only keys. The sidebar comes from sidebar_action;
  // side_panel, its sidePanel permission, and the Chrome version gate are unused.
  const firefox = structuredClone(base)
  delete firefox.side_panel
  delete firefox.minimum_chrome_version
  firefox.permissions = (firefox.permissions ?? []).filter(p => p !== 'sidePanel')

  // Firefox (incl. 128 ESR) ships MV3 background.service_worker disabled by
  // default and requires an event-page-style background.scripts entry instead.
  // The bundled worker is an ES module, so keep type:module so its imports load.
  firefox.background = {
    scripts: [firefox.background.service_worker],
    type: firefox.background.type ?? 'module',
  }

  return { chrome, firefox }
}

// Split the flat dist/ into per-browser folders. Pass { zip: false } in watch
// mode to skip zipping (the slow part) while still producing dist/chrome/ and
// dist/firefox/ on every rebuild.
export function splitAndZip({ zip = true } = {}) {
  const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const variants = manifestVariants()
  const targets = Object.keys(variants) // ['chrome', 'firefox']

  // Snapshot the built payload BEFORE the target subdirs exist, so copying and
  // cleanup never touch dist/chrome or dist/firefox themselves.
  const payload = readdirSync(dist).filter(name => !targets.includes(name))

  for (const target of targets) {
    const outDir = join(dist, target)
    rmSync(outDir, { recursive: true, force: true })

    for (const name of payload) {
      cpSync(join(dist, name), join(outDir, name), { recursive: true })
    }

    // Overwrite the copied canonical manifest with the browser-specific one.
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(variants[target], null, 2) + '\n')

    if (!zip) continue

    const zipName = `checkfox-${target}-v${version}.zip`
    try {
      // -r recurse, -q quiet, -X drop extra file attributes; exclude the zip itself.
      // execFileSync (no shell) — args are passed directly, not interpolated.
      execFileSync('zip', ['-rqX', zipName, '.', '-x', zipName], { cwd: outDir })
      console.log(`[CheckFox] packaged dist/${target}/${zipName}`)
    } catch {
      console.warn(`[CheckFox] could not create ${zipName} — is the 'zip' utility installed? Unpacked build is ready in dist/${target}/.`)
    }
  }

  // Leave dist/ holding only the per-browser folders.
  for (const name of payload) rmSync(join(dist, name), { recursive: true, force: true })
}
