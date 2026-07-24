import { excluirLiquidadas } from '@/lib/comissoes/calculos'
import type { ComissaoErpRow } from '@/lib/comissoes/types'
import type { NotaFiscalRow, PedidoErpRow } from '@/lib/clientes-bi/types'
import type {
  BucketVencimento,
  ItemAbertoUnificado,
  ItemCarteiraPrazo,
  ItemPedidoAbertoPrazo,
  LimiteCarteiraPrazoRow,
  ResumoBucket,
  ResumoCarteiraPrazo,
} from './types'

function paraIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Dias de `inicio` até `fim` (ambos yyyy-mm-dd) -- positivo se `fim` é depois de `inicio`. */
function diasEntre(inicio: string, fim: string): number {
  const d1 = new Date(inicio + 'T00:00:00')
  const d2 = new Date(fim + 'T00:00:00')
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000)
}

function chaveVendedorNotaParcela(l: ComissaoErpRow): string {
  return `${l.vendedorCodigo}|${l.nota}|${l.parcela}`
}

/** null se `nota` vazia/em branco -- cada linha sem número fica de fora do dedup (nunca agrupada por engano). */
function chaveClienteNotaParcela(l: ComissaoErpRow): string | null {
  const notaLimpa = l.nota.trim()
  return notaLimpa ? `${l.clienteCodigo}|${notaLimpa}|${l.parcela}` : null
}

/**
 * O relatório de comissões (RFT159) tem UMA LINHA POR COMISSIONADO, não uma linha por título a
 * receber -- quando uma venda tem comissão dividida entre mais de um código de vendedor (ex.:
 * vendedor + agenciador, ou dupla matrícula da mesma pessoa), o `liquido` da nota é REPETIDO em
 * cada linha. Confirmado nos dados reais: ~61% das notas em aberto e ~73% das já liquidadas têm
 * mais de um `vendedor_codigo` pra a mesma nota+parcela, com `liquido` idêntico entre elas -- sem
 * este dedup, o status de pagamento seria checado (redundantemente, mas sem risco) várias vezes
 * pela mesma parcela. Mantém a linha de maior `liquido` do grupo (cobre o raro caso de uma segunda
 * linha com `liquido: 0`, sem perder o dado real).
 */
function unicaPorReceber(linhas: ComissaoErpRow[]): ComissaoErpRow[] {
  const porChave = new Map<string, ComissaoErpRow>()
  const semNota: ComissaoErpRow[] = []
  for (const l of linhas) {
    const chave = chaveClienteNotaParcela(l)
    if (!chave) { semNota.push(l); continue }
    const atual = porChave.get(chave)
    if (!atual || l.liquido > atual.liquido) porChave.set(chave, l)
  }
  return [...porChave.values(), ...semNota]
}

/** null se `nota` vazia/em branco -- nunca deixa virar chave real que agrupa várias notas sem número como se fossem uma só. */
function chaveNota(vendedorCodigo: number, nota: string): string | null {
  const notaLimpa = nota.trim()
  return notaLimpa ? `${vendedorCodigo}|${notaLimpa}` : null
}

interface NotaAgregada {
  vendedorCodigo: number
  clienteCodigo: number
  clienteNome: string
  nota: string
  emissao: string
  vencimento: string | null
  pesoToneladas: number | null
  liquido: number
}

/**
 * Agrupa as linhas de produto da nota fiscal (RFT6) por nota inteira -- é a base do painel de
 * Fluxo de Caixa & Crédito desde que a RFT6 passou a trazer vencimento (antes só tinha emissão).
 * Emissão, vencimento e cliente são idênticos em todas as linhas de uma mesma nota (confirmado nos
 * dados reais: 0 de 3.492 notas têm mais de um vencimento distinto), então basta ler da primeira
 * linha encontrada. Peso soma só as linhas `un='KG'` (produto vendido em LT/UN não converte pra
 * tonelada, fica `pesoToneladas: null` se a nota não tiver nenhuma linha em KG); valor soma TODAS
 * as linhas, independente da unidade -- é o valor real da nota fiscal, nunca mais um fallback pro
 * `liquido` do relatório de comissões.
 */
