import { getInstagramFeedData } from '@/lib/instagram/feed'
import PdpInstagramFeed from './PdpInstagramFeed'

/**
 * Server-component dat de bestaande, ge-cachete Instagram feed-data
 * (via `unstable_cache`, tag: instagram-feed) ophaalt en de eerste 6
 * posts doorgeeft aan een compactere PDP-variant van het marquee-blok.
 *
 * Rendert volledig niets als:
 *   * de admin de Instagram-koppeling heeft uitgezet,
 *   * settings ontbreken (eerste deploy / migratie nog niet ge-runned),
 *   * er nog geen zichtbare posts zijn.
 *
 * Op die manier verschijnt er nooit een lege/half-leeg blok onderaan
 * de productpagina als de feed (nog) niet is ingericht.
 */
export default async function PdpInstagramFetcher() {
  const data = await getInstagramFeedData()

  if (!data.enabled || !data.settings || data.posts.length === 0) {
    return null
  }

  return (
    <PdpInstagramFeed
      settings={data.settings}
      posts={data.posts.slice(0, 6)}
    />
  )
}
