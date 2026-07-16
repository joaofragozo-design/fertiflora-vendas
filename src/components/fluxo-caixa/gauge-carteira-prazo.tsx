'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Gauge, Pencil } from 'lucide-react'
import type { ResumoCarteiraPrazo } from '@/lib/fluxo-caixa/types'
import { fmtT } from '@/components/ranking/formatadores'

interface GaugeCarteiraPrazoProps {
  resumo: ResumoCarteiraPrazo
  onEditar: () => void
}

/**
 * Barra horizontal (não velocímetro/arco) pra bater com a linguagem visual do resto do app
 * (`LimiteCredito`, `GraficoBarras` são todos horizontais) -- 100% CSS/framer-motion, sem
 * Recharts (é um valor único + uma marca de limiar, não precisa de eixo/escala).
 */
export function GaugeCarteiraPrazo({ resumo, onEditar }: GaugeCarteiraPrazoProps) {
  const { limiteToneladas, reservaPct, reservaLiberada, totalToneladas, percentualUsado, alertaReserva } = resumo
  const marcaReserva = 100 - reservaPct
  const pctBarra = Math.min(percentualUsado, 100)
  const corBarra = alertaReserva ? 'bg-danger-500' : 'bg-brand-500'

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
          <Gauge className="h-3.5 w-3.5 text-brand-300" />
          Carteira a prazo — limite geral
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {reservaLiberada && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[9.5px] font-bold text-brand-300">Reserva liberada</span>}
          <button
            onClick={onEditar}
            aria-label="Editar limite"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/8 text-white/50 transition-colors hover:bg-white/15 hover:text-white"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          className={`h-full rounded-full ${corBarra}`}
          initial={{ width: 0 }}
          animate={{ width: `${pctBarra}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        {!reservaLiberada && (
          <div className="absolute top-0 h-full w-0.5 bg-white/50" style={{ left: `${marcaReserva}%` }} title={`Reserva da safrinha (${reservaPct}%)`} />
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="tabular font-extrabold text-white">{fmtT(totalToneladas)}</span>
        <span className="text-white/40">de {fmtT(limiteToneladas)} ({percentualUsado.toFixed(0)}%)</span>
      </div>

      {!reservaLiberada && (
        <p className="text-[10px] text-white/35">
          Linha em {marcaReserva.toFixed(0)}% marca o início da reserva de {reservaPct}% pra safrinha (Pilar 5) — só liberável com caixa no Nível 3 e garantia de recebimento.
        </p>
      )}

      {alertaReserva && (
        <p className="flex items-center gap-1.5 rounded-xl border border-danger-500/30 bg-danger-500/10 p-2 text-[10.5px] font-bold text-danger-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Carteira já consumiu a reserva da safrinha — revisar com o comitê antes de aprovar mais vendas a prazo.
        </p>
      )}
    </div>
  )
}
