'use client'

import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { buscarVendedorComercialDoUsuario, buscarFaturamentoDoVendedor, listarRanking } from '@/lib/ranking/queries'
import { calcularPercentual, calcularResumoGeral, diasUteisRestantes } from '@/lib/ranking/calculos'
import { fmtPct, fmtT } from './formatadores'
import { TrioFaturamento } from './trio-faturamento'

const ANO = new Date().getFullYear()

interface TrioFaturamentoVendedorProps {
  userId: string
  /** Conta de gestão geral -- mostra faturado/pedido/meta somados de todos os vendedores em vez dos individuais. */
  gestorGeral?: boolean
}

/**
 * Faturado/Pedido/Total do próprio vendedor logado no ano -- mesmos dados e mesmo visual do
 * card "Resumo geral" do Ranking (barra de progresso, % da meta, dias úteis restantes), só que
 * com os números individuais em vez da soma de todos os vendedores. Conta de gestão geral (ver
 * gestorGeral) mostra a soma de todos os vendedores, igual ao "Resumo geral" mesmo.
 */
export function TrioFaturamentoVendedor({ userId, gestorGeral = false }: TrioFaturamentoVendedorProps) {
  const [dados, setDados] = useState<{ faturado: number; pedido: number; meta: number } | null>(null)
  const [semVinculo, setSemVinculo] = useState(false)

  useEffect(() => {
    let ativo = true
    if (gestorGeral) {
      listarRanking(ANO)
        .then((entradas) => {
          const r = calcularResumoGeral(entradas)
          if (ativo) setDados({ faturado: r.somaFaturado, pedido: r.somaPedido, meta: r.somaMeta })
        })
        .catch(() => { if (ativo) setSemVinculo(true) })
      return () => { ativo = false }
    }
    buscarVendedorComercialDoUsuario(userId)
      .then((vendedor) => {
        if (!vendedor) { if (ativo) setSemVinculo(true); return }
        return buscarFaturamentoDoVendedor(vendedor.id, ANO).then((d) => { if (ativo) setDados(d) })
      })
      .catch(() => { if (ativo) setSemVinculo(true) })
    return () => { ativo = false }
  }, [userId, gestorGeral])

  if (semVinculo || !dados) return null

  const total = dados.faturado + dados.pedido
  const percentual = calcularPercentual(total, dados.meta)
  const diasRestantes = diasUteisRestantes(ANO)

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/50">
        <BarChart3 className="h-3.5 w-3.5 text-brand-300" />
        {gestorGeral ? `Desempenho geral da empresa em ${ANO}` : `Seu desempenho em ${ANO}`}
      </div>
      <TrioFaturamento faturado={dados.faturado} pedido={dados.pedido} total={total} />
      {dados.meta > 0 && (
        <>
          <div className="text-xs text-white/45">de {fmtT(dados.meta)} de meta anual</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300" style={{ width: `${Math.min(100, percentual)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/50">
            <span className="tabular text-brand-300">{fmtPct(percentual)} da meta</span>
            <span>{diasRestantes} dias úteis restantes</span>
          </div>
        </>
      )}
    </div>
  )
}
