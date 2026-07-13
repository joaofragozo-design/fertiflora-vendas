'use client'

import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { abrirBau } from '@/lib/baus/queries'
import type { Bau, RecompensaBau } from '@/lib/baus/types'

interface BauOverlayProps {
  baus: Bau[]
  onFechar: () => void
}

/** Reveal de baú -- reaproveita o estilo visual de ConquistaOverlay (conquista-pop/shine/glow). */
export function BauOverlay({ baus, onFechar }: BauOverlayProps) {
  const [indice, setIndice] = useState(0)
  const [recompensa, setRecompensa] = useState<RecompensaBau | null>(null)
  const bau = baus[indice]

  useEffect(() => {
    setRecompensa(null)
    if (bau) abrirBau(bau.id).then(setRecompensa)
  }, [bau])

  if (!bau) return null

  function proximo() {
    if (indice + 1 < baus.length) setIndice((i) => i + 1)
    else onFechar()
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-black/80 p-6 text-center backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-warning-400">
        <Gift className="h-4 w-4" />
        Baú de recompensa
      </div>

      {recompensa ? (
        <>
          <div
            className="conquista-badge relative flex h-[140px] w-[140px] items-center justify-center rounded-full"
            style={{ background: recompensa.detalheRecompensa.cor }}
          >
            <Gift className="h-16 w-16 text-black/30" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <div className="conquista-shine absolute -inset-y-4 left-0 w-8 bg-white/40 blur-md" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="font-display text-2xl font-extrabold text-white">Nova moldura!</div>
            <p className="text-sm font-semibold text-white/70">Seu avatar agora tem um anel dessa cor</p>
          </div>

          <Button onClick={proximo} className="mt-2 max-w-[240px]">
            {indice + 1 < baus.length ? 'Próximo baú' : 'Continuar'}
          </Button>
        </>
      ) : (
        <div className="conquista-badge flex h-[140px] w-[140px] items-center justify-center rounded-full bg-white/10">
          <Gift className="h-16 w-16 animate-pulse text-white/40" />
        </div>
      )}
    </div>
    </Portal>
  )
}
