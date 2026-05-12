import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  compiler: {
    // Strip all console.* calls in production builds EXCEPT console.error,
    // so real errors stay visible but debug noise (console.log/info/warn/debug)
    // is removed from the client bundle.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pakketadvies.nl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
        pathname: '/**',
      },
    ],
    // We deliberately keep WebP as the only output format (the Next/Image
    // default). Adding AVIF sounds free on paper, but Vercel's image
    // optimizer encodes AVIF on demand and the cold-cache encode of a
    // 2400px source can cost 1-3s of TTFB for the first visitor — which
    // is exactly the regression we keep getting reports about. WebP-out
    // from a WebP source is essentially a sharp resize, fast on every
    // request.
    // 30 days. Holds the optimised variant on Vercel's image cache long
    // enough that returning visitors and shared-CDN edges almost always
    // serve from cache instead of re-encoding from origin.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Tightened to the breakpoints we actually design for. Default
    // includes 3840 which we never serve, and skipping unused sizes
    // reduces the srcset payload Next emits in the HTML.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    qualities: [75, 90],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  async redirects() {
    return [
      // Redirect mosewear.nl → www.mosewear.com
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'mosewear.nl',
          },
        ],
        destination: 'https://www.mosewear.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.mosewear.nl',
          },
        ],
        destination: 'https://www.mosewear.com/:path*',
        permanent: true,
      },
    ]
  },
};

export default withNextIntl(nextConfig);
