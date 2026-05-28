'use client'

import { useCallback, useMemo, useState } from 'react'

import type { InstagramPost } from './types'

/**
 * Defensively hides Instagram tiles whose image URL fails to load.
 *
 * Why this exists:
 *   - We render IG media via `<Image>` with `unoptimized` for any
 *     non-Supabase URL (Graph CDN URLs change frequently and don't
 *     survive Next's image optimizer cache).
 *   - When a post is **deleted on Instagram**, its CDN URL starts
 *     returning 404. Until the next /api/instagram/sync prune marks
 *     the row as `is_hidden`, the storefront would otherwise show the
 *     browser's default broken-image placeholder ("?" / torn-icon).
 *   - The Graph `media_url` can also expire for posts that still
 *     exist on IG (CDN URL refresh window). The next sync fetches a
 *     new URL; until then, we hide the tile rather than show a "?".
 *
 * Usage:
 *   const { visiblePosts, markFailed } = useHideFailedInstagramPosts(posts)
 *   visiblePosts.map(post => <Image ... onError={() => markFailed(post.id)} />)
 *
 * The filter happens at the source list, so any consumer (looping
 * carousel, grid, rotating pill thumbnail) sees a shrunk list with
 * the broken tile fully removed from the layout.
 */
export function useHideFailedInstagramPosts<
  T extends Pick<InstagramPost, 'id'>,
>(posts: T[]): {
  visiblePosts: T[]
  markFailed: (id: string) => void
} {
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set())

  const markFailed = useCallback((id: string) => {
    if (!id) return
    setFailedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const visiblePosts = useMemo(() => {
    if (failedIds.size === 0) return posts
    return posts.filter((p) => !failedIds.has(p.id))
  }, [posts, failedIds])

  return { visiblePosts, markFailed }
}
