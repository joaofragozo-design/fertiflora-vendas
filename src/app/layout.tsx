import type { Metadata, Viewport } from 'next'
import { Sora, Manrope } from 'next/font/google'
import { Toaster } from 'sonner'
import { LivingBackgroundProvider } from '@/components/scene/living-background/background-provider'
import { SwRegister } from '@/components/pwa/sw-register'
import '@/styles/globals.css'

const sora = Sora({ variable: '--font-sora', subsets: ['latin'], weight: ['600', '700', '800'] })
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: {
    default: 'FertiFlora Vendas',
    template: '%s | FertiFlora Vendas',
  },
  description: 'Sistema de gestão de vendas da FertiFlora Organomineral.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FertiFlora',
  },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#070b09',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`dark ${sora.variable} ${manrope.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-ink-950 font-sans text-white antialiased">
        <LivingBackgroundProvider>
          {children}
          <Toaster theme="dark" position="top-center" richColors />
        </LivingBackgroundProvider>
        <SwRegister />
      </body>
    </html>
  )
}
