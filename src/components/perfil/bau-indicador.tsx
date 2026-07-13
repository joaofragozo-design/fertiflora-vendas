'use client'

import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { listarMeusBausNaoAbertos } from '@/lib/baus/queries'
import type { Bau } from '@/lib/baus/types'
import { BauOverlay } from './bau-overlay'

/** Card clicável avisando de baú(s) de recompensa não aberto(s) -- some quando não há nenhum. */
export function BauIndicador() {
  const [baus, setBaus] = useState<Bau[]>([])
  const [abrindo, setAbrindo] = useState(false)

  useEffect(() => {
    listarMeusBausNaoAbertos().then(setBaus)
  }, [])

  if (baus.length === 0) return null

  return (
    <>
      <button
        onClick={() => setAbrindo(true)}
        className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10 active:scale-[0.98]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-500/20 text-warning-400">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold">
            {baus.length === 1 ? 'Você ganhou um baú!' : `Você ganhou ${baus.length} baús!`}
          </div>
          <div className="text-xs text-white/50">Toque pra abrir e ver sua recompensa</div>
        </div>
      </button>

      {abrindo && (
        <BauOverlay
          baus={baus}
          onFechar={() => {
            setAbrindo(false)
            setBaus([])
          }}
        />
      )}
    </>
  )
}
