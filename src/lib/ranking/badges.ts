import type { HistoricoPonto } from './queries'
import type { RankingEntry } from './types'

export interface Badge {
  emoji: string
  label: string
}

interface SerieVendedor {
  primeiro: number
  ultimo: number
  penultimoData: string | null
  ultimoData: string | null
  deltaUltimoDia: number
}

function agruparPorVendedor(historico: HistoricoPonto[]): Map<string, SerieVendedor> {
  const porVendedor = new Map<string, HistoricoPonto[]>()
  for (const ponto of historico) {
    const lista = porVendedor.get(ponto.vendedorId) ?? []
    lista.push(ponto)
    porVendedor.set(ponto.vendedorId, lista)
  }

  const series = new Map<string, SerieVendedor>()
  for (const [vendedorId, pontos] of porVendedor) {
    pontos.sort((a, b) => a.data.localeCompare(b.data))
    const primeiro = pontos[0].toneladas
    const ultimo = pontos[pontos.length - 1].toneladas
    const penultimo = pontos.length > 1 ? pontos[pontos.length - 2] : null
    series.set(vendedorId, {
      primeiro,
      ultimo,
      penultimoData: penultimo?.data ?? null,
      ultimoData: pontos[pontos.length - 1].data,
      deltaUltimoDia: penultimo ? ultimo - penultimo.toneladas : 0,
    })
  }
  return series
}

/**
 * Badges automáticos calculados só a partir de dado real (histórico diário e
 * ranking atual) — nenhum é inventado quando não há sinal suficiente.
 * Agregados (Fertiflora, Outros) não disputam colocação, então não entram
 * em nenhuma conquista — são totais/catch-all, não vendedores de verdade.
 */
export function calcularBadges(entradas: RankingEntry[], historico: HistoricoPonto[]): Map<string, Badge[]> {
  const resultado = new Map<string, Badge[]>()
  const adicionar = (vendedorId: string, badge: Badge) => {
    const lista = resultado.get(vendedorId) ?? []
    lista.push(badge)
    resultado.set(vendedorId, lista)
  }

  const disputantes = entradas.filter((e) => !e.agregado)
  const idsDisputantes = new Set(disputantes.map((e) => e.id))

  const lider = disputantes.find((e) => e.colocacao === 1)
  if (lider && lider.faturado > 0) adicionar(lider.id, { emoji: '👑', label: 'Líder do ranking' })

  for (const e of disputantes) {
    if (e.percentual >= 100) adicionar(e.id, { emoji: '🎯', label: 'Meta batida' })
  }

  const series = agruparPorVendedor(historico.filter((p) => idsDisputantes.has(p.vendedorId)))

  let maiorCrescimentoId: string | null = null
  let maiorCrescimentoValor = 0
  let melhorEvolucaoId: string | null = null
  let melhorEvolucaoValor = 0
  let vendaDoDiaId: string | null = null
  let vendaDoDiaValor = 0

  for (const [vendedorId, serie] of series) {
    const crescimentoAbsoluto = serie.ultimo - serie.primeiro
    if (crescimentoAbsoluto > maiorCrescimentoValor) {
      maiorCrescimentoValor = crescimentoAbsoluto
      maiorCrescimentoId = vendedorId
    }

    const crescimentoRelativo = serie.primeiro > 0 ? crescimentoAbsoluto / serie.primeiro : 0
    if (crescimentoRelativo > melhorEvolucaoValor) {
      melhorEvolucaoValor = crescimentoRelativo
      melhorEvolucaoId = vendedorId
    }

    if (serie.deltaUltimoDia > vendaDoDiaValor) {
      vendaDoDiaValor = serie.deltaUltimoDia
      vendaDoDiaId = vendedorId
    }
  }

  if (maiorCrescimentoId && maiorCrescimentoValor > 0) adicionar(maiorCrescimentoId, { emoji: '🚀', label: 'Maior crescimento' })
  if (melhorEvolucaoId && melhorEvolucaoValor > 0 && melhorEvolucaoId !== maiorCrescimentoId) {
    adicionar(melhorEvolucaoId, { emoji: '🔥', label: 'Melhor evolução' })
  }
  if (vendaDoDiaId && vendaDoDiaValor > 0) adicionar(vendaDoDiaId, { emoji: '⚡', label: 'Venda do dia' })

  return resultado
}

interface ItemRankingSemanal {
  entrada: RankingEntry
  toneladas: number
}

/** Badges dos líderes dos mini-rankings semanais — só quem está em 1º lugar em cada um. */
export function calcularBadgesSemanais(
  topVendasSemana: ItemRankingSemanal[],
  topPedidosSemana: ItemRankingSemanal[]
): Map<string, Badge[]> {
  const resultado = new Map<string, Badge[]>()
  const adicionar = (vendedorId: string, badge: Badge) => {
    const lista = resultado.get(vendedorId) ?? []
    lista.push(badge)
    resultado.set(vendedorId, lista)
  }

  const liderVendas = topVendasSemana[0]
  if (liderVendas && liderVendas.toneladas > 0) adicionar(liderVendas.entrada.id, { emoji: '🏆', label: 'Líder da semana em vendas' })

  const liderPedidos = topPedidosSemana[0]
  if (liderPedidos && liderPedidos.toneladas > 0) adicionar(liderPedidos.entrada.id, { emoji: '📦', label: 'Líder da semana em pedidos' })

  return resultado
}
