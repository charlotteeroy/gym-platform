/**
 * Next.js Configuration
 *
 * IMPORTANT DEPLOYMENT NOTE:
 * We intentionally DO NOT use `output: 'standalone'` for Render deployment.
 *
 * Standalone mode was removed because:
 * 1. It requires manual copying of static files to the standalone output directory
 * 2. In a monorepo, paths become complex: apps/web/.next/standalone/apps/web/.next/static
 * 3. Copy commands can fail silently, resulting in 502 errors with 176-byte responses
 * 4. Standalone is designed for Docker containers, not Render's Node.js runtime
 *
 * Standard `next start` (via `pnpm --filter @gym/web start`) handles everything
 * automatically and is the recommended approach for Render deployment.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,

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
