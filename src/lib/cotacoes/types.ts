export interface CotacaoDados {
  estado: string
  entrega: string
  frete: string
  agenciador: string
  modoPagamento: 'avista' | 'parcelado'
  pagamentoAvista: string
  parcelas: { percentual: number; data: string }[]
  dolar: number | null
  precoVendido: number
  secoes: { title: string; rows: [string, string][]; destaque?: number }[]
  validadeGeracao: string
  /** Data em que o pagamento (e portanto a comissão) efetivamente cai — vista ou média das parcelas. */
  dataComissao: string
  /** Congelados no momento do salvamento — o dólar pode mudar depois, o comprovante não. */
  comissaoPorTonelada: number
  agenciadorPorTonelada: number
  /** Percentuais (0-1) travados no fechamento — mesma base usada pra calcular os R$ acima. */
  comissaoPct: number
  agenciadorPct: number
}

export interface CotacaoSalva {
  id: string
  vendedorId: string
  clienteId: string | null
  produto: string
  precoVendido: number
  aprovado: boolean
  quantidadeToneladas: number
  comissaoTotal: number
  dados: CotacaoDados
  createdAt: string
}

export const HISTORICO_APOS_DIAS = 7

export function statusCotacao(createdAt: string): 'valida' | 'historico' {
  const dias = (Date.now() - new Date(createdAt).getTime()) / 86400000
  return dias > HISTORICO_APOS_DIAS ? 'historico' : 'valida'
}

export function cotacaoFromRow(row: Record<string, unknown>): CotacaoSalva {
  return {
    id: row.id as string,
    vendedorId: row.vendedor_id as string,
    clienteId: (row.cliente_id as string) ?? null,
    produto: row.produto as string,
    precoVendido: Number(row.preco_vendido),
    aprovado: row.aprovado as boolean,
    quantidadeToneladas: Number(row.quantidade_toneladas ?? 1),
    comissaoTotal: Number(row.comissao_total ?? 0),
    dados: row.dados as CotacaoDados,
    createdAt: row.created_at as string,
  }
}

export interface CotacaoConfig {
  id: string
  travada: boolean
  travadaEm: string | null
}

export function cotacaoConfigFromRow(row: Record<string, unknown>): CotacaoConfig {
  return {
    id: row.id as string,
    travada: row.travada as boolean,
    travadaEm: (row.travada_em as string) ?? null,
  }
}
