'use client'

import { motion } from 'framer-motion'
import type { BucketVencimento, ResumoBucket } from '@/lib/fluxo-caixa/types'

const ROTULOS_BUCKET: Record<BucketVencimento, string> = {
  vencido: 'Vencido',
  ate_30: 'Até 30 dias',
  ate_60: '30 a 60 dias',
  ate_90: '60 a 90 dias',
  ate_120: '90 a 120 dias',
  ate_180: '120 a 180 dias',
  ate_210: '180 a 210 dias',
  mais_210: 'Acima de 210 dias',
  sem_vencimento: 'Sem vencimento',
}

interface BucketsCarteiraPrazoProps<T> {
  buckets: ResumoBucket<T>[]
  chave: 'toneladas' | 'reais'
  formatarValor: (v: number) => string
  onSelecionarBucket?: (bucket: BucketVencimento) => void
}

/**
 * Barras horizontais clicáveis por bucket -- mesmo estilo visual de `GraficoBarras`
 * (`clientes-bi/grafico-barras.tsx`), mas com onClick por linha (drill-down), então é um
 * componente próprio em vez de estender o compartilhado usado em outras telas.
 */
export function BucketsCarteiraPrazo<T>({ buckets, chave, formatarValor, onSelecionarBucket }: BucketsCarteiraPrazoProps<T>) {
  const comValor = buckets.filter((b) => b.totalReais !== 0 || b.totalToneladas !== 0)
  if (comValor.length === 0) return <p className="text-center text-[11px] text-white/40">Nenhum título em aberto</p>

  const max = Math.max(...comValor.map((b) => (chave === 'toneladas' ? b.totalToneladas : b.totalReais)), 1)

  return (
    <div className="flex flex-col gap-3">
      {comValor.map((b, i) => {
        const valor = chave === 'toneladas' ? b.totalToneladas : b.totalReais
        const vencido = b.bucket === 'vencido'
        return (
          <button
            key={b.bucket}
            onClick={() => onSelecionarBucket?.(b.bucket)}
            disabled={!onSelecionarBucket}
            className="flex flex-col gap-1 text-left disabled:cursor-default"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`min-w-0 flex-1 text-[11px] font-semibold leading-snug ${vencido ? 'text-danger-400' : 'text-white/70'}`}>{ROTULOS_BUCKET[b.bucket]}</span>
              <span className="tabular shrink-0 text-[11px] font-bold text-white">{formatarValor(valor)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div
                className={`h-full rounded-full ${vencido ? 'bg-danger-500' : 'bg-brand-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${(valor / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
