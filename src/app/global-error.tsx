'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-950 px-6 text-center font-sans text-white antialiased">
        <p className="text-sm font-bold text-white/80">Algo deu errado.</p>
        <p className="text-xs text-white/45">O erro já foi registrado. Tenta de novo.</p>
        <button
          onClick={reset}
          className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-extrabold text-ink-950"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