function agregarNotasPorNumero(notasFiscais: NotaFiscalRow[]): Map<string, NotaAgregada> {
  const porNota = new Map<string, NotaAgregada>()
  for (const n of notasFiscais) {
    const chave = chaveNota(n.vendedorCodigo, n.nota)
    if (!chave) continue
    const atual = porNota.get(chave)
    if (!atual) {
      porNota.set(chave, {
        vendedorCodigo: n.vendedorCodigo,
        clienteCodigo: n.clienteCodigo,
        clienteNome: n.clienteNome,
        nota: n.nota,
        emissao: n.emissao,
        vencimento: n.vencimento,
        pesoToneladas: n.un === 'KG' ? n.pesoLiquidoKg / 1000 : null,
        liquido: n.valorLiquido,
      })
    } else {
      if (n.un === 'KG') atual.pesoToneladas = (atual.pesoToneladas ?? 0) + n.pesoLiquidoKg / 1000
      atual.liquido += n.valorLiquido
    }
  }
  return porNota
}

interface StatusPagamentoNota {
  pago: boolean
  /** Data da parcela paga mais recente -- só preenchida quando `pago` é true. */
  pagamento: string | null
  /** false = nenhuma parcela do Relatório de Comissionados bate com essa nota. */
  confirmadoPorComissao: boolean
}

/**
 * Cruza as notas fiscais (chave vendedor+nota) com o Relatório de Comissionados (RFT159) só pra
 * saber o status de pagamento -- a RFT6 não tem data de pagamento, então essa é a ÚNICA fonte
 * disso no painel. Uma nota só conta como paga quando TODAS as parcelas de comissão encontradas
 * pra ela já têm `pagamento` preenchido -- pagamento parcial não abate a nota inteira, porque a
 * exposição de crédito real dela só se resolve quando é quitada por completo (mesmo espírito do
 * "só sai da carteira quando o pagamento é registrado" já usado antes, aplicado agora por nota em
 * vez de por parcela). Nota sem NENHUMA parcela correspondente (nunca foi lançada no relatório de
 * comissões) fica `confirmadoPorComissao: false` e `pago: false` -- tratada conservadoramente como
 * em aberto, nunca invisível no painel só porque o processo de comissionamento ainda não rodou.
 */
function statusPagamentoPorNota(geral: ComissaoErpRow[], liquidadas: ComissaoErpRow[]): Map<string, StatusPagamentoNota> {
  const comissoes = unicaPorReceber([...excluirLiquidadas(geral, liquidadas, chaveVendedorNotaParcela), ...liquidadas])
  const parcelasPorNota = new Map<string, ComissaoErpRow[]>()
  for (const c of comissoes) {
    const chave = chaveNota(c.vendedorCodigo, c.nota)
    if (!chave) continue
    const lista = parcelasPorNota.get(chave)
    if (lista) lista.push(c)
    else parcelasPorNota.set(chave, [c])
  }

  const resultado = new Map<string, StatusPagamentoNota>()
  for (const [chave, parcelas] of parcelasPorNota) {
    const pago = parcelas.every((p) => p.pagamento !== null)
    let pagamento: string | null = null
    if (pago) {
      for (const p of parcelas) {
        if (p.pagamento && (!pagamento || p.pagamento > pagamento)) pagamento = p.pagamento
      }
    }
    resultado.set(chave, { pago, pagamento, confirmadoPorComissao: true })
  }
  return resultado
}

// ─── Carteira a Prazo (buckets por dias-até-vencimento/entrega) ────────────

const ORDEM_BUCKETS: BucketVencimento[] = ['vencido', 'ate_30', 'ate_60', 'ate_90', 'ate_120', 'ate_180', 'ate_210', 'mais_210', 'sem_vencimento']

export function bucketDeVencimento(dias: number | null): BucketVencimento {
  if (dias === null) return 'sem_vencimento'
  if (dias < 0) return 'vencido'
  if (dias <= 30) return 'ate_30'
  if (dias <= 60) return 'ate_60'
  if (dias <= 90) return 'ate_90'
  if (dias <= 120) return 'ate_120'
  if (dias <= 180) return 'ate_180'
  if (dias <= 210) return 'ate_210'
  return 'mais_210'
}

/**
 * Só notas ainda não pagas (por nota inteira, ver `statusPagamentoPorNota`) -- dias-até-vencimento
 * recalculado em tempo real (a mesma nota "desce" de bucket conforme os dias passam, incluindo o
 * bucket "até 30" que é sempre uma janela rolante a partir de hoje, nunca uma data fixa). Uma nota
 * sai da carteira assim que TODAS as suas parcelas de comissão aparecem com pagamento registrado.
 * Reage em tempo real porque a tela já assina mudanças em `comissoes_erp_importadas` e
 * `notas_fiscais_importadas` via `inscreverFluxoCaixaEmTempoReal`.
 */
