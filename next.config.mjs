/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },  // Fix ChunkLoadError issues and handle MJML server-side only
  webpack: (config, { dev, isServer }) => {
    // Exclude MJML and related packages from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        os: false,
      };
      
      config.externals = [
        ...(config.externals || []),
        'mjml',
        'mjml-core',
        'clean-css',
        'html-minifier',
      ];
    }

    // Suppress MJML webpack warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /mjml/ },
      { message: /Critical dependency: the request of a dependency is an expression/ },
    ];

    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            default: false,
            vendors: false,
            // Create a single vendor chunk
            vendor: {
              name: 'vendors',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Create a commons chunk
            common: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    return config
  },
  // Fix hot reloading issues and configure larger payloads
  experimental: {
    esmExternals: true,
    serverComponentsExternalPackages: ['mjml'],
    // Increase body parser size limits
    bodyParserSizeLimit: '10mb',
  },
  // Server-side configuration for larger payloads
  serverExternalPackages: ['mjml'],

  // Add headers for CORS and content-type handling
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
}

export default nextConfig
