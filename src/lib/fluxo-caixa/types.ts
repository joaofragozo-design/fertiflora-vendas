/**
 * "À vista" inclui pagamento em até 5 dias do faturamento -- não é só pagamento no mesmo dia.
 * `em_aberto` = ainda não pago (`pagamento` null) -- não entra nas faixas de velocidade de
 * pagamento porque não é um dado final: um título em aberto de 2022 sem `pagamento` registrado
 * não significa "atrasou 1600 dias", significa "não sabemos" (o relatório de comissões pode
 * simplesmente não ter sido reimportado com o pagamento daquele período). Fica destacado à parte
 * (cinza) em vez de contaminar `mais_90` com um sinal que parece atraso real mas não é.
 */
export type FaixaDDF = 'a_vista' | 'ate_30' | 'ate_90' | 'mais_90' | 'em_aberto'

/** Atraso vs a data COMBINADA (vencimento), não vs a emissão -- distingue prazo longo acertado (ex.: financiamento até a colheita) de atraso de verdade. `em_aberto` tem a mesma razão de ser da versão em `FaixaDDF` (título ainda não pago não é atraso confirmado). */
export type FaixaAtraso = 'adiantado' | 'ate_15' | 'ate_30' | 'mais_30' | 'sem_vencimento' | 'em_aberto'

export interface ItemAgingDDF {
  vendedorCodigo: number
  clienteCodigo: number | null
  clienteNome: string
  nota: string
  emissao: string // yyyy-mm-dd -- direto da nota fiscal (RFT6), não mais do relatório de comissões
  vencimento: string | null // direto da nota fiscal (RFT6) -- um único vencimento por nota inteira
  pagamento: string | null
  /** Valor real da nota fiscal (RFT6), somado por nota -- fonte de verdade do R$, nunca mais um fallback pro `liquido` de comissões. */
  liquido: number
  /** false = nenhuma parcela do Relatório de Comissionados (RFT159) bate com essa nota -- não dá pra confirmar se foi paga, então conta como `pago: false` por padrão (conservador). Nunca esconder isso do usuário. */
  confirmadoPorComissao: boolean
  /** Dias depois do faturamento -- até `pagamento` se já pago, senão até hoje (envelhece em tempo real). */
  ddf: number
  faixa: FaixaDDF
  /** pagamento (ou hoje) - vencimento. Negativo/zero = pagou em dia ou adiantado. Null se não há vencimento cadastrado. */
  atraso: number | null
  faixaAtraso: FaixaAtraso
  pago: boolean
  /** Somado direto das linhas `un='KG'` da nota fiscal -- real, não mais uma estimativa por rateio. null se a nota não tem nenhuma linha em KG. */
  pesoToneladas: number | null
}

/** Genérico: serve tanto pra distribuição por DDF (dias desde emissão) quanto por atraso (dias vs vencimento combinado). */
export interface AgingAno<F extends string> {
  ano: number
  totalReais: number
  totalToneladas: number
  porFaixaReais: Record<F, number>
  porFaixaToneladas: Record<F, number>
  /** Parcela de `totalReais` sem NENHUMA correspondência no Relatório de Comissionados -- status de pagamento não confirmado, tratado como `em_aberto` por padrão (ver `ItemAgingDDF.confirmadoPorComissao`). */
  totalReaisNaoConfirmado: number
}
export type AgingAnoDDF = AgingAno<FaixaDDF>
export type AgingAnoAtraso = AgingAno<FaixaAtraso>

export type BucketVencimento = 'vencido' | 'ate_30' | 'ate_60' | 'ate_90' | 'ate_120' | 'ate_180' | 'mais_180' | 'sem_vencimento'

export interface ItemCarteiraPrazo {
  vendedorCodigo: number
  clienteCodigo: number | null
  clienteNome: string
  nota: string
  emissao: string // yyyy-mm-dd -- direto da nota fiscal (RFT6); usado pra restringir a Carteira a Prazo ao ano corrente (safra vigente)
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

/** Genérico pra servir tanto a carteira a prazo (notas) quanto o sub-gráfico de pedidos abertos. */
export interface ResumoBucket<T> {
  bucket: BucketVencimento
  totalReais: number
  totalToneladas: number
  itens: T[]
}
export type ResumoBucketCarteiraPrazo = ResumoBucket<ItemCarteiraPrazo>

export interface ResumoCarteiraPrazo {
  limiteToneladas: number
  reservaPct: number
  reservaLiberada: boolean
  buckets: ResumoBucketCarteiraPrazo[]
  /** Notas em aberto + pedidos ainda não faturados -- o que efetivamente consome a cota (Pilar 2: "vendeu a prazo consome a cota"). */
  totalToneladas: number
  /** Soma do `liquido` de notas sem nenhuma linha em KG (vendidas só em outra unidade) -- não entram no totalToneladas, exposto por transparência, nunca zerado silenciosamente. */
  totalReaisSemPeso: number
  /** Soma do `liquido` de notas sem NENHUMA correspondência no Relatório de Comissionados -- status de pagamento não confirmado, tratadas como em aberto por padrão (ver `ItemCarteiraPrazo.confirmadoPorComissao`). */
  totalReaisNaoConfirmado: number
  /** Soma do `liquido` de títulos vencidos ou com menos de 60 dias até o vencimento -- não consomem mais a cota (perto demais de se resolver sozinhos), mas exposto aqui por transparência, nunca descartado silenciosamente. */
  totalReaisForaDoPrazo: number
  /** Toneladas correspondentes a `totalReaisForaDoPrazo` (mesma exclusão de <60 dias). */
  totalToneladasForaDoPrazo: number
  /** Soma do `liquido` de títulos/pedidos com emissão fora do ano corrente -- a cota é da safra vigente, dado antigo (2022-2024 etc.) não deve mais consumi-la, mesmo que ainda apareça "em aberto" por falta de confirmação de pagamento. */
  totalReaisForaDoAno: number
  /** Toneladas correspondentes a `totalReaisForaDoAno`. */
  totalToneladasForaDoAno: number
  percentualUsado: number
  alertaReserva: boolean
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
export type ResumoBucketPedidos = ResumoBucket<ItemPedidoAbertoPrazo>

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
