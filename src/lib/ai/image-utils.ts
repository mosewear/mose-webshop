/**
 * Server-side image utilities used by the AI creative pipeline.
 *
 * Everything runs through `sharp` (already in deps for the photoshoot
 * pipeline). The fancier QA primitives (SSIM, palette extraction, deltaE)
 * are pragmatic Node-only implementations — they don't aim to match a
 * paper-exact reference. Trade-offs we accept:
 *
 *  - SSIM-like score: cosine similarity between the normalised grayscale
 *    histograms of the source garment crop and the candidate image.
 *    Empirically tracks "does the garment shape + tonal distribution
 *    survive?" well enough to gate auto-approve.
 *  - Palette extraction: downsample to 64x64, posterise per channel and
 *    pick the K most frequent buckets. Faster + zero new deps; results
 *    are close enough to k-means for QA gating.
 *  - DeltaE: CIE76 (Euclidean Lab). The full CIEDE2000 buys us perceptual
 *    accuracy we don't actually need at this guardrail threshold.
 */

import sharp from 'sharp'

// =====================================================================
// Network helpers
// =====================================================================

export async function downloadToBuffer(url: string, timeoutMs = 30_000): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`Download ${url} failed: HTTP ${res.status}`)
    }
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  } finally {
    clearTimeout(timer)
  }
}

// =====================================================================
// Sharp wrappers
// =====================================================================

export interface NormalisedImage {
  buffer: Buffer
  width: number
  height: number
  contentType: string
}

/**
 * Convert anything sharp can decode into a JPEG @ Q88 with a sensible
 * max-dimension. We use JPEG (not WebP) for Replicate inputs because
 * a few models still struggle with WebP.
 */
export async function normaliseInputImage(
  source: Buffer,
  maxDim = 1536,
  quality = 88,
): Promise<NormalisedImage> {
  const image = sharp(source, { failOn: 'none' }).rotate()
  const meta = await image.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  const longSide = Math.max(width, height)
  const pipeline = longSide > maxDim ? image.resize({ width: maxDim, height: maxDim, fit: 'inside' }) : image
  const buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer()
  const out = await sharp(buffer).metadata()
  return {
    buffer,
    width: out.width ?? width,
    height: out.height ?? height,
    contentType: 'image/jpeg',
  }
}

/**
 * Produce a square thumbnail (default 512px) with a focal-aware crop.
 * Focal point is normalised (0..1) — defaults to centre when omitted.
 */
