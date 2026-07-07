'use client'

import { useEffect, useMemo, useState } from 'react'
import { PieChart, Trophy, Users } from 'lucide-react'
import { buscarNotasDoVendedor } from '@/lib/clientes-bi/queries'
import { calcularResumoVendedor, variacaoPct } from '@/lib/clientes-bi/calculos'
import type { NotaFiscalRow } from '@/lib/clientes-bi/types'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { ContadorAnimado } from './contador-animado'
import { GraficoPizza } from './grafico-pizza'

const ANO = new Date().getFullYear()

function fmtT(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + 't'
}
function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtPct(v: number) {
  const sinal = v >= 0 ? '+' : ''
  return `${sinal}${v.toFixed(0)}%`
}

export function VisaoGeralVendedor({ vendedorCodigo, onSelecionarCliente }: { vendedorCodigo: number; onSelecionarCliente: (codigo: number) => void }) {
  const [notas, setNotas] = useState<NotaFiscalRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [clientesChave, setClientesChave] = useState<'toneladas' | 'reais'>('reais')

  useEffect(() => {
    setCarregando(true)
    buscarNotasDoVendedor(vendedorCodigo).then((lista) => {
      setNotas(lista)
      setCarregando(false)
    })
  }, [vendedorCodigo])

  const resumo = useMemo(() => calcularResumoVendedor(notas, ANO), [notas])
  const variacaoToneladas = variacaoPct(resumo.totalToneladas, resumo.totalToneladasAnoAnterior)
  const variacaoReais = variacaoPct(resumo.totalReais, resumo.totalReaisAnoAnterior)
  const lider = resumo.clientesRanqueados[0]
  const clientesOrdenados = useMemo(
    () => resumo.clientesRanqueados.slice().sort((a, b) => b[clientesChave] - a[clientesChave]),
    [resumo.clientesRanqueados, clientesChave]
  )

  if (carregando) return <SkeletonListaCards />

  if (resumo.clientesRanqueados.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
        <Users className="h-8 w-8 text-white/25" />
        <p className="text-sm font-semibold text-white/60">Nenhuma compra registrada em {ANO} ainda</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass flex flex-col gap-1 rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Toneladas {ANO}</div>
          <ContadorAnimado valor={resumo.totalToneladas} formatar={fmtT} className="tabular font-display text-lg font-extrabold text-white" />
          {variacaoToneladas !== null && (
            <span className={`text-[10px] font-bold ${variacaoToneladas >= 0 ? 'text-brand-300' : 'text-danger-400'}`}>{fmtPct(variacaoToneladas)} vs {ANO - 1}</span>
          )}
        </div>
        <div className="glass flex flex-col gap-1 rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Faturado {ANO}</div>
          <ContadorAnimado valor={resumo.totalReais} formatar={fmtBRL} className="tabular font-display text-lg font-extrabold text-white" />
          {variacaoReais !== null && (
            <span className={`text-[10px] font-bold ${variacaoReais >= 0 ? 'text-brand-300' : 'text-danger-400'}`}>{fmtPct(variacaoReais)} vs {ANO - 1}</span>
          )}
        </div>
        <div className="glass flex flex-col gap-1 rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Clientes ativos</div>
          <div className="tabular font-display text-lg font-extrabold text-white">{resumo.clientesAtivos}<span className="text-xs font-semibold text-white/40"> / {resumo.clientesTotal}</span></div>
        </div>
        <div className="glass flex flex-col gap-1 rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Ticket médio/nota</div>
          <div className="tabular font-display text-lg font-extrabold text-white">{fmtT(resumo.ticketMedioTonelada)}</div>
        </div>
      </div>

      {lider && (
        <div className="flex flex-wrap gap-1.5">
          <span className="flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1.5 text-[10.5px] font-bold text-white/80">
            <Trophy className="h-3 w-3 text-warning-400" />
            Top cliente: {lider.nome} ({lider.participacaoPct.toFixed(0)}%)
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
        <div className="glass flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
            <PieChart className="h-3.5 w-3.5 text-brand-300" />
            Participação no faturado
          </div>
          <GraficoPizza fatias={resumo.clientesRanqueados.map((c) => ({ id: c.codigo, label: c.nome, valor: c.reais }))} formatarValor={fmtBRL} />
        </div>

        <div className="glass flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
              <Trophy className="h-3.5 w-3.5 text-brand-300" />
              Top clientes em {ANO}
            </div>
            <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
              <button onClick={() => setClientesChave('toneladas')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${clientesChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>t</button>
              <button onClick={() => setClientesChave('reais')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${clientesChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>R$</button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {clientesOrdenados.slice(0, 8).map((c, i) => (
              <button
                key={c.codigo}
                onClick={() => onSelecionarCliente(c.codigo)}
                className="flex items-center gap-2.5 rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/8"
              >
                <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-extrabold text-white/60">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/80">{c.nome}</span>
                <span className="tabular shrink-0 text-[11px] font-bold text-white">{clientesChave === 'toneladas' ? fmtT(c.toneladas) : fmtBRL(c.reais)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
