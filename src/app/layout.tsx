import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'FertiFlora Vendas',
    template: '%s | FertiFlora Vendas',
  },
  description: 'Sistema de gestão de vendas da FertiFlora Organomineral.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0e1512',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-ink-900 font-sans text-white antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
