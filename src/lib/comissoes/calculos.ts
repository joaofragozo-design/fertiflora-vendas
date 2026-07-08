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

/**
 * Estado do ciclo de um mês em relação a hoje:
 * - `passado`: ciclo já fechou. Só "já liquidada" importa -- o que venceu e não foi pago nesse
 *   ciclo não é mais "a pagar" dele, porque o ciclo já acabou. Se o cliente pagar depois, o
 *   valor aparece como "já liquidada" no ciclo em que o pagamento realmente cair, nunca
 *   retroativamente neste.
 * - `atual`: ciclo em andamento. "Já liquidada" (o que já entrou) + "a pagar" (o que ainda vence
 *   dentro do próprio ciclo atual e ainda não foi pago) -- uma projeção legítima porque o ciclo
 *   ainda não fechou.
 * - `futuro`: ciclo ainda não começou. "Projeção" (baseada em Dt Emissao, todas as notas já
 *   lançadas nesse período) + "a pagar" (baseada em Dt Vencto, só os títulos que já têm
 *   vencimento definido dentro do ciclo) -- as duas convivem porque medem coisas diferentes: nem
 *   toda nota lançada já tem vencimento cadastrado no relatório "geral".
 */
export type EstadoCiclo = 'passado' | 'atual' | 'futuro'

export function estadoDoCiclo(ano: number, mes: number, hoje: Date = new Date()): EstadoCiclo {
  const atual = mesDoCiclo(hoje)
  const numMes = ano * 12 + mes
  const numAtual = atual.ano * 12 + atual.mes
  if (numMes < numAtual) return 'passado'
  if (numMes > numAtual) return 'futuro'
  return 'atual'
}

/**
 * Data em que o vendedor efetivamente recebe o que foi liquidado/a pagar num ciclo -- sempre
 * dia 10 do mês seguinte ao fechamento do ciclo (ciclo do mês M fecha dia 20/M, recebimento
 * dia 10/M+1). Ex: ciclo de julho (21/06-20/07) -> recebimento em 10/08.
 */
export function dataRecebimento(ano: number, mes: number): string {
  return formatarIso(new Date(ano, mes, 10))
}

export interface ResumoCicloMes {
  ano: number
  mes: number // 1-12
  ciclo: Ciclo
  estado: EstadoCiclo
  /** Dia 10 do mês seguinte ao fechamento do ciclo -- quando o vendedor recebe. */
  dataRecebimento: string
  /** Soma por Dt Pagto no ciclo -- comissão já liquidada (cliente já pagou). Válido em qualquer estado. */
  jaLiquidada: number
  /** Soma por Dt Vencto no ciclo, ainda sem Dt Pagto -- calculado pros ciclos atual e futuro. */
  aPagar: number
  /** Soma por Dt Emissao no ciclo -- só calculado quando `estado === 'futuro'`. */
  projecao: number
  /** jaLiquidada (passado), jaLiquidada + aPagar (atual) ou projecao (futuro) -- número de destaque do mês. */
  total: number
}

/**
 * Resumo do ciclo de pagamento de um mês específico. Duas fontes distintas do ERP (mesmo layout
 * de colunas, universos diferentes): `geral` (histórico de vencimento/emissão, quase nunca tem
 * Dt Pagto) alimenta aPagar/projeção; `liquidadas` (100% das linhas com Dt Pagto) é a única fonte
 * confiável de jaLiquidada. Como as duas se sobrepõem parcialmente, aPagar exclui qualquer linha
 * de `geral` cuja chave já apareça em `liquidadas` -- senão a mesma nota/parcela contaria duas
 * vezes (uma como "a pagar", outra como "já liquidada") quando os dois ciclos coincidem.
 *
 * aPagar nunca é calculado pro PASSADO: o vendedor só recebe a comissão quando o cliente paga,
 * então o vencimento de um ciclo que já fechou não pode continuar aparecendo como "a pagar" --
 * isso passaria a impressão errada de que ainda é esperado pra aquele mês específico. Se o
 * título vencido nunca foi pago, ele simplesmente some da visão desse ciclo (o cliente está
 * inadimplente, mas isso não é mais "a pagar do mês X"). Pro ciclo atual e pros futuros, porém,
 * aPagar é uma projeção legítima -- inclusive pros futuros, porque o relatório "geral" já traz
 * o vencimento de títulos emitidos há mais tempo, mesmo que o vencimento caia meses à frente.
 */
export function calcularResumoCicloMes(
  geral: ComissaoErpRow[],
  liquidadas: ComissaoErpRow[],
  ano: number,
  mes: number,
  hoje: Date = new Date()
): ResumoCicloMes {
  const ciclo = cicloDoMes(ano, mes)
  const estado = estadoDoCiclo(ano, mes, hoje)

  let jaLiquidada = 0
  for (const l of liquidadas) {
    if (dentroDoCiclo(l.pagamento, ciclo)) jaLiquidada += l.valorComissao
  }

  let aPagar = 0
  let projecao = 0
  if (estado !== 'passado') {
    const chavesLiquidadas = new Set(liquidadas.map(chaveLinha))
    for (const l of geral) {
      if (dentroDoCiclo(l.vencimento, ciclo) && !chavesLiquidadas.has(chaveLinha(l))) aPagar += l.valorComissao
    }
  }
  if (estado === 'futuro') {
    for (const l of geral) {
      if (dentroDoCiclo(l.emissao, ciclo)) projecao += l.valorComissao
    }
  }

  const total = estado === 'futuro' ? projecao : jaLiquidada + aPagar
  return { ano, mes, ciclo, estado, dataRecebimento: dataRecebimento(ano, mes), jaLiquidada, aPagar, projecao, total }
}

/**
 * Série de ciclos ao redor de `centro` (ex: 4 pra trás, 3 pra frente) -- base do gráfico de
 * tendência. `centro` por padrão é o mês corrente, mas a tela recentraliza a janela no mês
 * selecionado pra sempre ter a barra ativa visível, mesmo depois de navegar pra fora da janela
 * original. `hoje` continua sendo a data real, usada por calcularResumoCicloMes pra decidir o
 * estado (passado/atual/futuro) e, com isso, jaLiquidada/aPagar/projecao de cada mês da série.
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

/**
 * Itens do ciclo de um mês, no modo escolhido -- base da lista de "notas" da tela. Esconde
 * comissão zerada. Modo 'aPagar' não retorna itens quando o ciclo já é PASSADO (mesma regra de
 * `calcularResumoCicloMes`) -- pra um ciclo já fechado, vencimento sem pagamento não é mais
 * "a pagar" desse mês. Pros ciclos atual e futuros, funciona normalmente.
 */
export function montarItensDoCiclo(
  geral: ComissaoErpRow[],
  liquidadas: ComissaoErpRow[],
  ano: number,
  mes: number,
  modo: ModoItensComissao,
  hoje: Date = new Date()
): ComissaoErpRow[] {
  const ciclo = cicloDoMes(ano, mes)
  let filtrados: ComissaoErpRow[]
  let chaveOrdenacao: 'pagamento' | 'vencimento' | 'emissao'

  if (modo === 'liquidada') {
    filtrados = liquidadas.filter((l) => dentroDoCiclo(l.pagamento, ciclo))
    chaveOrdenacao = 'pagamento'
  } else if (modo === 'aPagar') {
    if (estadoDoCiclo(ano, mes, hoje) === 'passado') return []
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