export function montarItensCarteiraPrazo(
  notasFiscais: NotaFiscalRow[],
  geral: ComissaoErpRow[],
  liquidadas: ComissaoErpRow[],
  hoje: Date = new Date()
): ItemCarteiraPrazo[] {
  const notas = agregarNotasPorNumero(notasFiscais)
  const statusPorNota = statusPagamentoPorNota(geral, liquidadas)
  const hojeIso = paraIso(hoje)

  const abertos = [...notas.values()].filter((n) => {
    const chave = chaveNota(n.vendedorCodigo, n.nota)
    const status = chave ? statusPorNota.get(chave) : undefined
    return !(status?.pago ?? false)
  })

  return abertos.map((n) => {
    const dias = n.vencimento ? diasEntre(hojeIso, n.vencimento) : null
    const chave = chaveNota(n.vendedorCodigo, n.nota)
    const status = chave ? statusPorNota.get(chave) : undefined
    return {
      vendedorCodigo: n.vendedorCodigo,
      clienteCodigo: n.clienteCodigo,
      clienteNome: n.clienteNome,
      nota: n.nota,
      emissao: n.emissao,
      vencimento: n.vencimento,
      liquido: n.liquido,
      confirmadoPorComissao: status?.confirmadoPorComissao ?? false,
      diasAteVencimento: dias,
      bucket: bucketDeVencimento(dias),
      vencido: dias !== null && dias < 0,
      pesoToneladas: n.pesoToneladas,
    }
  })
}

function agruparPorBucket<T extends { bucket: BucketVencimento }>(
  itens: T[],
  pesoDe: (item: T) => number,
  reaisDe: (item: T) => number
): ResumoBucket<T>[] {
  const porBucket = new Map<BucketVencimento, T[]>()
  for (const b of ORDEM_BUCKETS) porBucket.set(b, [])
  for (const i of itens) porBucket.get(i.bucket)!.push(i)

  return ORDEM_BUCKETS.map((bucket) => {
    const lista = porBucket.get(bucket)!
    return {
      bucket,
      totalReais: lista.reduce((s, i) => s + reaisDe(i), 0),
      totalToneladas: lista.reduce((s, i) => s + pesoDe(i), 0),
      itens: lista,
    }
  })
}

export function alertaReservaSafrinha(totalToneladas: number, limiteToneladas: number, reservaPct: number, reservaLiberada: boolean): boolean {
  if (reservaLiberada) return false // reserva já liberada -- não há mais "área de segurança" pra alertar
  // Limite zerado/mal configurado com exposição real: sempre alerta (nunca "0% usado" escondendo o problema).
  if (limiteToneladas <= 0) return totalToneladas > 0
  const limiteConsumivel = limiteToneladas * (1 - reservaPct / 100) // ex.: 70% de 10.000t = 7.000t
  return totalToneladas > limiteConsumivel
}

/**
 * `itensNotas` (nota fiscal emitida, ainda não paga) + `itensPedidos` (pedido em aberto, ainda não
 * faturado) somados no mesmo conjunto de buckets -- é a Carteira a Prazo completa (Pilar 2: "vendeu
 * a prazo consome a cota", não só quando vira nota fiscal). Único critério de exclusão é já ter
 * sido pago (`montarItensCarteiraPrazo`/`montarItensPedidosAbertoPrazo` já filtram isso na origem)
 * -- sem piso de dias nem restrição de ano nos buckets exibidos: um título vencido e não pago
 * continua no Painel de Recebimentos, exposto no bucket "vencido" em vez de sumir da tela.
 *
 * A COTA da safrinha (`totalToneladas`/`totalReais`, o que alimenta o medidor) é mais restrita:
 * título vencido com vencimento/entrega de ano anterior ao corrente não consome mais a cota -- é
 * dívida velha (cobrança/write-off), não exposição de crédito ativa do ciclo vigente. Continua
 * contado no bucket "vencido" acima (nunca invisível), só sai da conta que dispara o alerta de
 * reserva da safrinha.
 */
