'use client'

import { useState } from 'react'
import { PartyPopper } from 'lucide-react'
import { BadgeTier } from '@/components/perfil/badge-tier'
import { Button } from '@/components/ui/button'
import type { Tier } from '@/lib/gamificacao/tiers'

interface ConquistaOverlayProps {
  tiers: Tier[]
  onFechar: () => void
}

export function ConquistaOverlay({ tiers, onFechar }: ConquistaOverlayProps) {
  const [indice, setIndice] = useState(0)
  const tier = tiers[indice]
  if (!tier) return null

  function proximo() {
    if (indice + 1 < tiers.length) setIndice((i) => i + 1)
    else onFechar()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-black/80 p-6 text-center backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-warning-400">
        <PartyPopper className="h-4 w-4" />
        Conquista desbloqueada
      </div>

      <div className="conquista-badge relative">
        <BadgeTier tier={tier} size={140} />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <div className="conquista-shine absolute -inset-y-4 left-0 w-8 bg-white/40 blur-md" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="font-display text-2xl font-extrabold text-white">{tier.min.toLocaleString('pt-BR')} toneladas</div>
        <p className="text-sm font-semibold text-white/70">&ldquo;{tier.frase}&rdquo;</p>
      </div>

      <Button onClick={proximo} className="mt-2 max-w-[240px]">
        {indice + 1 < tiers.length ? 'Próxima conquista' : 'Continuar'}
      </Button>
    </div>
  )
}
