import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  experimental: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  // Sem org/project configurados, o wizard de upload de source maps não roda -- só o
  // runtime de captura de erro fica ativo (suficiente enquanto não há conta Sentry ligada).
})
