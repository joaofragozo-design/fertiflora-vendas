export type Embalagem = 'saco_50kg' | 'bag_750kg' | 'bag_1000kg'

export interface EmbalagemInfo {
  valor: Embalagem
  rotulo: string
  pesoTon: number
}

export const EMBALAGENS: EmbalagemInfo[] = [
  { valor: 'saco_50kg', rotulo: 'Saco 50kg', pesoTon: 0.05 },
  { valor: 'bag_750kg', rotulo: 'Bag 750kg', pesoTon: 0.75 },
  { valor: 'bag_1000kg', rotulo: 'Bag 1000kg', pesoTon: 1 },
]

export function infoEmbalagem(valor: Embalagem): EmbalagemInfo {
  return EMBALAGENS.find((e) => e.valor === valor) ?? EMBALAGENS[1]
}

/**
 * rascunho -> aguardando_conferencia -> [reprovado_conferencia]
 *                                     -> aguardando_analise_credito -> [aprovado_credito | reprovado_credito]
 */
export type StatusPedido =
  | 'rascunho'
  | 'aguardando_conferencia'
  | 'reprovado_conferencia'
  | 'aguardando_analise_credito'
  | 'aprovado_credito'
  | 'reprovado_credito'

/** Tudo que o PDF do contrato precisa — congelado no momento da geração, igual ao comprovante de cotação. */
export interface PedidoDados {
  clienteNome: string
  clienteCpfCnpj: string
  clienteInscricaoEstadual: string | null
  clienteEndereco: string
  clienteCidade: string | null
  clienteEstado: string | null
  clienteCep: string | null
  clienteEmail: string | null
  clienteTelefone: string | null
  vendedorNome: string
  vendedorTelefone: string | null
  produto: string
  precoVendidoTon: number
  freteTon: number
  vencimento: string | null
  dolar: number | null
  /** Percentuais (0-1) travados na cotação de origem — pra admin ver a comissão sem recalcular. */
  comissaoPct: number | null
  agenciadorPct: number | null
  /** Preço da cotação de origem ficou abaixo do mínimo — mostra aviso até a decisão final da análise de crédito. */
  abaixoDoMinimo: boolean
}

export interface Pedido {
  id: string
  vendedorId: string
  clienteId: string
  cotacaoId: string
  numeroContrato: string | null
  quantidadeToneladas: number
  embalagem: Embalagem
  status: StatusPedido
  dados: PedidoDados
  createdAt: string
  solicitadoEm: string | null
  conferidoEm: string | null
  conferidoPor: string | null
  motivoReprovacaoConferencia: string | null
  decididoEm: string | null
  decididoPor: string | null
  motivoRejeicao: string | null
}

/** Mostra o aviso enquanto o pedido não passou pela decisão final da análise de crédito. */
export function precisaAvisoMinimo(p: Pedido): boolean {
  return p.dados.abaixoDoMinimo && p.status !== 'aprovado_credito' && p.status !== 'reprovado_credito'
}

export function pedidoFromRow(row: Record<string, unknown>): Pedido {
  return {
    id: row.id as string,
    vendedorId: row.vendedor_id as string,
    clienteId: row.cliente_id as string,
    cotacaoId: row.cotacao_id as string,
    numeroContrato: (row.numero_contrato as string) ?? null,
    quantidadeToneladas: Number(row.quantidade_toneladas),
    embalagem: row.embalagem as Embalagem,
    status: row.status as StatusPedido,
    dados: row.dados as PedidoDados,
    createdAt: row.created_at as string,
    solicitadoEm: (row.solicitado_em as string) ?? null,
    conferidoEm: (row.conferido_em as string) ?? null,
    conferidoPor: (row.conferido_por as string) ?? null,
    motivoReprovacaoConferencia: (row.motivo_reprovacao_conferencia as string) ?? null,
    decididoEm: (row.decidido_em as string) ?? null,
    decididoPor: (row.decidido_por as string) ?? null,
    motivoRejeicao: (row.motivo_rejeicao as string) ?? null,
  }
}

export interface CalculoPedido {
  quantidadeUnidades: number
  precoUnitario: number
  valorTotalProduto: number
  freteTotal: number
  valorTotalPedido: number
}

export function calcularPedido(quantidadeToneladas: number, embalagem: Embalagem, precoVendidoTon: number, freteTon: number): CalculoPedido {
  const peso = infoEmbalagem(embalagem).pesoTon
  const quantidadeUnidades = peso > 0 ? quantidadeToneladas / peso : 0
  const precoUnitario = precoVendidoTon * peso
  const valorTotalProduto = quantidadeToneladas * precoVendidoTon
  const freteTotal = quantidadeToneladas * freteTon
  return { quantidadeUnidades, precoUnitario, valorTotalProduto, freteTotal, valorTotalPedido: valorTotalProduto + freteTotal }
}
