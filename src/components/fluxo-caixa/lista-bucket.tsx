'use client'

import { X } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import type { BucketVencimento, ItemCarteiraPrazo } from '@/lib/fluxo-caixa/types'

function fmtBRL(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtData(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

const ROTULOS_BUCKET: Record<BucketVencimento, string> = {
  vencido: 'Vencido',
  ate_30: 'Até 30 dias',
  ate_60: 'Até 60 dias',
  ate_90: 'Até 90 dias',
  ate_120: 'Até 120 dias',
  ate_180: 'Até 180 dias',
  mais_180: 'Acima de 180 dias',
  sem_vencimento: 'Sem vencimento',
}

interface ListaBucketProps {
  bucket: BucketVencimento
  itens: ItemCarteiraPrazo[]
  onFechar: () => void
}

/** Drill-down de um bucket da carteira a prazo -- mesmo padrão de modal (Portal + glass) já usado no app. */
export function ListaBucket({ bucket, itens, onFechar }: ListaBucketProps) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
        <div
          className="glass flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-[28px] p-6 sm:rounded-[28px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">
              {ROTULOS_BUCKET[bucket]} — {itens.length} título{itens.length === 1 ? '' : 's'}
            </h2>
            <button
              onClick={onFechar}
              aria-label="Fechar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {itens.map((item, i) => (
              <div
                key={`${item.vendedorCodigo}-${item.nota}-${i}`}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${item.vencido ? 'bg-danger-500/10' : 'bg-white/5'}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-white">{item.clienteNome}</div>
                  <div className="text-[10px] text-white/45">
                    Nota {item.nota || '—'} · {item.vencimento ? `Vence ${fmtData(item.vencimento)}` : 'Sem vencimento'}
                    {item.pesoToneladas !== null && ` · ${item.pesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t`}
                    {!item.confirmadoPorComissao && ' · sem confirmação de pagamento no relatório de comissões'}
                  </div>
                </div>
                <span className={`tabular shrink-0 text-xs font-extrabold ${item.vencido ? 'text-danger-400' : 'text-white'}`}>{fmtBRL(item.liquido)}</span>
              </div>
            ))}
            {itens.length === 0 && <p className="p-4 text-center text-xs text-white/40">Nenhum título nesse bucket</p>}
          </div>
        </div>
      </div>
    </Portal>
  )
}
