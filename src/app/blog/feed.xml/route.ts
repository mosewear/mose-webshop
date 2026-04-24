import { getBlogPosts } from '@/lib/blog'

export const revalidate = 1800

const BASE_URL = 'https://www.mosewear.com'
const FEED_LOCALE: 'nl' | 'en' = 'nl'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = await getBlogPosts()

  const pickTitle = (p: { title_nl: string; title_en: string }) =>
    FEED_LOCALE === 'en' && p.title_en ? p.title_en : p.title_nl
  const pickExcerpt = (p: { excerpt_nl: string | null; excerpt_en: string | null }) =>
    FEED_LOCALE === 'en' && p.excerpt_en ? p.excerpt_en : (p.excerpt_nl ?? '')

  const latest = posts[0]
  const lastBuildDate = new Date(
    latest?.published_at ?? latest?.created_at ?? new Date().toISOString()
  ).toUTCString()

  const items = posts
    .slice(0, 50)
    .map((post) => {
      const title = pickTitle(post)
      const excerpt = pickExcerpt(post)
      const link = `${BASE_URL}/${FEED_LOCALE}/blog/${post.slug}`
      const pubDate = new Date(post.published_at ?? post.created_at).toUTCString()
      const categoryTag = post.category
        ? `\n      <category>${escapeXml(post.category)}</category>`
        : ''
      const imageEnclosure = post.featured_image_url
        ? `\n      <enclosure url="${escapeXml(post.featured_image_url)}" type="image/jpeg" />`
        : ''
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(excerpt)}</description>
      <author>hi@mosewear.com (${escapeXml(post.author)})</author>${categoryTag}${imageEnclosure}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MOSE Blog</title>
    <link>${BASE_URL}/${FEED_LOCALE}/blog</link>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Verhalen, stijlgidsen en behind-the-scenes content van MOSE streetwear.</description>
    <language>${FEED_LOCALE}-${FEED_LOCALE.toUpperCase()}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  })
}
