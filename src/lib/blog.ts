import 'server-only'
import { cache } from 'react'
import { createAnonClient } from './supabase/server'

export interface BlogPostFull {
  id: string
  slug: string
  title_nl: string
  title_en: string
  excerpt_nl: string | null
  excerpt_en: string | null
  content_nl: string
  content_en: string
  featured_image_url: string | null
  category: string | null
  tags: string[] | null
  status: 'draft' | 'published'
  author: string
  reading_time: number
  seo_title_nl: string | null
  seo_title_en: string | null
  seo_description_nl: string | null
  seo_description_en: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface BlogPostSummary {
  id: string
  slug: string
  title_nl: string
  title_en: string
  excerpt_nl: string | null
  excerpt_en: string | null
  featured_image_url: string | null
  category: string | null
  author: string
  reading_time: number
  published_at: string | null
  created_at: string
}

const LIST_COLUMNS =
  'id, slug, title_nl, title_en, excerpt_nl, excerpt_en, featured_image_url, category, author, reading_time, published_at, created_at'

export const getBlogPost = cache(async (slug: string): Promise<BlogPostFull | null> => {
  const supabase = createAnonClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return (data as BlogPostFull) ?? null
})

export const getBlogPosts = cache(async (): Promise<BlogPostSummary[]> => {
  const supabase = createAnonClient()
  const { data } = await supabase
    .from('blog_posts')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return ((data as BlogPostSummary[] | null) ?? [])
})

export const getRelatedBlogPosts = cache(
  async (
    postId: string,
    category: string | null,
    limit = 3
  ): Promise<BlogPostSummary[]> => {
    const supabase = createAnonClient()
    const results: BlogPostSummary[] = []

    if (category) {
      const { data } = await supabase
        .from('blog_posts')
        .select(LIST_COLUMNS)
        .eq('status', 'published')
        .eq('category', category)
        .neq('id', postId)
        .order('published_at', { ascending: false })
        .limit(limit)
      results.push(...(((data as BlogPostSummary[] | null) ?? [])))
    }

    if (results.length < limit) {
      const excludedIds = new Set<string>([postId, ...results.map((p) => p.id)])
      const { data } = await supabase
        .from('blog_posts')
        .select(LIST_COLUMNS)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit + excludedIds.size)
      for (const p of ((data as BlogPostSummary[] | null) ?? [])) {
        if (!excludedIds.has(p.id)) {
          results.push(p)
          if (results.length >= limit) break
        }
      }
    }

    return results
  }
)

// Minimal Markdown -> HTML. Server-only (input is admin-authored content that
// already passed RLS-protected admin UI; we still escape HTML first). Supports:
// headings, bold/italic, inline + fenced code, blockquote, hr, ul/ol, links,
// images, line-breaks, paragraphs.
export function renderBlogMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Extract fenced code blocks first so their content isn't processed.
  const codeBlocks: string[] = []
  html = html.replace(/```([\s\S]*?)```/g, (_m, code: string) => {
    codeBlocks.push(code.trim())
    return `\u0000CODE${codeBlocks.length - 1}\u0000`
  })

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-display font-bold mt-8 mb-3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-display font-bold mt-10 mb-4">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-display font-bold mt-12 mb-4">$1</h1>')

  html = html.replace(/^\s*---\s*$/gm, '<hr class="my-8 border-gray-300" />')

  html = html.replace(
    /^&gt; (.+)$/gm,
    '<blockquote class="border-l-4 border-brand-primary pl-4 my-4 italic text-gray-700">$1</blockquote>'
  )

  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="my-6 w-full border-2 border-gray-200" loading="lazy" />'
  )

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
    const safeHref = href.replace(/"/g, '&quot;')
    const isExternal = /^https?:\/\//i.test(safeHref)
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${safeHref}" class="text-brand-primary underline hover:no-underline"${attrs}>${label}</a>`
  })

  html = html.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 bg-gray-100 text-sm font-mono border border-gray-200">$1</code>'
  )

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  html = html.replace(/^(\d+)\. (.+)$/gm, '<li data-ol class="ml-6 list-decimal">$2</li>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-6 list-disc">$1</li>')

  const paragraphs = html.split(/\n\n+/)
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim()
      if (!trimmed) return ''
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<img') ||
        trimmed.startsWith('\u0000CODE')
      ) {
        return trimmed
      }
      if (trimmed.startsWith('<li')) {
        if (trimmed.includes('data-ol')) {
          return `<ol class="my-4 space-y-1">${trimmed.replace(/ data-ol/g, '')}</ol>`
        }
        return `<ul class="my-4 space-y-1">${trimmed}</ul>`
      }
      return `<p class="mb-4">${trimmed.replace(/\n/g, '<br />')}</p>`
    })
    .join('\n')

  html = html.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx: string) => {
    const code = codeBlocks[Number(idx)] ?? ''
    return `<pre class="my-4 p-4 bg-gray-900 text-gray-100 overflow-x-auto text-sm"><code>${code}</code></pre>`
  })

  return html
}
