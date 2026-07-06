'use client'

import { useMemo } from 'react'
import { BarChart3, Rocket, Target } from 'lucide-react'
import type { HistoricoPonto } from '@/lib/ranking/queries'
import type { RankingEntry } from '@/lib/ranking/types'
import { diasUteisRestantes } from '@/lib/ranking/calculos'
import { AvatarVendedor } from './avatar-vendedor'
import { fmtPct, fmtT } from './formatadores'

interface PainelLateralProps {
  entradas: RankingEntry[]
  historico: HistoricoPonto[]
  ano: number
}

function calcularCrescimentoPorVendedor(historico: HistoricoPonto[]): Map<string, number> {
  const porVendedor = new Map<string, HistoricoPonto[]>()
  for (const p of historico) porVendedor.set(p.vendedorId, [...(porVendedor.get(p.vendedorId) ?? []), p])
  const crescimento = new Map<string, number>()
  for (const [id, pontos] of porVendedor) {
    pontos.sort((a, b) => a.data.localeCompare(b.data))
    crescimento.set(id, pontos[pontos.length - 1].toneladas - pontos[0].toneladas)
  }
  return crescimento
}

export function PainelLateral({ entradas, historico, ano }: PainelLateralProps) {
  const somaTotal = useMemo(() => entradas.reduce((s, e) => s + e.total, 0), [entradas])
  const somaMeta = useMemo(() => entradas.reduce((s, e) => s + e.meta, 0), [entradas])
  const percentualGeral = somaMeta > 0 ? (somaTotal / somaMeta) * 100 : 0
  const diasRestantes = diasUteisRestantes(ano)

  const topCrescimento = useMemo(() => {
    const crescimento = calcularCrescimentoPorVendedor(historico)
    return entradas
      .map((e) => ({ entrada: e, delta: crescimento.get(e.id) ?? 0 }))
      .filter((x) => x.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3)
  }, [entradas, historico])

  const melhoresProjecoes = useMemo(() => {
    return entradas
      .filter((e) => e.meta > 0)
      .slice()
      .sort((a, b) => b.projecao / b.meta - a.projecao / a.meta)
      .slice(0, 3)
  }, [entradas])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="glass flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/50">
          <BarChart3 className="h-4 w-4 text-brand-300" />
          Resumo geral
        </div>
        <div>
          <div className="tabular font-display text-2xl font-extrabold text-white">{fmtT(somaTotal)}</div>
          <div className="text-xs text-white/45">de {fmtT(somaMeta)} de meta anual</div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300" style={{ width: `${Math.min(100, percentualGeral)}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/50">
          <span className="tabular text-brand-300">{fmtPct(percentualGeral)} da meta</span>
          <span>{diasRestantes} dias úteis restantes</span>
        </div>
      </div>

      <div className="glass flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/50">
          <Rocket className="h-4 w-4 text-brand-300" />
          Top crescimento
        </div>
        {topCrescimento.length === 0 && <p className="text-xs text-white/40">Sem crescimento registrado nos últimos dias.</p>}
        {topCrescimento.map(({ entrada, delta }) => (
          <div key={entrada.id} className="flex items-center gap-2.5">
            <AvatarVendedor nome={entrada.nome} avatarUrl={entrada.avatarUrl} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{entrada.nome}</div>
            </div>
            <span className="tabular shrink-0 text-xs font-extrabold text-brand-300">+{fmtT(delta)}</span>
          </div>
        ))}
      </div>

      <div className="glass flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/50">
          <Target className="h-4 w-4 text-brand-300" />
          Melhores projeções
        </div>
        {melhoresProjecoes.map((e) => (
          <div key={e.id} className="flex items-center gap-2.5">
            <AvatarVendedor nome={e.nome} avatarUrl={e.avatarUrl} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{e.nome}</div>
            </div>
            <span className="tabular shrink-0 text-xs font-extrabold text-warning-400">{fmtT(e.projecao)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
