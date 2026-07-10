'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Banknote } from 'lucide-react'
import type { ResumoCreditoCliente, StatusVencimento } from '@/lib/creditos/calculos'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const STATUS_INFO: Record<StatusVencimento, { rotulo: string; cor: string }> = {
  pago: { rotulo: 'Pago', cor: 'text-brand-300 bg-brand-500/15' },
  atraso: { rotulo: 'Atraso', cor: 'text-danger-400 bg-danger-500/15' },
  vence_essa_semana: { rotulo: 'Vence essa semana', cor: 'text-warning-400 bg-warning-500/15' },
  a_vencer: { rotulo: 'A vencer', cor: 'text-white/50 bg-white/10' },
}

interface LimiteCreditoProps {
  resumo: ResumoCreditoCliente | null
  statusCredito: string | null
}

/**
 * Barra de status (verde=disponível, amarelo=pedidos, vermelho=a vencer) + tabela de
 * vencimentos do cliente. Larguras relativas ao maior entre o limite liberado e o que já está
 * comprometido (pedidos + a vencer) -- assim, se o cliente estourou o limite, a barra fica cheia
 * de amarelo/vermelho sem sobra verde, em vez de estourar visualmente pra fora do componente.
 */
export function LimiteCredito({ resumo, statusCredito }: LimiteCreditoProps) {
  if (!resumo) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-2xl p-6 text-center">
        <Banknote className="h-6 w-6 text-white/25" />
        <p className="text-xs font-semibold text-white/50">Cliente sem análise de crédito -- provavelmente paga à vista.</p>
      </div>
    )
  }

  const { limiteLiberado, nfAVencer, pedidosEmAberto, limiteDisponivel, itensVencimento } = resumo
  const denom = Math.max(limiteLiberado, nfAVencer + pedidosEmAberto, 1)
  const pctDisponivel = (Math.max(0, limiteDisponivel) / denom) * 100
  const pctPedidos = (pedidosEmAberto / denom) * 100
  const pctAVencer = (nfAVencer / denom) * 100
  const acimaDoLimite = limiteDisponivel < 0

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Limite de crédito</div>
        {statusCredito && (
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9.5px] font-bold uppercase text-white/60">{statusCredito}</span>
        )}
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/8">
        <motion.div className="h-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${pctDisponivel}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
        <motion.div className="h-full bg-warning-500" initial={{ width: 0 }} animate={{ width: `${pctPedidos}%` }} transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }} />
        <motion.div className="h-full bg-danger-500" initial={{ width: 0 }} animate={{ width: `${pctAVencer}%` }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className={`tabular text-xs font-extrabold ${acimaDoLimite ? 'text-danger-400' : 'text-brand-300'}`}>{fmtBRL(limiteDisponivel)}</div>
          <div className="text-[9px] font-semibold text-white/40">Disponível</div>
        </div>
        <div>
          <div className="tabular text-xs font-extrabold text-warning-400">{fmtBRL(pedidosEmAberto)}</div>
          <div className="text-[9px] font-semibold text-white/40">Pedidos</div>
        </div>
        <div>
          <div className="tabular text-xs font-extrabold text-danger-400">{fmtBRL(nfAVencer)}</div>
          <div className="text-[9px] font-semibold text-white/40">A vencer</div>
        </div>
      </div>

      {acimaDoLimite && (
        <p className="flex items-center gap-1.5 rounded-xl border border-danger-500/30 bg-danger-500/10 p-2 text-[10.5px] font-bold text-danger-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Cliente acima do limite liberado ({fmtBRL(limiteLiberado)})
        </p>
      )}

      {itensVencimento.length > 0 && (
        <div className="flex flex-col rounded-xl border border-white/8">
          {itensVencimento.slice(0, 10).map((item, i) => {
            const info = STATUS_INFO[item.status]
            return (
              <div key={`${item.nota}-${item.parcela}-${i}`} className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2 last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold text-white">Nota {item.nota || '—'}</div>
                  <div className="text-[10px] text-white/40">
                    {item.status === 'pago' && item.pagamento
                      ? `Pago em ${fmtData(item.pagamento)}`
                      : item.vencimento
                        ? `Vence ${fmtData(item.vencimento)}`
                        : 'Sem vencimento'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular text-[11px] font-extrabold text-white">{fmtBRL(item.liquido)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${info.cor}`}>{info.rotulo}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
