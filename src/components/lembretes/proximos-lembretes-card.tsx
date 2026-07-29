'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, ChevronRight } from 'lucide-react'
import { listarLembretesProximos } from '@/lib/lembretes/queries'
import type { Lembrete } from '@/lib/lembretes/types'

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Auto-contido (fetch próprio), igual a BauIndicador/TrioFaturamentoVendedor -- some se não houver lembrete pendente. */
export function ProximosLembretesCard() {
  const [lembretes, setLembretes] = useState<Lembrete[]>([])

  useEffect(() => {
    listarLembretesProximos(3).then(setLembretes).catch(() => {})
  }, [])

  if (lembretes.length === 0) return null

  return (
    <Link href="/lembretes" className="glass flex flex-col gap-2.5 rounded-2xl p-4 transition-colors hover:bg-white/10">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/50">
        <BellRing className="h-3.5 w-3.5 text-brand-300" />
        Próximos lembretes
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30" />
      </div>
      <div className="flex flex-col gap-1.5">
        {lembretes.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate font-semibold text-white/80">{l.titulo}</span>
            <span className="shrink-0 tabular text-white/40">{fmtData(l.dataLembrete)}</span>
          </div>
        ))}
      </div>
    </Link>
  )
}
