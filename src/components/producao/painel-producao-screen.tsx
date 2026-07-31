'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Factory } from 'lucide-react'
import { listarTurnosRecentes } from '@/lib/producao/queries'
import type { ProducaoTurno } from '@/lib/producao/types'
import { TurnoCard } from '@/components/producao/turno-card'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'

export function PainelProducaoScreen() {
  usePageIntensity(0.2)
  const [turnos, setTurnos] = useState<ProducaoTurno[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    listarTurnosRecentes().then((dados) => {
      if (ativo) { setTurnos(dados); setCarregando(false) }
    })
    return () => { ativo = false }
  }, [])

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold">Fábrica · Santa Tereza</h1>
          <Link
            href="/producao/novo"
            aria-label="Abrir novo turno"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-ink-950 transition-transform active:scale-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </Link>
        </div>

        <p className="px-1 text-xs text-white/50">Controle de produção da granuladora — meta: 80% de aproveitamento.</p>

        {carregando && <SkeletonListaCards />}

        {!carregando && turnos.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-earth-tan/10 text-earth-tan">
              <Factory className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-white/60">Nenhum turno registrado ainda</p>
            <Link href="/producao/novo" className="text-xs font-bold text-brand-300">Abrir o primeiro turno</Link>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {turnos.map((turno) => <TurnoCard key={turno.id} turno={turno} />)}
        </div>
      </div>
    </main>
  )
}
