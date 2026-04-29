import { getInstagramFeedData } from '@/lib/instagram/feed'
import InstagramMarquee from './InstagramMarquee'

// Server component: fetch via unstable_cache (tag: instagram-feed),
// rendert niets als de admin de feed niet heeft ingeschakeld of er nog
// geen zichtbare posts zijn.
export default async function InstagramFeed() {
  const data = await getInstagramFeedData()

  if (!data.enabled || !data.settings || data.posts.length === 0) {
    return null
  }

  return <InstagramMarquee settings={data.settings} posts={data.posts} />
}
