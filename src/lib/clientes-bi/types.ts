export interface NotaFiscalRow {
  vendedorCodigo: number
  vendedorNome: string
  clienteCodigo: number
  clienteNome: string
  nota: string
  emissao: string // yyyy-mm-dd
  produto: string
  municipio: string
  un: string
  quantidade: number
  pesoLiquidoKg: number
  valorLiquido: number
}

export function notaFiscalFromRow(row: Record<string, unknown>): NotaFiscalRow {
  return {
    vendedorCodigo: Number(row.vendedor_codigo),
    vendedorNome: row.vendedor_nome as string,
    clienteCodigo: Number(row.cliente_codigo),
    clienteNome: row.cliente_nome as string,
    nota: (row.nota as string) ?? '',
    emissao: row.emissao as string,
    produto: row.produto as string,
    municipio: (row.municipio as string) ?? '',
    un: row.un as string,
    quantidade: Number(row.quantidade),
    pesoLiquidoKg: Number(row.peso_liquido_kg),
    valorLiquido: Number(row.valor_liquido),
  }
}

export interface ClienteResumo {
  codigo: number
  nome: string
}

export interface PedidoErpRow {
  vendedorCodigo: number
  vendedorNome: string
  clienteCodigo: number
  clienteNome: string
  numeroPedido: string
  emissao: string // yyyy-mm-dd
  entrega: string | null
  produto: string
  status: string
  un: string
  quantidadePedida: number
  quantidadeSaldo: number
  pesoPedidoKg: number
  pesoSaldoKg: number
  valorTotal: number
  valorSaldo: number
}

export function pedidoErpFromRow(row: Record<string, unknown>): PedidoErpRow {
  return {
    vendedorCodigo: Number(row.vendedor_codigo),
    vendedorNome: row.vendedor_nome as string,
    clienteCodigo: Number(row.cliente_codigo),
    clienteNome: row.cliente_nome as string,
    numeroPedido: row.numero_pedido as string,
    emissao: row.emissao as string,
    entrega: (row.entrega as string) ?? null,
    produto: row.produto as string,
    status: (row.status as string) ?? '',
    un: row.un as string,
    quantidadePedida: Number(row.quantidade_pedida),
    quantidadeSaldo: Number(row.quantidade_saldo),
    pesoPedidoKg: Number(row.peso_pedido_kg),
    pesoSaldoKg: Number(row.peso_saldo_kg),
    valorTotal: Number(row.valor_total),
    valorSaldo: Number(row.valor_saldo),
  }
}

export interface VendedorComNotas {
  codigo: number
  nome: string
}

export interface KpiCliente {
  toneladasAno: number
  reaisAno: number
  toneladasAnoAnterior: number
  reaisAnoAnterior: number
  variacaoToneladasPct: number | null
  variacaoReaisPct: number | null
  numNotasAno: number
  /** R$ por tonelada -- reaisAno / toneladasAno. */
  ticketMedioReaisPorTonelada: number
  primeiraCompra: string | null
  ultimaCompra: string | null
  anosAtivo: number
}

export interface PontoMensal {
  mes: string // yyyy-mm
  toneladas: number
  reais: number
}

export interface PontoAnual {
  ano: number
  toneladas: number
  reais: number
}

export interface TopProduto {
  produto: string
  toneladas: number
  reais: number
}

export interface PontoSazonalidade {
  mes: number // 1-12
  toneladas: number
  intensidade: number // 0-1, normalizado pelo mês de pico
}

export interface Insight {
  emoji: string
  texto: string
}

export interface ClienteRanqueado {
  codigo: number
  nome: string
  toneladas: number
  reais: number
  participacaoPct: number // fatia do total do vendedor, 0-100
}

export interface ItemPedidoAberto {
  numeroPedido: string
  emissao: string
  produto: string
  pesoPedidoT: number
  pesoSaldoT: number
  valorTotal: number
  valorSaldo: number
}

export interface ResumoPedidosCliente {
  totalPedidoT: number
  totalSaldoT: number
  totalValorTotal: number
  totalValorSaldo: number
  itens: ItemPedidoAberto[]
}

export interface ResumoVendedor {
  totalToneladas: number
  totalReais: number
  totalToneladasAnoAnterior: number
  totalReaisAnoAnterior: number
  clientesAtivos: number
  clientesTotal: number
  /** R$ por tonelada -- totalReais / totalToneladas. */
  ticketMedioReaisPorTonelada: number
  clientesRanqueados: ClienteRanqueado[]
}
