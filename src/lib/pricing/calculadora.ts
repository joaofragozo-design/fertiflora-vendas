/**
 * Motor de cálculo da cotação — porta fiel das fórmulas da planilha
 * "TABELA DE VENDAS NOVA" (dólar em tempo real em vez de manual, conforme
 * decidido; alerta de reprovação corrigido do bug de case-sensitivity do
 * original). Validado contra o exemplo real da planilha antes de portar.
 */

export const ICMS_TABLE: Record<string, number> = { SC: 0.04, MT: 0.04, PR: 0.0, SP: 0.04, MS: 0.04, RO: 0.04 }
export const ICMS_DEFAULT = 0.04

export const TAXA_AM = 0.022 // TAXA %(A.M) — juros mensal sobre o preço à vista
export const TAXA_MP = 0.014 // TAXA MP — juros mensal sobre a base de frete (US$44,80)
export const TAXA_AM_DOLAR = 0.0 // TAXA A.M DOLAR — projeção de valorização do dólar ao mês
export const FRETE_BASE_USD = 44.8
export const COMISSAO_BASE_NIVEL = 0.05 // Nível III — nível de comissão ainda não é configurável por vendedor

const BRACKETS = [
  { limite: -0.07, coef: -1.0 }, { limite: -0.06, coef: -0.85 }, { limite: -0.05, coef: -0.7 },
  { limite: -0.04, coef: -0.55 }, { limite: -0.03, coef: -0.4 }, { limite: -0.02, coef: -0.25 },
  { limite: -0.01, coef: -0.1 }, { limite: 0.005, coef: 0.0 },
  { limite: 0.01, coef: 0.1 }, { limite: 0.02, coef: 0.2 }, { limite: 0.03, coef: 0.3 },
  { limite: 0.04, coef: 0.4 }, { limite: 0.05, coef: 0.5 }, { limite: 0.06, coef: 0.6 },
  { limite: 0.07, coef: 0.7 }, { limite: 0.08, coef: 0.8 }, { limite: 0.09, coef: 0.9 },
  { limite: 0.1, coef: 1.0 },
]

export interface CotacaoInput {
  precoAvistaUSD: number
  estado: string
  entrega: Date
  pagamento: Date
  frete: number
  agenciadorPct: number
  precoVendido: number
  dolarAgora: number
  dataTabela: Date
}

export interface CotacaoResultado {
  icms: number
  eAVista: boolean
  precoTabela: number
  precoMinimo: number
  precoSaca: number
  precoBag: number
  precoUsd: number
  pedidoEntrega: 'FUTURA' | 'IMEDIATA'
  campanhaAvista: number | null
  bonusAvista: number
  bonusPorPreco: number
  ajusteAgenciador: number
  comissaoCalculada: number
  projecaoComissao: number
  aprovado: boolean
}

function diffDias(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

export function calcularCotacao(input: CotacaoInput): CotacaoResultado {
  const { precoAvistaUSD, entrega, pagamento, frete, agenciadorPct, precoVendido, dolarAgora, dataTabela } = input
  const icms = ICMS_TABLE[input.estado] ?? ICMS_DEFAULT

  // O18 dias até travar / O19 dólar calc
  const diasAteTravar = pagamento < entrega ? diffDias(pagamento, dataTabela) : diffDias(entrega, dataTabela)
  const taxaDiariaDolar = TAXA_AM_DOLAR / 30
  const dolarCalc = dolarAgora * Math.pow(1 + taxaDiariaDolar, diasAteTravar)

  // L25 prazo
  const eAVista = diffDias(pagamento, entrega) <= 7

  // O40 prazo em meses / O39 prazo até carregamento
  const diasEntregaMenosTabela = diffDias(entrega, dataTabela)
  const prazoEmMeses = diasEntregaMenosTabela > 0
    ? Math.max(0, diffDias(pagamento, entrega) / 30)
    : Math.max(0, diffDias(pagamento, dataTabela) / 30)
  const prazoAteCarregamento = pagamento < entrega
    ? Math.max(0, diffDias(pagamento, dataTabela) / 30)
    : Math.max(0, (diffDias(entrega, dataTabela) - 15) / 30)

  // O42 valor com juros (USD)
  const valorComJuros = precoAvistaUSD * Math.pow(1 + TAXA_AM, prazoEmMeses)
    + (precoAvistaUSD - FRETE_BASE_USD) * Math.pow(1 + TAXA_MP, prazoAteCarregamento)
    - (precoAvistaUSD - FRETE_BASE_USD)

  // O44 valor em reais
  const maisDe30Dias = diasEntregaMenosTabela > 30
  const valorEmReais = maisDe30Dias ? dolarCalc * valorComJuros : valorComJuros * dolarAgora

  // O46 valor final (com agenciador embutido no valor bruto de referência)
  const valorFinal = valorEmReais + agenciadorPct * valorEmReais

  // O47 preço final com ICMS + frete = preço de tabela
  const precoTabela = (valorFinal + frete) / (1 - icms) / 0.99075

  // L44 preço mínimo (92% da tabela, arredondado p/ baixo)
  const precoMinimo = Math.floor(precoTabela * 0.92 * 100) / 100

  const precoSaca = precoTabela / 20
  const precoBag = precoTabela * 0.75
  const precoUsd = precoTabela / dolarAgora

  const pedidoEntrega: 'FUTURA' | 'IMEDIATA' = diasEntregaMenosTabela > 60 ? 'FUTURA' : 'IMEDIATA'

  // L50 preço campanha à vista
  const campanhaAvista = entrega >= pagamento ? precoTabela * 0.98 : null
  const precoTTabela = campanhaAvista ?? precoTabela

  // comissão
  const pctPreco = precoTTabela > 0 ? (precoVendido - precoTTabela) / precoTTabela : 0
  let coef = 1.0
  for (const b of BRACKETS) {
    if (pctPreco < b.limite) { coef = b.coef; break }
  }
  const bonusPorPreco = coef * COMISSAO_BASE_NIVEL
  const bonusAvista = eAVista ? 0.01 : 0

  const liquidoSemAgenciador = precoVendido - frete - precoVendido * icms
  const agenciadorRS = agenciadorPct * liquidoSemAgenciador
  const liquidoComAgenciador = liquidoSemAgenciador - agenciadorRS
  const comissaoAntesAgenciador = COMISSAO_BASE_NIVEL + bonusAvista + bonusPorPreco
  const comissaoDiluida = liquidoSemAgenciador > 0
    ? (liquidoComAgenciador * comissaoAntesAgenciador) / liquidoSemAgenciador
    : comissaoAntesAgenciador
  const ajusteAgenciador = comissaoDiluida - comissaoAntesAgenciador

  const comissaoCalculada = COMISSAO_BASE_NIVEL + bonusAvista + bonusPorPreco + ajusteAgenciador
  const projecaoComissao = liquidoSemAgenciador * comissaoCalculada

  const aprovado = precoVendido >= precoMinimo

  return {
    icms, eAVista, precoTabela, precoMinimo, precoSaca, precoBag, precoUsd,
    pedidoEntrega, campanhaAvista, bonusAvista, bonusPorPreco, ajusteAgenciador,
    comissaoCalculada, projecaoComissao, aprovado,
  }
}
