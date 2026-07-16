'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    // Nunca registra em dev -- os chunks do Turbopack em modo dev não são conteúdo-endereçados de
    // forma confiável a cada edição (ao contrário do build de produção), então um SW cache-first
    // passa a servir JS antigo indefinidamente mesmo depois de recompilar, mascarando qualquer
    // mudança de código durante desenvolvimento local.
    if (process.env.NODE_ENV !== 'production') return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
