import { getHomeReviewsMarquee, MARQUEE_MIN_REVIEWS } from '@/lib/reviews/marquee'
import HomeReviewsMarquee from './HomeReviewsMarquee'

/**
 * Server-component dat de homepage reviews-marquee data haalt en de
 * client-component met items rendert. Wordt vanuit `[locale]/page.tsx`
 * via een React-slot doorgegeven aan `HomePageClient`, zodat de fetch
 * ISR-vriendelijk gebeurt en niet client-side per visitor opnieuw.
 *
 * Edge-cases:
 *  - Minder dan `MARQUEE_MIN_REVIEWS` goedgekeurde 5★ reviews
 *    → component returnt `null` (compleet onzichtbaar). Beter geen
 *      strip dan een halflege strip die op een bug lijkt.
 *  - Fetch faalt → returnt `null` (zie graceful return in marquee.ts).
 */
export default async function HomeReviewsMarqueeFetcher() {
  const items = await getHomeReviewsMarquee()
  if (items.length < MARQUEE_MIN_REVIEWS) return null

  return <HomeReviewsMarquee items={items} />
}
