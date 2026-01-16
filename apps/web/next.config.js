/**
 * Next.js Configuration
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // Standalone output for optimized production deployment
  output: 'standalone',

  // Transpile workspace packages so Next.js can bundle them correctly
  // Without this, imports from @gym/* packages would fail
  transpilePackages: ['@gym/core', '@gym/database', '@gym/shared'],

  experimental: {
    // These packages should not be bundled and should remain as external Node.js requires
    // - @prisma/client: Requires native bindings that can't be bundled
    // - bcryptjs: Native crypto operations
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
};

module.exports = nextConfig;
