import { createClient } from '@/lib/supabase/client'
import { buscarTodasAsPaginas } from '@/lib/supabase/paginacao'
import type { NotaFiscalLinha, PedidoErpLinha } from '@/lib/ranking/importar-erp'
import { notaFiscalFromRow, pedidoErpFromRow, type ClienteResumo, type NotaFiscalRow, type PedidoErpRow, type VendedorComNotas } from './types'

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
 *
 * `userId`, quando informado, também une os clientes cadastrados manualmente (tabela `clientes`,
 * carteira de cadastro pra nota fiscal) que ainda não têm nenhuma nota/pedido no ERP -- cliente
 * novo, primeira venda ainda não rolou. Esses recebem um código sintético negativo (nunca colide
 * com código real do ERP, que é sempre positivo) só pra servir de chave de seleção na lista;
 * selecioná-los mostra o BI vazio (sem histórico mesmo, é verdade) até a primeira nota/pedido
 * chegar. Só passe `userId` quando o próprio vendedor está vendo a própria carteira -- `clientes`
 * tem RLS por `vendedor_id = auth.uid()`, então um admin "vendo como" outro vendedor (por código)
 * só enxergaria os PRÓPRIOS clientes manuais do admin por essa via, não os do vendedor escolhido;
 * omitir `userId` nesse caso evita misturar isso na lista de outra pessoa.
 */
export async function listarClientesDoVendedor(vendedorCodigo: number, userId?: string): Promise<ClienteResumo[]> {
  const supabase = createClient()
  const [notas, pedidos, manuais] = await Promise.all([
    buscarTodasAsPaginas<{ cliente_codigo: number; cliente_nome: string }>((from, to) =>
      supabase.from('notas_fiscais_importadas').select('cliente_codigo, cliente_nome').eq('vendedor_codigo', vendedorCodigo).range(from, to)
    ),
    buscarTodasAsPaginas<{ cliente_codigo: number; cliente_nome: string }>((from, to) =>
      supabase.from('pedidos_erp_importados').select('cliente_codigo, cliente_nome').eq('vendedor_codigo', vendedorCodigo).range(from, to)
    ),
    userId
      ? buscarTodasAsPaginas<{ nome: string }>((from, to) => supabase.from('clientes').select('nome').eq('vendedor_id', userId).range(from, to))
      : Promise.resolve([] as { nome: string }[]),
  ])

  const porCodigo = new Map<number, string>()
  for (const row of [...notas, ...pedidos]) porCodigo.set(row.cliente_codigo, row.cliente_nome)

  const resultado: ClienteResumo[] = [...porCodigo.entries()].map(([codigo, nome]) => ({ codigo, nome }))

  const nomesJaListados = new Set(resultado.map((c) => c.nome.trim().toLowerCase()))
  let proximoCodigoSintetico = -1
  for (const { nome } of manuais) {
    const chave = nome.trim().toLowerCase()
    if (nomesJaListados.has(chave)) continue
    nomesJaListados.add(chave)
    resultado.push({ codigo: proximoCodigoSintetico, nome })
    proximoCodigoSintetico -= 1
  }

  return resultado.sort((a, b) => a.nome.localeCompare(b.nome))
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