export async function generateThumbnail(
  source: Buffer,
  size = 512,
  focalX = 0.5,
  focalY = 0.5,
): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize({
      width: size,
      height: size,
      fit: 'cover',
      position: focalToPosition(focalX, focalY),
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
}

function focalToPosition(x: number, y: number): string {
  const xx = clamp01(x)
  const yy = clamp01(y)
  const vert = yy < 0.34 ? 'top' : yy > 0.66 ? 'bottom' : 'center'
  const horiz = xx < 0.34 ? 'left' : xx > 0.66 ? 'right' : 'center'
  if (vert === 'center' && horiz === 'center') return 'centre'
  if (vert === 'center') return horiz
  if (horiz === 'center') return vert
  return `${vert} ${horiz}`
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5
  return Math.max(0, Math.min(1, v))
}

// =====================================================================
// Grayscale histogram + SSIM-like similarity
// =====================================================================

const HIST_BINS = 64

async function grayscaleHistogram(source: Buffer): Promise<Float32Array> {
  const { data, info } = await sharp(source)
    .rotate()
    .resize(256, 256, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bins = new Float32Array(HIST_BINS)
  const len = data.length
  const channels = info.channels || 1
  for (let i = 0; i < len; i += channels) {
    const v = data[i]
    const bin = Math.min(HIST_BINS - 1, Math.floor((v / 256) * HIST_BINS))
    bins[bin] += 1
  }
  const total = info.width * info.height
  if (total > 0) {
    for (let i = 0; i < HIST_BINS; i++) bins[i] /= total
  }
  return bins
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (denom === 0) return 0
  return Math.max(0, Math.min(1, dot / denom))
}

/**
 * SSIM-like score in 0..1. Compares the tonal distribution of two
 * images after a 256x256 grayscale resize. Higher means the garment's
 * structure + tonal balance is preserved.
 */
export async function structuralSimilarityScore(
  reference: Buffer,
  candidate: Buffer,
): Promise<number> {
  const [a, b] = await Promise.all([grayscaleHistogram(reference), grayscaleHistogram(candidate)])
  return Number(cosineSimilarity(a, b).toFixed(4))
}

// =====================================================================
// Palette extraction + deltaE distance
// =====================================================================

const PALETTE_SAMPLE_SIZE = 96
const PALETTE_QUANT_BUCKETS = 6 // 6^3 = 216 colour buckets

interface Rgb {
  r: number
  g: number
  b: number
}

async function readDownscaledPixels(source: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(source)
    .rotate()
    .resize(PALETTE_SAMPLE_SIZE, PALETTE_SAMPLE_SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

/**
 * Extract up to `k` dominant colours as hex strings. Fast frequency-based
 * bucketing — not perceptually optimal but works for brand-palette QA.
 */
export async function extractPaletteHex(source: Buffer, k = 5): Promise<string[]> {
  const { data } = await readDownscaledPixels(source)
  const counts = new Map<number, { rgb: Rgb; count: number }>()
  const step = 3
  for (let i = 0; i < data.length; i += step) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const qr = Math.floor((r / 256) * PALETTE_QUANT_BUCKETS)
    const qg = Math.floor((g / 256) * PALETTE_QUANT_BUCKETS)
    const qb = Math.floor((b / 256) * PALETTE_QUANT_BUCKETS)
    const key = qr * PALETTE_QUANT_BUCKETS * PALETTE_QUANT_BUCKETS + qg * PALETTE_QUANT_BUCKETS + qb
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
      existing.rgb.r = (existing.rgb.r + r) / 2
      existing.rgb.g = (existing.rgb.g + g) / 2
      existing.rgb.b = (existing.rgb.b + b) / 2
    } else {
      counts.set(key, { rgb: { r, g, b }, count: 1 })
    }
  }
  const ranked = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, k)
  return ranked.map((entry) => rgbToHex(entry.rgb))
}

function rgbToHex(rgb: Rgb): string {
  const to2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`
}

function hexToRgb(hex: string): Rgb | null {
  let v = hex.replace('#', '').trim()
  if (v.length === 3) v = v.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(v)) return null
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

// sRGB → Lab (D65). Adapted from common reference implementations.
function rgbToLab(rgb: Rgb): { L: number; a: number; b: number } {
  const toLinear = (c: number) => {
    const cs = c / 255
    return cs > 0.04045 ? Math.pow((cs + 0.055) / 1.055, 2.4) : cs / 12.92
  }
  const R = toLinear(rgb.r)
  const G = toLinear(rgb.g)
  const B = toLinear(rgb.b)
  // sRGB → XYZ
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041
  const Xn = 0.95047
  const Yn = 1.0
  const Zn = 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const L = 116 * f(Y / Yn) - 16
  const a = 500 * (f(X / Xn) - f(Y / Yn))
  const b = 200 * (f(Y / Yn) - f(Z / Zn))
  return { L, a, b }
}

function deltaE76(a: Rgb, b: Rgb): number {
  const la = rgbToLab(a)
  const lb = rgbToLab(b)
  const dL = la.L - lb.L
  const da = la.a - lb.a
  const db = la.b - lb.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

/**
 * Average CIE76 distance from `candidatePalette` to its closest brand
 * colour. Lower = on-brand. Returns Number.POSITIVE_INFINITY if either
 * palette is empty.
 */
export function paletteDistance(candidatePalette: string[], brandPalette: string[]): number {
  const candidates = candidatePalette.map(hexToRgb).filter((v): v is Rgb => v !== null)
  const brand = brandPalette.map(hexToRgb).filter((v): v is Rgb => v !== null)
  if (candidates.length === 0 || brand.length === 0) return Number.POSITIVE_INFINITY
  let sum = 0
  for (const c of candidates) {
    let best = Number.POSITIVE_INFINITY
    for (const b of brand) {
      const d = deltaE76(c, b)
      if (d < best) best = d
    }
    sum += best
  }
  return Number((sum / candidates.length).toFixed(4))
}

// =====================================================================
// Ad-policy lint
// =====================================================================

export interface AdPolicyLintResult {
  pass: boolean
  issues: string[]
}

/**
 * Trivial keyword-based ad-policy lint on the *generation prompt* and
 * any caption text. The brand guide stores a list of blocked phrases
 * (Meta's "before/after", "100% guaranteed", etc.).
 *
 * This is intentionally cheap — Meta's actual policy review happens
 * upstream when we push the creative. We just want to avoid burning
 * Replicate cost on prompts that we know Meta will reject.
 */
export function adPolicyLint(text: string, blockedTerms: string[]): AdPolicyLintResult {
  const lower = (text || '').toLowerCase()
  const hits: string[] = []
  for (const term of blockedTerms) {
    if (!term) continue
    const t = term.toLowerCase().trim()
    if (!t) continue
    if (lower.includes(t)) hits.push(term)
  }
  return { pass: hits.length === 0, issues: hits }
}
