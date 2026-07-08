import type { ComissaoErpRow } from './types'

export interface Ciclo {
  inicio: string // yyyy-mm-dd
  fim: string // yyyy-mm-dd
}

function formatarIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ciclo de pagamento do mês (1-12): dia 21 do mês anterior até dia 20 do próprio mês. */
export function cicloDoMes(ano: number, mes: number): Ciclo {
  return {
    inicio: formatarIso(new Date(ano, mes - 2, 21)),
    fim: formatarIso(new Date(ano, mes - 1, 20)),
  }
}

/**
 * A qual ciclo de pagamento uma data pertence -- do dia 21 em diante já é o
 * ciclo do mês seguinte (com virada de ano em dezembro tratada pelo próprio
 * JS Date). Sem isso, `cicloDoMes(hoje.getFullYear(), hoje.getMonth()+1)`
 * usaria o mês de calendário puro, que do dia 21 até o fim do mês aponta pro
 * ciclo que ACABOU DE FECHAR, não pro que está em curso.
 */
export function mesDoCiclo(hoje: Date): { ano: number; mes: number } {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + (hoje.getDate() >= 21 ? 1 : 0), 1)
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

function dentroDoCiclo(data: string | null, ciclo: Ciclo): boolean {
  return !!data && data >= ciclo.inicio && data <= ciclo.fim
}

/**
 * Chave natural de uma linha de comissão (vendedor+nota+parcela) -- usada só
 * pra checar se uma linha do relatório "geral" já apareceu como liquidada,
 * nunca pra deduplicar exibição (o mesmo par pode legitimamente repetir
 * numa mesma nota com produtos diferentes; ~0,2% dos casos no CSV real).
 */
function chaveLinha(l: ComissaoErpRow): string {
  return `${l.vendedorCodigo}|${l.nota}|${l.parcela}`
}

export interface ResumoCicloMes {
  ano: number
  mes: number // 1-12
  ciclo: Ciclo
  ehFuturo: boolean
  /** Soma por Dt Pagto no ciclo -- comissão já liquidada (cliente já pagou). */
  jaLiquidada: number
  /** Soma por Dt Vencto no ciclo, ainda sem Dt Pagto -- cliente ainda não pagou esse título. */
  aPagar: number
  /** Soma por Dt Emissao no ciclo -- nota já lançada, usada como projeção pros meses futuros. */
  projecao: number
  /** jaLiquidada + aPagar (passado/atual) ou projecao (futuro) -- o número de destaque do mês. */
  total: number
}

/**
 * Resumo do ciclo de pagamento de um mês específico. Duas fontes distintas do ERP (mesmo layout
 * de colunas, universos diferentes): `geral` (histórico de vencimento/emissão, quase nunca tem
 * Dt Pagto) alimenta aPagar/projeção; `liquidadas` (100% das linhas com Dt Pagto) é a única fonte
 * confiável de jaLiquidada. Como as duas se sobrepõem parcialmente, aPagar exclui qualquer linha
 * de `geral` cuja chave já apareça em `liquidadas` -- senão a mesma nota/parcela contaria duas
 * vezes (uma como "a pagar", outra como "já liquidada") quando os dois ciclos coincidem.
 */
export function calcularResumoCicloMes(
  geral: ComissaoErpRow[],
  liquidadas: ComissaoErpRow[],
  ano: number,
  mes: number,
  hoje: Date = new Date()
): ResumoCicloMes {
  const ciclo = cicloDoMes(ano, mes)
  const atual = mesDoCiclo(hoje)
  const cicloAtual = cicloDoMes(atual.ano, atual.mes)
  const ehFuturo = ciclo.inicio > cicloAtual.fim

  const chavesLiquidadas = new Set(liquidadas.map(chaveLinha))

  let jaLiquidada = 0
  for (const l of liquidadas) {
    if (dentroDoCiclo(l.pagamento, ciclo)) jaLiquidada += l.valorComissao
  }

  let aPagar = 0
  let projecao = 0
  for (const l of geral) {
    if (dentroDoCiclo(l.vencimento, ciclo) && !chavesLiquidadas.has(chaveLinha(l))) aPagar += l.valorComissao
    if (dentroDoCiclo(l.emissao, ciclo)) projecao += l.valorComissao
  }

  return { ano, mes, ciclo, ehFuturo, jaLiquidada, aPagar, projecao, total: ehFuturo ? projecao : jaLiquidada + aPagar }
}

/**
 * Série de ciclos ao redor de `centro` (ex: 4 pra trás, 3 pra frente) -- base do gráfico de
 * tendência. `centro` por padrão é o mês corrente, mas a tela recentraliza a janela no mês
 * selecionado pra sempre ter a barra ativa visível, mesmo depois de navegar pra fora da janela
 * original. `hoje` continua sendo a data real, usada por calcularResumoCicloMes pra decidir
 * ehFuturo/jaLiquidada/aPagar de cada mês da série.
 */
export function calcularSerieCiclos(
  geral: ComissaoErpRow[],
  liquidadas: ComissaoErpRow[],
  mesesAtras: number,
  mesesAdiante: number,
  hoje: Date = new Date(),
  centro: Date = hoje
): ResumoCicloMes[] {
  const serie: ResumoCicloMes[] = []
  for (let i = -mesesAtras; i <= mesesAdiante; i++) {
    const d = new Date(centro.getFullYear(), centro.getMonth() + i, 1)
    serie.push(calcularResumoCicloMes(geral, liquidadas, d.getFullYear(), d.getMonth() + 1, hoje))
  }
  return serie
}

export type ModoItensComissao = 'liquidada' | 'aPagar' | 'projecao'

/** Itens do ciclo de um mês, no modo escolhido -- base da lista de "notas" da tela. Esconde comissão zerada. */
export function montarItensDoCiclo(
  geral: ComissaoErpRow[],
  liquidadas: ComissaoErpRow[],
  ano: number,
  mes: number,
  modo: ModoItensComissao
): ComissaoErpRow[] {
  const ciclo = cicloDoMes(ano, mes)
  let filtrados: ComissaoErpRow[]
  let chaveOrdenacao: 'pagamento' | 'vencimento' | 'emissao'

  if (modo === 'liquidada') {
    filtrados = liquidadas.filter((l) => dentroDoCiclo(l.pagamento, ciclo))
    chaveOrdenacao = 'pagamento'
  } else if (modo === 'aPagar') {
    const chavesLiquidadas = new Set(liquidadas.map(chaveLinha))
    filtrados = geral.filter((l) => dentroDoCiclo(l.vencimento, ciclo) && !chavesLiquidadas.has(chaveLinha(l)))
    chaveOrdenacao = 'vencimento'
  } else {
    filtrados = geral.filter((l) => dentroDoCiclo(l.emissao, ciclo))
    chaveOrdenacao = 'emissao'
  }

  return filtrados
    .filter((l) => l.valorComissao !== 0)
    .sort((a, b) => (b[chaveOrdenacao] ?? '').localeCompare(a[chaveOrdenacao] ?? ''))
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function nomeMes(mes: number): string {
  return MESES[mes - 1]
}

export function nomeMesCurto(mes: number): string {
  return MESES_CURTO[mes - 1]
}
