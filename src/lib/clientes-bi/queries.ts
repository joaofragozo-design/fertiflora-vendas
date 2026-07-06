import { createClient } from '@/lib/supabase/client'
import type { NotaFiscalLinha } from '@/lib/ranking/importar-erp'
import { notaFiscalFromRow, type ClienteResumo, type NotaFiscalRow, type VendedorComNotas } from './types'

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

/** Clientes de um vendedor (pelo código do ERP) — a lista que alimenta o seletor da tela de BI. */
export async function listarClientesDoVendedor(vendedorCodigo: number): Promise<ClienteResumo[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<{ cliente_codigo: number; cliente_nome: string }>((from, to) =>
    supabase.from('notas_fiscais_importadas').select('cliente_codigo, cliente_nome').eq('vendedor_codigo', vendedorCodigo).range(from, to)
  )

  const porCodigo = new Map<number, string>()
  for (const row of linhas) porCodigo.set(row.cliente_codigo, row.cliente_nome)
  return [...porCodigo.entries()].map(([codigo, nome]) => ({ codigo, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
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
