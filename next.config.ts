import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
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
    ],
    qualities: [75, 90],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
