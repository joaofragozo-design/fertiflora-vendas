'use client'

import { motion } from 'framer-motion'
import { nomeMesCurto, type ResumoCicloMes } from '@/lib/comissoes/calculos'
import { cn } from '@/lib/utils/cn'

interface GraficoCiclosProps {
  serie: ResumoCicloMes[]
  anoSelecionado: number
  mesSelecionado: number
  onSelecionar: (ano: number, mes: number) => void
}

/** Tira de colunas por ciclo de pagamento (mais recente pra cima é aqui um "mais recente pra direita") -- toque troca o mês selecionado. */
export function GraficoCiclos({ serie, anoSelecionado, mesSelecionado, onSelecionar }: GraficoCiclosProps) {
  const max = Math.max(...serie.map((s) => s.total), 1)

  return (
    <div className="flex items-end justify-between gap-1">
      {serie.map((s, i) => {
        const selecionado = s.ano === anoSelecionado && s.mes === mesSelecionado
        const altura = s.total > 0 ? Math.max(6, (s.total / max) * 64) : 3
        return (
          <button
            key={`${s.ano}-${s.mes}`}
            onClick={() => onSelecionar(s.ano, s.mes)}
            aria-label={`${nomeMesCurto(s.mes)} de ${s.ano}`}
            className="flex flex-1 flex-col items-center gap-1.5 py-1"
          >
            <div className="flex h-16 w-full items-end justify-center">
              <motion.div
                className={cn(
                  'w-full max-w-[22px] rounded-md',
                  selecionado ? 'bg-brand-500' : s.ehFuturo ? 'bg-white/12 border border-dashed border-white/25' : 'bg-white/25'
                )}
                initial={{ height: 0 }}
                animate={{ height: altura }}
                transition={{ duration: 0.5, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className={cn('text-[9.5px] font-bold uppercase', selecionado ? 'text-brand-300' : 'text-white/40')}>
              {nomeMesCurto(s.mes)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
