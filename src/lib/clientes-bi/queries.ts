import { createClient } from '@/lib/supabase/client'
import type { NotaFiscalLinha, PedidoErpLinha } from '@/lib/ranking/importar-erp'
import { notaFiscalFromRow, pedidoErpFromRow, type ClienteResumo, type NotaFiscalRow, type PedidoErpRow, type VendedorComNotas } from './types'

const TAMANHO_PAGINA = 1000

/**
 * O PostgREST corta em 1000 linhas por padrão — sem paginar, tabelas com
 * mais de 1000 linhas perdem dados silenciosamente (foi o caso do código
 * 240, que sumia da lista de vendedores). Busca todas as páginas até vir
 * uma incompleta.
 */
async function buscarTodasAsPaginas<T>(
  montarConsulta: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const todas: T[] = []
  for (let pagina = 0; ; pagina++) {
    const from = pagina * TAMANHO_PAGINA
    const { data, error } = await montarConsulta(from, from + TAMANHO_PAGINA - 1)
    if (error) throw new Error(error.message)
    todas.push(...(data ?? []))
    if (!data || data.length < TAMANHO_PAGINA) break
  }
  return todas
}

/** Vendedores com histórico importado — para o admin escolher "ver como". */
export async function listarVendedoresComNotas(): Promise<VendedorComNotas[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<{ vendedor_codigo: number; vendedor_nome: string }>((from, to) =>
    supabase.from('notas_fiscais_importadas').select('vendedor_codigo, vendedor_nome').range(from, to)
  )

  const porCodigo = new Map<number, string>()
  for (const row of linhas) porCodigo.set(row.vendedor_codigo, row.vendedor_nome)
  return [...porCodigo.entries()].map(([codigo, nome]) => ({ codigo, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
}

/**
 * Clientes de um vendedor (pelo código do ERP) — a lista que alimenta o seletor da tela de BI.
 * Une notas fiscais e pedidos em aberto: um cliente com pedido em aberto mas ainda sem nenhuma
 * nota emitida (primeira compra) também precisa aparecer na lista.
 */
export async function listarClientesDoVendedor(vendedorCodigo: number): Promise<ClienteResumo[]> {
  const supabase = createClient()
  const [notas, pedidos] = await Promise.all([
    buscarTodasAsPaginas<{ cliente_codigo: number; cliente_nome: string }>((from, to) =>
      supabase.from('notas_fiscais_importadas').select('cliente_codigo, cliente_nome').eq('vendedor_codigo', vendedorCodigo).range(from, to)
    ),
    buscarTodasAsPaginas<{ cliente_codigo: number; cliente_nome: string }>((from, to) =>
      supabase.from('pedidos_erp_importados').select('cliente_codigo, cliente_nome').eq('vendedor_codigo', vendedorCodigo).range(from, to)
    ),
  ])

  const porCodigo = new Map<number, string>()
  for (const row of [...notas, ...pedidos]) porCodigo.set(row.cliente_codigo, row.cliente_nome)
  return [...porCodigo.entries()].map(([codigo, nome]) => ({ codigo, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
}

/** Todo o histórico de notas do vendedor (todos os clientes) — base da Visão Geral. */
export async function buscarNotasDoVendedor(vendedorCodigo: number): Promise<NotaFiscalRow[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<Record<string, unknown>>((from, to) =>
    supabase.from('notas_fiscais_importadas').select('*').eq('vendedor_codigo', vendedorCodigo).order('emissao', { ascending: true }).range(from, to)
  )
  return linhas.map(notaFiscalFromRow)
}

/** Todo o histórico de notas de um cliente — base para KPIs, séries, produtos e sazonalidade. */
export async function buscarNotasDoCliente(vendedorCodigo: number, clienteCodigo: number): Promise<NotaFiscalRow[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<Record<string, unknown>>((from, to) =>
    supabase
      .from('notas_fiscais_importadas')
      .select('*')
      .eq('vendedor_codigo', vendedorCodigo)
      .eq('cliente_codigo', clienteCodigo)
      .order('emissao', { ascending: true })
      .range(from, to)
  )
  return linhas.map(notaFiscalFromRow)
}

/** Pedidos em aberto de um cliente (ainda com saldo a carregar) — base do card "Pedidos em aberto". */
export async function buscarPedidosDoCliente(vendedorCodigo: number, clienteCodigo: number): Promise<PedidoErpRow[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<Record<string, unknown>>((from, to) =>
    supabase
      .from('pedidos_erp_importados')
      .select('*')
      .eq('vendedor_codigo', vendedorCodigo)
      .eq('cliente_codigo', clienteCodigo)
      .order('emissao', { ascending: false })
      .range(from, to)
  )
  return linhas.map(pedidoErpFromRow)
}

function linhaToRow(l: NotaFiscalLinha) {
  return {
    vendedor_codigo: l.vendedorCodigo,
    vendedor_nome: l.vendedorNome,
    cliente_codigo: l.clienteCodigo,
    cliente_nome: l.clienteNome,
    nota: l.nota || null,
    emissao: l.emissao,
    produto: l.produto,
    municipio: l.municipio || null,
    un: l.un,
    quantidade: l.quantidade,
    peso_liquido_kg: l.pesoLiquidoKg,
    valor_liquido: l.valorLiquido,
  }
}

/**
 * Substitui todo o conteúdo de `notas_fiscais_importadas` — o CSV do ERP
 * sempre traz o histórico completo, então cada importação é uma
 * reconciliação total, não um incremento.
 */
export async function substituirNotasFiscais(linhas: NotaFiscalLinha[]): Promise<void> {
  const supabase = createClient()

  const { error: errDelete } = await supabase.from('notas_fiscais_importadas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (errDelete) throw new Error(`Falha ao limpar notas anteriores: ${errDelete.message}`)

  const TAMANHO_LOTE = 500
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE).map(linhaToRow)
    const { error } = await supabase.from('notas_fiscais_importadas').insert(lote)
    if (error) throw new Error(`Falha ao importar notas (lote ${i / TAMANHO_LOTE + 1}): ${error.message}`)
  }
}

function pedidoLinhaToRow(l: PedidoErpLinha) {
  return {
    vendedor_codigo: l.vendedorCodigo,
    vendedor_nome: l.vendedorNome,
    cliente_codigo: l.clienteCodigo,
    cliente_nome: l.clienteNome,
    numero_pedido: l.numeroPedido,
    emissao: l.emissao,
    entrega: l.entrega,
    produto: l.produto,
    status: l.status || null,
    un: l.un,
    quantidade_pedida: l.quantidadePedida,
    quantidade_saldo: l.quantidadeSaldo,
    peso_pedido_kg: l.pesoPedidoKg,
    peso_saldo_kg: l.pesoSaldoKg,
    valor_total: l.valorTotal,
    valor_saldo: l.valorSaldo,
  }
}

/**
 * Substitui todo o conteúdo de `pedidos_erp_importados` — o CSV do ERP traz o
 * snapshot completo dos pedidos em aberto no momento da exportação, então
 * cada importação é uma reconciliação total (pedidos já totalmente
 * carregados saem do relatório e devem sair da tabela também).
 */
export async function substituirPedidosErp(linhas: PedidoErpLinha[]): Promise<void> {
  const supabase = createClient()

  const { error: errDelete } = await supabase.from('pedidos_erp_importados').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (errDelete) throw new Error(`Falha ao limpar pedidos anteriores: ${errDelete.message}`)

  const TAMANHO_LOTE = 500
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE).map(pedidoLinhaToRow)
    const { error } = await supabase.from('pedidos_erp_importados').insert(lote)
    if (error) throw new Error(`Falha ao importar pedidos (lote ${i / TAMANHO_LOTE + 1}): ${error.message}`)
  }
}
