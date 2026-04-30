/**
 * BrandDiscoveryFetcher
 *
 * Server component dat de data ophaalt voor de sticky BrandDiscovery-
 * widget op de productpagina:
 *   - Instagram-feed (`getInstagramFeedData`, gecached + tag-based)
 *   - Brand-story content (`getAboutSettings`, locale-aware)
 *   - Site-wide admin toggle (`getSiteSettings.pdp_brand_widget_enabled`)
 *
 * Rendert null wanneer de admin de widget heeft uitgezet of er geen
 * IG-posts beschikbaar zijn — de PDP blijft dan ongewijzigd.
 *
 * Mirrors `InstagramFeed` op de homepage zodat de twee Instagram-
 * surfaces dezelfde data-cache delen (en samen invalidaten via
 * `INSTAGRAM_FEED_TAG`).
 */

import { getInstagramFeedData } from '@/lib/instagram/feed'
import { getAboutSettings } from '@/lib/about'
import { getSiteSettings } from '@/lib/settings'
import BrandDiscoveryWidget, {
  type BrandDiscoveryAbout,
} from './BrandDiscoveryWidget'

interface BrandDiscoveryFetcherProps {
  locale: string
}

export default async function BrandDiscoveryFetcher({
  locale,
}: BrandDiscoveryFetcherProps) {
  const [igData, about, settings] = await Promise.all([
    getInstagramFeedData(),
    getAboutSettings(locale),
    getSiteSettings(),
  ])

  // Defensief: als admin uit, geen IG-data of geen posts → niets renderen.
  if (settings.pdp_brand_widget_enabled === false) return null
  if (!igData.enabled) return null
  if (igData.posts.length === 0) return null

  // Bouw een minimale subset van AboutSettings voor de modal — de rest
  // van de about-data is voor de volledige /over-mose pagina en hoeft
  // niet over de wire naar de client.
  const aboutSubset: BrandDiscoveryAbout = {
    hero_image_url: about.hero_image_url,
    hero_image_url_mobile: about.hero_image_url_mobile,
    hero_alt: about.hero_alt,
    story_title: about.story_title,
    story_paragraph1: about.story_paragraph1,
  }

  const username = igData.settings?.username || 'mosewear'
  const igUrl =
    igData.settings?.cta_url || `https://www.instagram.com/${username}`

  return (
    <BrandDiscoveryWidget
      posts={igData.posts}
      about={aboutSubset}
      igUrl={igUrl}
    />
  )
}
