'use client'

import { motion } from 'framer-motion'
import type { ItemPedidoAberto } from '@/lib/clientes-bi/types'

interface PedidoProgressoProps {
  itens: ItemPedidoAberto[]
  chave: 'toneladas' | 'reais'
  formatarValor: (v: number) => string
}

/** Barra de progresso por pedido: quanto já foi carregado (pedido - saldo) vs o total contratado. */
export function PedidoProgresso({ itens, chave, formatarValor }: PedidoProgressoProps) {
  if (itens.length === 0) return null

  return (
    <div className="flex flex-col gap-3.5">
      {itens.map((item, i) => {
        const total = chave === 'toneladas' ? item.pesoPedidoT : item.valorTotal
        const saldo = chave === 'toneladas' ? item.pesoSaldoT : item.valorSaldo
        const carregado = Math.max(0, total - saldo)
        const pct = total > 0 ? Math.min(100, (carregado / total) * 100) : 0

        return (
          <div key={`${item.numeroPedido}-${i}`} className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold leading-snug text-white/80">{item.produto}</div>
                <div className="text-[10px] text-white/40">
                  Pedido {item.numeroPedido} · {new Date(item.emissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="tabular text-[11px] font-bold text-white">
                  {formatarValor(carregado)} <span className="text-white/40">/ {formatarValor(total)}</span>
                </div>
                <div className="text-[9.5px] font-bold text-brand-300">{pct.toFixed(0)}% carregado</div>
              </div>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-warning-500/20">
              <motion.div
                className="h-full rounded-full bg-brand-500"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
