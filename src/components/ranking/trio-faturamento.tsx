import { cn } from '@/lib/utils/cn'
import { fmtT } from './formatadores'

interface TrioFaturamentoProps {
  faturado: number
  pedido: number
  total: number
  tamanho?: 'grande' | 'compacto'
  tone?: 'gold' | 'silver' | 'bronze' | 'default'
}

const TOM_TOTAL: Record<NonNullable<TrioFaturamentoProps['tone']>, string> = {
  gold: 'text-warning-400',
  silver: 'text-mist-50',
  bronze: 'text-earth-tan',
  default: 'text-brand-300',
}

/** Bloco de 3 valores — Faturado (entregue), Pedido (contratado) e Total (soma), igual à planilha original. */
export function TrioFaturamento({ faturado, pedido, total, tamanho = 'grande', tone = 'default' }: TrioFaturamentoProps) {
  const grande = tamanho === 'grande'
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <div className={cn('font-bold uppercase tracking-wide text-white/45', grande ? 'text-[9.5px]' : 'text-[8.5px]')}>Faturado</div>
        <div className={cn('tabular font-extrabold text-white', grande ? 'text-base' : 'text-xs')}>{fmtT(faturado)}</div>
      </div>
      <div>
        <div className={cn('font-bold uppercase tracking-wide text-white/45', grande ? 'text-[9.5px]' : 'text-[8.5px]')}>Pedido</div>
        <div className={cn('tabular font-extrabold text-white/80', grande ? 'text-base' : 'text-xs')}>{fmtT(pedido)}</div>
      </div>
      <div>
        <div className={cn('font-bold uppercase tracking-wide text-white/45', grande ? 'text-[9.5px]' : 'text-[8.5px]')}>Total</div>
        <div className={cn('tabular font-extrabold', TOM_TOTAL[tone], grande ? 'text-base' : 'text-xs')}>{fmtT(total)}</div>
      </div>
    </div>
  )
}
