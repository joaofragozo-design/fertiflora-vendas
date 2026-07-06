import type { Insight, KpiCliente, NotaFiscalRow, PontoAnual, PontoMensal, PontoSazonalidade, TopProduto } from './types'

function anoDe(emissao: string): number {
  return Number(emissao.slice(0, 4))
}

function mesDe(emissao: string): number {
  return Number(emissao.slice(5, 7))
}

function somaToneladas(notas: NotaFiscalRow[]): number {
  return notas.filter((n) => n.un === 'KG').reduce((s, n) => s + n.pesoLiquidoKg, 0) / 1000
}

function somaReais(notas: NotaFiscalRow[]): number {
  return notas.reduce((s, n) => s + n.valorLiquido, 0)
}

function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior <= 0) return atual > 0 ? 100 : null
  return ((atual - anterior) / anterior) * 100
}

export function calcularKpis(notas: NotaFiscalRow[], ano: number): KpiCliente {
  const doAno = notas.filter((n) => anoDe(n.emissao) === ano)
  const doAnoAnterior = notas.filter((n) => anoDe(n.emissao) === ano - 1)

  const toneladasAno = somaToneladas(doAno)
  const reaisAno = somaReais(doAno)
  const toneladasAnoAnterior = somaToneladas(doAnoAnterior)
  const reaisAnoAnterior = somaReais(doAnoAnterior)

  const notasUnicas = new Set(doAno.map((n) => n.nota).filter(Boolean))
  const datas = notas.map((n) => n.emissao).sort()
  const anosUnicos = new Set(notas.map((n) => anoDe(n.emissao)))

  return {
    toneladasAno,
    reaisAno,
    toneladasAnoAnterior,
    reaisAnoAnterior,
    variacaoToneladasPct: variacaoPct(toneladasAno, toneladasAnoAnterior),
    variacaoReaisPct: variacaoPct(reaisAno, reaisAnoAnterior),
    numNotasAno: notasUnicas.size,
    ticketMedioNota: notasUnicas.size > 0 ? reaisAno / notasUnicas.size : 0,
    primeiraCompra: datas[0] ?? null,
    ultimaCompra: datas[datas.length - 1] ?? null,
    anosAtivo: anosUnicos.size,
  }
}

/** Últimos `quantidadeMeses` meses (incluindo o atual), com zero nos meses sem compra. */
export function calcularSerieMensal(notas: NotaFiscalRow[], quantidadeMeses = 12, hoje: Date = new Date()): PontoMensal[] {
  const pontos: PontoMensal[] = []
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    pontos.push({ mes: chave, toneladas: 0, reais: 0 })
  }
  const porMes = new Map(pontos.map((p) => [p.mes, p]))

  for (const n of notas) {
    const chave = n.emissao.slice(0, 7)
    const ponto = porMes.get(chave)
    if (!ponto) continue
    if (n.un === 'KG') ponto.toneladas += n.pesoLiquidoKg / 1000
    ponto.reais += n.valorLiquido
  }

  return pontos
}

export function calcularSerieAnual(notas: NotaFiscalRow[]): PontoAnual[] {
  const porAno = new Map<number, PontoAnual>()
  for (const n of notas) {
    const ano = anoDe(n.emissao)
    const atual = porAno.get(ano) ?? { ano, toneladas: 0, reais: 0 }
    if (n.un === 'KG') atual.toneladas += n.pesoLiquidoKg / 1000
    atual.reais += n.valorLiquido
    porAno.set(ano, atual)
  }
  return [...porAno.values()].sort((a, b) => a.ano - b.ano)
}

export function calcularTopProdutos(notas: NotaFiscalRow[], ano: number, limite = 6): TopProduto[] {
  const doAno = notas.filter((n) => anoDe(n.emissao) === ano)
  const porProduto = new Map<string, TopProduto>()
  for (const n of doAno) {
    const atual = porProduto.get(n.produto) ?? { produto: n.produto, toneladas: 0, reais: 0 }
    if (n.un === 'KG') atual.toneladas += n.pesoLiquidoKg / 1000
    atual.reais += n.valorLiquido
    porProduto.set(n.produto, atual)
  }
  return [...porProduto.values()].sort((a, b) => b.reais - a.reais).slice(0, limite)
}

/** Sazonalidade: soma histórica por mês-do-ano (ignora o ano), normalizada pelo pico. */
export function calcularSazonalidade(notas: NotaFiscalRow[]): PontoSazonalidade[] {
  const porMes = new Map<number, number>()
  for (let m = 1; m <= 12; m++) porMes.set(m, 0)
  for (const n of notas) {
    if (n.un !== 'KG') continue
    const mes = mesDe(n.emissao)
    porMes.set(mes, (porMes.get(mes) ?? 0) + n.pesoLiquidoKg / 1000)
  }
  const pico = Math.max(1, ...porMes.values())
  return [...porMes.entries()].map(([mes, toneladas]) => ({ mes, toneladas, intensidade: toneladas / pico }))
}

export function calcularInsights(notas: NotaFiscalRow[], ano: number, hoje: Date = new Date()): Insight[] {
  const insights: Insight[] = []
  if (notas.length === 0) return insights

  const kpis = calcularKpis(notas, ano)
  const topProdutosAno = calcularTopProdutos(notas, ano, 1)
  const topProdutoHistorico = calcularTopProdutos(notas, ano).length > 0 ? topProdutosAno[0] : calcularTopProdutos(notas, hoje.getFullYear(), 1)[0]

  if (kpis.primeiraCompra) {
    insights.push({ emoji: '🎯', texto: `Cliente desde ${anoDe(kpis.primeiraCompra)}` })
  }

  if (kpis.variacaoReaisPct !== null && kpis.variacaoReaisPct > 0) {
    insights.push({ emoji: '📈', texto: `Crescimento de ${kpis.variacaoReaisPct.toFixed(0)}% este ano` })
  }

  if (topProdutoHistorico) {
    insights.push({ emoji: '🔥', texto: `Produto favorito: ${topProdutoHistorico.produto}` })
  }

  if (kpis.ultimaCompra) {
    const dias = Math.round((hoje.getTime() - new Date(kpis.ultimaCompra + 'T00:00:00').getTime()) / 86_400_000)
    if (dias <= 45) insights.push({ emoji: '⚡', texto: `Comprou há ${dias} dia${dias === 1 ? '' : 's'}` })
    else insights.push({ emoji: '💤', texto: `Sem comprar há ${dias} dias` })
  }

  if (kpis.numNotasAno > 0) {
    insights.push({ emoji: '💰', texto: `Ticket médio de R$ ${kpis.ticketMedioNota.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} por nota` })
  }

  return insights
}
