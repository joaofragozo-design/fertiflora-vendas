export type BucketVencimento =
  | 'vencido'
  | 'ate_30'
  | 'ate_60'
  | 'ate_90'
  | 'ate_120'
  | 'ate_180'
  | 'ate_210'
  | 'mais_210'
  | 'sem_vencimento'

export interface ItemCarteiraPrazo {
  vendedorCodigo: number
  clienteCodigo: number | null
  clienteNome: string
  nota: string
  emissao: string // yyyy-mm-dd -- direto da nota fiscal (RFT6)
  vencimento: string | null // direto da nota fiscal (RFT6) -- um único vencimento por nota inteira
  /** Valor real da nota fiscal (RFT6), somado por nota -- fonte de verdade do R$, nunca mais um fallback pro `liquido` de comissões. */
  liquido: number
  /** false = nenhuma parcela do Relatório de Comissionados (RFT159) bate com essa nota -- não dá pra confirmar se foi paga, então conta como em aberto por padrão (conservador). Nunca esconder isso do usuário. */
  confirmadoPorComissao: boolean
  /** vencimento - hoje (negativo = vencido). null quando não há vencimento cadastrado. */
  diasAteVencimento: number | null
  bucket: BucketVencimento
  vencido: boolean
  /** Somado direto das linhas `un='KG'` da nota fiscal -- real, não mais uma estimativa por rateio. null se a nota não tem nenhuma linha em KG. */
  pesoToneladas: number | null
}

/** Genérico pra servir qualquer lista agrupada por bucket de dias-até-vencimento. */
export interface ResumoBucket<T> {
  bucket: BucketVencimento
  totalReais: number
  totalToneladas: number
  itens: T[]
}

export type BucketEntrega = BucketVencimento

export interface ItemPedidoAbertoPrazo {
  vendedorCodigo: number
  clienteCodigo: number
  clienteNome: string
  numeroPedido: string
  emissao: string
  entrega: string | null
  pesoSaldoToneladas: number
  valorSaldo: number
  /** entrega - hoje, usado como PROXY de prazo (não é prazo de pagamento real -- esse dado não existe no ERP hoje). */
  diasAteEntrega: number | null
  bucket: BucketEntrega
}

/**
 * União discriminada por `tipo` -- combina nota fiscal emitida (ainda não paga) e pedido em aberto
 * (ainda não faturado) no mesmo conjunto de buckets, já que a Carteira a Prazo passou a somar os
 * dois (Pilar 2: "vendeu a prazo consome a cota", não só quando vira nota fiscal).
 */
export type ItemAbertoUnificado = (ItemCarteiraPrazo & { tipo: 'nota' }) | (ItemPedidoAbertoPrazo & { tipo: 'pedido' })
export type ResumoBucketAberto = ResumoBucket<ItemAbertoUnificado>

export interface ResumoCarteiraPrazo {
  limiteToneladas: number
  reservaPct: number
  reservaLiberada: boolean
  buckets: ResumoBucketAberto[]
  /** Notas em aberto + pedidos ainda não faturados -- único critério de exclusão é já ter sido pago; sem piso de dias nem restrição de ano. */
  totalToneladas: number
  /** Mesmo total em R$ -- alimenta o Painel de Recebimentos na chave R$/toneladas. */
  totalReais: number
  /** Soma do `liquido` de notas sem nenhuma linha em KG (vendidas só em outra unidade) -- não entram no totalToneladas, exposto por transparência, nunca zerado silenciosamente. */
  totalReaisSemPeso: number
  /** Soma do `liquido` de notas sem NENHUMA correspondência no Relatório de Comissionados -- status de pagamento não confirmado, tratadas como em aberto por padrão (ver `ItemCarteiraPrazo.confirmadoPorComissao`). */
  totalReaisNaoConfirmado: number
  /** Soma do `liquido`/`valorSaldo` de títulos vencidos com vencimento/entrega de ano DIFERENTE do corrente -- dívida velha (cobrança/write-off), não exposição de crédito ativa da safra vigente. Não entra em `totalToneladas`/`totalReais` (a cota), mas continua visível no bucket "Vencido" acima (nunca some da tela), por transparência. */
  totalReaisVencidoOutroAno: number
  /** Toneladas correspondentes a `totalReaisVencidoOutroAno`. */
  totalToneladasVencidoOutroAno: number
  percentualUsado: number
  alertaReserva: boolean
}

export interface LimiteCarteiraPrazoRow {
  id: string
  chavePeriodo: string
  limiteToneladas: number
  reservaPct: number
  reservaLiberada: boolean
  reservaLiberadaEm: string | null
  criadoEm: string
  criadoPor: string | null
}

export function limiteCarteiraPrazoFromRow(row: Record<string, unknown>): LimiteCarteiraPrazoRow {
  return {
    id: row.id as string,
    chavePeriodo: row.chave_periodo as string,
    limiteToneladas: Number(row.limite_toneladas),
    reservaPct: Number(row.reserva_pct),
    reservaLiberada: row.reserva_liberada as boolean,
    reservaLiberadaEm: (row.reserva_liberada_em as string) ?? null,
    criadoEm: row.criado_em as string,
    criadoPor: (row.criado_por as string) ?? null,
  }
}
