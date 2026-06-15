/**
 * Generates placeholder PNG icons using pure Node.js (no native deps).
 * Run once after cloning: `npm run generate-icons`
 *
 * Icons are simple colored circles with "CF" text. Replace with your
 * final brand assets before publishing to the Chrome Web Store.
 */

import { createWriteStream, mkdirSync } from 'fs'
import zlib from 'zlib'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = resolve(__dirname, '../public/icons')

mkdirSync(iconsDir, { recursive: true })

// PNG helpers — must be declared before buildPng uses them
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

// 3x5 pixel bitmaps for C and F
const GLYPHS = {
  C: [
    [0,1,1],
    [1,0,0],
    [1,0,0],
    [1,0,0],
    [0,1,1],
  ],
  F: [
    [1,1,1],
    [1,0,0],
    [1,1,0],
    [1,0,0],
    [1,0,0],
  ],
}

const SIZES = [16, 32, 48, 64, 128]
// CheckFox orange: #f97316
const BG = [249, 115, 22]
const FG = [255, 255, 255]

for (const size of SIZES) {
  const png = buildPng(size, BG, FG)
  const dest = resolve(iconsDir, `icon${size}.png`)
  const ws = createWriteStream(dest)
  ws.write(png)
  ws.end()
  console.log(`Generated ${dest}`)
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder (pure Node.js, no deps)
// Produces an RGB 8-bit PNG with a simple circle drawn pixel-by-pixel.
// ---------------------------------------------------------------------------

function buildPng(size, bg, fg) {
  const pixels = drawCircle(size, bg, fg)
  const rows = []
  for (let y = 0; y < size; y++) {
    // Filter byte 0 (None) prepended to each scanline
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y][x]
      row[1 + x * 3] = r
      row[2 + x * 3] = g
      row[3 + x * 3] = b
    }
    rows.push(row)
  }
  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw, { level: 9 })

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 2  // color type RGB
  // filter, interlace: 0

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function drawCircle(size, bg, fg) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  const pixels = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [255, 255, 255]),
  )

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      pixels[y][x] = dx * dx + dy * dy <= r * r ? bg : [30, 30, 40]
    }
  }

  // Draw a simple "CF" mark on sizes >= 48 using a 3x5 pixel font
  if (size >= 48) {
    const scale = Math.floor(size / 16)
    stampLetter(pixels, size, 'C', Math.round(cx - 3 * scale), Math.round(cy - 2.5 * scale), scale, fg)
    stampLetter(pixels, size, 'F', Math.round(cx + 0.5 * scale), Math.round(cy - 2.5 * scale), scale, fg)
  }

  return pixels
}

function stampLetter(pixels, size, char, ox, oy, scale, color) {
  const glyph = GLYPHS[char]
  if (!glyph) return
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (!glyph[row][col]) continue
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const py = oy + row * scale + sy
          const px = ox + col * scale + sx
          if (py >= 0 && py < size && px >= 0 && px < size) {
            pixels[py][px] = color
          }
        }
      }
    }
  }
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
