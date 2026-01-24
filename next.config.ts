import type { NextConfig } from "next";

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
  },
  
  // Redirect mosewear.nl → mosewear.com (permanent 301)
  async redirects() {
    return [
      // Redirect bare domain mosewear.nl
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
      // Redirect www.mosewear.nl (als het werkt)
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

export default nextConfig;
