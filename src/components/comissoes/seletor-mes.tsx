'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { nomeMes } from '@/lib/comissoes/calculos'

interface SeletorMesProps {
  ano: number
  mes: number
  onMudar: (ano: number, mes: number) => void
}

export function SeletorMes({ ano, mes, onMudar }: SeletorMesProps) {
  function mudar(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1)
    onMudar(d.getFullYear(), d.getMonth() + 1)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={() => mudar(-1)}
        aria-label="Mês anterior"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/70 transition-colors hover:bg-white/15 active:scale-90"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="font-display truncate text-sm font-bold capitalize text-white">
        {nomeMes(mes)} de {ano}
      </span>
      <button
        onClick={() => mudar(1)}
        aria-label="Próximo mês"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/70 transition-colors hover:bg-white/15 active:scale-90"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