export function calcularResumoCarteiraPrazo(
  itensNotas: ItemCarteiraPrazo[],
  itensPedidos: ItemPedidoAbertoPrazo[],
  limite: LimiteCarteiraPrazoRow,
  hoje: Date = new Date()
): ResumoCarteiraPrazo {
  const anoAtual = hoje.getFullYear()

  const itensUnificados: ItemAbertoUnificado[] = [
    ...itensNotas.map((i) => ({ ...i, tipo: 'nota' as const })),
    ...itensPedidos.map((i) => ({ ...i, tipo: 'pedido' as const })),
  ]

  const buckets = agruparPorBucket(
    itensUnificados,
    (i) => (i.tipo === 'nota' ? i.pesoToneladas ?? 0 : i.pesoSaldoToneladas),
    (i) => (i.tipo === 'nota' ? i.liquido : i.valorSaldo)
  )

  const pesoDe = (i: ItemAbertoUnificado) => (i.tipo === 'nota' ? i.pesoToneladas ?? 0 : i.pesoSaldoToneladas)
  const reaisDe = (i: ItemAbertoUnificado) => (i.tipo === 'nota' ? i.liquido : i.valorSaldo)
  const anoDoVencimento = (i: ItemAbertoUnificado): number | null => {
    const data = i.tipo === 'nota' ? i.vencimento : i.entrega
    return data ? Number(data.slice(0, 4)) : null
  }

  const paraQuota = itensUnificados.filter((i) => i.bucket !== 'vencido' || anoDoVencimento(i) === anoAtual)
  const vencidoOutroAno = itensUnificados.filter((i) => i.bucket === 'vencido' && anoDoVencimento(i) !== anoAtual)

  const totalToneladas = paraQuota.reduce((s, i) => s + pesoDe(i), 0)
  const totalReais = paraQuota.reduce((s, i) => s + reaisDe(i), 0)
  const totalReaisVencidoOutroAno = vencidoOutroAno.reduce((s, i) => s + reaisDe(i), 0)
  const totalToneladasVencidoOutroAno = vencidoOutroAno.reduce((s, i) => s + pesoDe(i), 0)

  const notasParaQuota = paraQuota.filter((i): i is ItemCarteiraPrazo & { tipo: 'nota' } => i.tipo === 'nota')
  const totalReaisSemPeso = notasParaQuota.filter((i) => i.pesoToneladas === null).reduce((s, i) => s + i.liquido, 0)
  const totalReaisNaoConfirmado = notasParaQuota.filter((i) => !i.confirmadoPorComissao).reduce((s, i) => s + i.liquido, 0)
  // Limite zerado/mal configurado com exposição real: mostra 100% (gauge cheio/alerta), nunca "0% usado" --
  // um limite de 0t com toneladas reais em aberto é o pior caso possível, não "nada consumido".
  const percentualUsado = limite.limiteToneladas > 0 ? (totalToneladas / limite.limiteToneladas) * 100 : totalToneladas > 0 ? 100 : 0

  return {
    limiteToneladas: limite.limiteToneladas,
    reservaPct: limite.reservaPct,
    reservaLiberada: limite.reservaLiberada,
    buckets,
    totalToneladas,
    totalReais,
    totalReaisSemPeso,
    totalReaisNaoConfirmado,
    totalReaisVencidoOutroAno,
    totalToneladasVencidoOutroAno,
    percentualUsado,
    alertaReserva: alertaReservaSafrinha(totalToneladas, limite.limiteToneladas, limite.reservaPct, limite.reservaLiberada),
  }
}

// ─── Pedidos em aberto a prazo (proxy por dias-até-entrega) ────────────────

/**
 * `entrega` é logística, não prazo de pagamento real (esse dado não existe em nenhuma tabela do
 * sistema hoje) -- usado como PROXY aceito explicitamente pelo usuário, deve ser rotulado como
 * estimativa na UI. `peso_saldo_kg` já vem em KG independente da unidade de venda (confirmado no
 * parser de `pedidos_erp_importados`), sem precisar filtrar por `un`.
 */
export function montarItensPedidosAbertoPrazo(pedidos: PedidoErpRow[], hoje: Date = new Date()): ItemPedidoAbertoPrazo[] {
  const hojeIso = paraIso(hoje)
  return pedidos
    .filter((p) => p.quantidadeSaldo > 0)
    .map((p) => {
      const dias = p.entrega ? diasEntre(hojeIso, p.entrega) : null
      return {
        vendedorCodigo: p.vendedorCodigo,
        clienteCodigo: p.clienteCodigo,
        clienteNome: p.clienteNome,
        numeroPedido: p.numeroPedido,
        emissao: p.emissao,
        entrega: p.entrega,
        pesoSaldoToneladas: p.pesoSaldoKg / 1000,
        valorSaldo: p.valorSaldo,
        diasAteEntrega: dias,
        bucket: bucketDeVencimento(dias),
      }
    })
}
