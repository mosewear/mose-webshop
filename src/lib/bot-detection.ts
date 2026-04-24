/**
 * Bot / crawler / datacenter detection.
 *
 * Used by:
 *   - `/api/analytics/track` (server) to drop bot-originated events before
 *     they hit `analytics_events`.
 *   - `src/lib/analytics.ts` (client) to short-circuit `trackEvent` for
 *     headless / automation browsers on the client side as a cheap first
 *     line of defense.
 *
 * Philosophy: we intentionally err slightly on the side of dropping
 * borderline traffic. MOSE is a Dutch streetwear brand whose real
 * customers live in NL / BE / DE and browse on consumer hardware
 * (mobile Safari, Windows/Mac Chrome, Samsung Internet, etc.). A Linux
 * desktop UA on a US IP is essentially always an AI-crawler / SEO
 * scraper / uptime probe, so we filter it out rather than pretending
 * it's a potential buyer.
 */

// -- Shared constants ---------------------------------------------------

/**
 * User-agent substrings that identify well-known crawlers, scrapers,
 * AI fetchers, link-preview bots, and headless automation markers.
 *
 * Matching is case-insensitive. Fragments must be unique enough that
 * they don't collide with real browser UAs (e.g. we don't just match
 * the literal word "agent").
 */
const BOT_UA_PATTERNS = [
  // Generic crawler/scraper markers
  'bot', 'crawl', 'spider', 'slurp', 'scraper', 'fetcher', 'headlesschrome',
  // Search engines
  'googlebot', 'bingbot', 'duckduckbot', 'yandexbot', 'baiduspider',
  'applebot', 'seekbot', 'petalbot', 'ia_archiver', 'mojeekbot',
  // AI crawlers (the big source of US/Linux traffic in 2026)
  'gptbot', 'chatgpt-user', 'oai-searchbot', 'claudebot', 'claude-web',
  'anthropic-ai', 'perplexitybot', 'perplexity-user', 'google-extended',
  'cohere-ai', 'meta-externalagent', 'amazonbot', 'bytespider',
  'ccbot', 'diffbot', 'you.com',
  // SEO / monitoring / marketing scrapers
  'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'rogerbot',
  'screaming frog', 'seokicks', 'serpstatbot', 'sitecheckerbot',
  // Social link-preview fetchers (not real pageviews, pollute analytics)
  'facebookexternalhit', 'meta-external', 'twitterbot', 'linkedinbot',
  'slackbot', 'discordbot', 'telegrambot', 'whatsapp', 'skypeuripreview',
  'pinterestbot', 'embedly', 'quora-bot',
  // Automation frameworks that leak through as UA hints
  'phantomjs', 'puppeteer', 'playwright', 'selenium', 'cypress',
  'chrome-lighthouse', 'pagespeed', 'gtmetrix',
]

const BOT_UA_REGEX = new RegExp(BOT_UA_PATTERNS.join('|'), 'i')

/**
 * Countries where we accept `X11; Linux x86_64` as "possibly a real
 * human on a Linux desktop" instead of "almost certainly a datacenter
 * headless Chromium". Tuned for an EU DTC brand.
 */
const LINUX_DESKTOP_ACCEPT_COUNTRIES = new Set([
  'NL', 'BE', 'DE', 'FR', 'LU', 'GB', 'IE', 'SE', 'DK', 'NO', 'FI',
  'AT', 'CH', 'ES', 'IT', 'PT', 'PL', 'CZ',
])

// -- Public API ---------------------------------------------------------

/**
 * Returns true if the UA string is empty, missing, or contains a
 * known bot / automation marker.
 */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length === 0) return true
  return BOT_UA_REGEX.test(ua)
}

/**
 * Server-side fingerprint. Combines UA heuristics with the country
 * hint from the edge (x-vercel-ip-country / cf-ipcountry) to catch
 * the most common case we're seeing in the wild: AI crawlers
 * pretending to be `Mozilla/5.0 (X11; Linux x86_64) Chrome/...` from
 * US datacenters.
 */
export function isLikelyBotRequest(args: {
  userAgent: string | null | undefined
  countryCode: string | null | undefined
}): boolean {
  const { userAgent, countryCode } = args

  if (isBotUserAgent(userAgent)) return true
  if (!userAgent) return true

  // Headless Chromium / datacenter Linux fingerprint. Real Linux
  // desktop users exist in the EU but almost never load a Dutch
  // streetwear shop from a US IP on one — that combination is
  // overwhelmingly headless Chrome behind OpenAI / Perplexity /
  // Anthropic / Common Crawl / SEO tools.
  if (/X11;\s*Linux\s+x86_64/i.test(userAgent)) {
    if (!countryCode || !LINUX_DESKTOP_ACCEPT_COUNTRIES.has(countryCode.toUpperCase())) {
      return true
    }
  }

  // A few cheap content-quality checks. Any of these is strong evidence
  // of a non-browser client (curl / requests / crude scrapers):
  //   - UA literally wrapped in double quotes (seen from SE/DK scrapers)
  //   - starts with `curl/` or `python-requests/` or `Go-http-client`
  const trimmed = userAgent.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    /^(curl|wget|python-requests|python-urllib|go-http-client|java|okhttp|axios|node-fetch|libwww-perl)\b/i.test(trimmed)
  ) {
    return true
  }

  return false
}

/**
 * Client-side only. Detects headless / automation browsers.
 * Safe to call in SSR contexts — returns false when window is absent.
 */
export function isClientAutomationBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  // Set by Selenium, Puppeteer, Playwright, Cypress, etc.
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver === true) {
    return true
  }
  const ua = navigator.userAgent || ''
  if (/HeadlessChrome/i.test(ua)) return true
  if (isBotUserAgent(ua)) return true
  return false
}
