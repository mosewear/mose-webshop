/**
 * Service-role storage helpers for the AI creative pipeline.
 *
 * We use the existing `images` bucket with two prefixes:
 *  - ai-creatives/scenes/<scene-slug>-<timestamp>.<ext>
 *  - ai-creatives/variants/<run_id>/<variant_index>.<ext>
 *
 * The service-role client bypasses RLS so admin SSR/route-handler code
 * can write here without needing a per-user upload policy. These helpers
 * MUST NOT be imported from client code.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export const CREATIVES_BUCKET = 'images'
export const SCENES_PREFIX = 'ai-creatives/scenes'
export const VARIANTS_PREFIX = 'ai-creatives/variants'

const SAFE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export function pickExtFromMime(mime: string, fallback = 'jpg'): string {
  return SAFE_EXT[mime.toLowerCase()] ?? fallback
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

interface UploadOptions {
  contentType: string
  cacheControl?: string
  upsert?: boolean
}

/**
 * Upload an image buffer to the creative storage area. Returns the
 * public URL or throws.
 */
export async function uploadCreativeAsset(
  fullPath: string,
  data: Buffer | ArrayBuffer | Uint8Array,
  options: UploadOptions,
): Promise<{ path: string; publicUrl: string }> {
  const supabase = createServiceRoleClient()
  const upload = await supabase.storage
    .from(CREATIVES_BUCKET)
    .upload(fullPath, data as Uint8Array, {
      contentType: options.contentType,
      cacheControl: options.cacheControl ?? 'public, max-age=31536000, immutable',
      upsert: options.upsert ?? false,
    })
  if (upload.error) {
    throw new Error(`Storage upload failed (${fullPath}): ${upload.error.message}`)
  }
  const { data: pub } = supabase.storage.from(CREATIVES_BUCKET).getPublicUrl(fullPath)
  return { path: fullPath, publicUrl: pub.publicUrl }
}

/**
 * Remove an asset (e.g. when archiving a scene). Errors are surfaced so
 * the caller can decide whether to ignore them.
 */
export async function removeCreativeAsset(fullPath: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.storage.from(CREATIVES_BUCKET).remove([fullPath])
  if (error) {
    throw new Error(`Storage remove failed (${fullPath}): ${error.message}`)
  }
}

/**
 * Build the storage path for a scene reference image.
 */
export function buildScenePath(label: string, ext: string): string {
  const safe = slugify(label) || 'scene'
  return `${SCENES_PREFIX}/${safe}-${Date.now()}.${ext}`
}

/**
 * Build the storage path for a creative variant.
 */
export function buildVariantPath(runId: string, variantIndex: number, ext: string): string {
  return `${VARIANTS_PREFIX}/${runId}/v${variantIndex}.${ext}`
}
