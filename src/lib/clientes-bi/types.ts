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
  ticketMedioNota: number
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
