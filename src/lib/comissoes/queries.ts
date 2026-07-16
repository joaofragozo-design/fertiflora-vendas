import { createClient } from '@/lib/supabase/client'
import { buscarTodasAsPaginas } from '@/lib/supabase/paginacao'
import type { ComissaoErpLinha } from '@/lib/ranking/importar-erp'
import { comissaoErpFromRow, type ComissaoErpRow } from './types'

type TabelaComissoes = 'comissoes_erp_importadas' | 'comissoes_liquidadas_importadas'

async function buscarComissoesDe(tabela: TabelaComissoes, vendedorCodigo: number, clienteCodigo?: number): Promise<ComissaoErpRow[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<Record<string, unknown>>((from, to) => {
    const query = supabase.from(tabela).select('*').eq('vendedor_codigo', vendedorCodigo)
    return (clienteCodigo !== undefined ? query.eq('cliente_codigo', clienteCodigo) : query).range(from, to)
  })
  return linhas.map(comissaoErpFromRow)
}

/** Histórico "geral" (vencimento/emissão, quase nunca tem Dt Pagto) -- base de aPagar/projeção. */
export async function buscarComissoesDoVendedor(vendedorCodigo: number): Promise<ComissaoErpRow[]> {
  return buscarComissoesDe('comissoes_erp_importadas', vendedorCodigo)
}

/** Histórico "liquidadas" (100% das linhas com Dt Pagto) -- única fonte confiável de jaLiquidada. */
export async function buscarComissoesLiquidadasDoVendedor(vendedorCodigo: number): Promise<ComissaoErpRow[]> {
  return buscarComissoesDe('comissoes_liquidadas_importadas', vendedorCodigo)
}

/** Histórico "geral" de um único cliente -- base de "NF a vencer" no limite de crédito. */
export async function buscarComissoesDoCliente(vendedorCodigo: number, clienteCodigo: number): Promise<ComissaoErpRow[]> {
  return buscarComissoesDe('comissoes_erp_importadas', vendedorCodigo, clienteCodigo)
}

/** Histórico "liquidadas" de um único cliente -- exclui do "NF a vencer" o que já foi pago. */
export async function buscarComissoesLiquidadasDoCliente(vendedorCodigo: number, clienteCodigo: number): Promise<ComissaoErpRow[]> {
  return buscarComissoesDe('comissoes_liquidadas_importadas', vendedorCodigo, clienteCodigo)
}

/** Histórico "geral" de TODOS os vendedores -- base do painel de Fluxo de Caixa & Crédito. RLS só libera pra admin. */
export async function buscarTodasAsComissoes(): Promise<ComissaoErpRow[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<Record<string, unknown>>((from, to) =>
    supabase.from('comissoes_erp_importadas').select('*').range(from, to)
  )
  return linhas.map(comissaoErpFromRow)
}

/** Histórico "liquidadas" de TODOS os vendedores -- base do painel de Fluxo de Caixa & Crédito. RLS só libera pra admin. */
export async function buscarTodasAsComissoesLiquidadas(): Promise<ComissaoErpRow[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<Record<string, unknown>>((from, to) =>
    supabase.from('comissoes_liquidadas_importadas').select('*').range(from, to)
  )
  return linhas.map(comissaoErpFromRow)
}

function linhaToRow(l: ComissaoErpLinha) {
  return {
    vendedor_codigo: l.vendedorCodigo,
    vendedor_nome: l.vendedorNome,
    nota: l.nota || null,
    pedido: l.pedido || null,
    cliente_codigo: l.clienteCodigo,
    cliente_nome: l.clienteNome,
    emissao: l.emissao,
    vencimento: l.vencimento,
    pagamento: l.pagamento,
    parcela: l.parcela,
    valor_pago: l.valorPago,
    valor_frete: l.valorFrete,
    despesa_adicional: l.despesaAdicional,
    valor_desconto: l.valorDesconto,
    liquido: l.liquido,
    percentual_comissao: l.percentualComissao,
    valor_comissao: l.valorComissao,
  }
}

/**
 * Substitui todo o conteúdo da tabela -- o CSV do ERP traz o histórico
 * completo daquele universo (geral ou liquidadas), então cada importação é
 * uma reconciliação total, não um incremento.
 */
async function substituirComissoesDe(tabela: TabelaComissoes, linhas: ComissaoErpLinha[]): Promise<void> {
  const supabase = createClient()

  const { error: errDelete } = await supabase.from(tabela).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (errDelete) throw new Error(`Falha ao limpar comissões anteriores: ${errDelete.message}`)

  const TAMANHO_LOTE = 500
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE).map(linhaToRow)
    const { error } = await supabase.from(tabela).insert(lote)
    if (error) throw new Error(`Falha ao importar comissões (lote ${i / TAMANHO_LOTE + 1}): ${error.message}`)
  }
}

export async function substituirComissoesErp(linhas: ComissaoErpLinha[]): Promise<void> {
  return substituirComissoesDe('comissoes_erp_importadas', linhas)
}

function fmtBRL(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function chaveLiquidada(l: { vendedor_codigo: number; nota: string | null; parcela: number }): string {
  return `${l.vendedor_codigo}|${l.nota ?? ''}|${l.parcela}`
}

/**
 * Substitui as liquidadas e notifica o vendedor de cada nota/parcela que passou a aparecer como
 * paga nesta importação e não estava na anterior -- "cliente pagou". Compara contra o snapshot
 * de ANTES da reconciliação (a tabela é limpa e reinserida por inteiro a cada import, então a
 * chave antiga só existe se for lida antes de `substituirComissoesDe` rodar).
 *
 * Se a tabela estava vazia antes deste import, não notifica nada -- é a primeira carga (ou um
 * reseed do banco), e trataria o histórico inteiro como "acabou de pagar", inundando todo mundo
 * de notificação por algo que já tinha acontecido há muito tempo.
 */
export async function substituirComissoesLiquidadasErp(linhas: ComissaoErpLinha[]): Promise<void> {
  const supabase = createClient()

  const chavesAntigas = new Set(
    (await buscarTodasAsPaginas<{ vendedor_codigo: number; nota: string | null; parcela: number }>((from, to) =>
      supabase.from('comissoes_liquidadas_importadas').select('vendedor_codigo, nota, parcela').range(from, to)
    )).map(chaveLiquidada)
  )

  await substituirComissoesDe('comissoes_liquidadas_importadas', linhas)

  if (chavesAntigas.size === 0) {
    console.log('[comissoes] liquidadas estava vazia antes do import -- pulando notificação de pagamento')
    return
  }

  const novasPagas = linhas.filter((l) => !chavesAntigas.has(chaveLiquidada({ vendedor_codigo: l.vendedorCodigo, nota: l.nota, parcela: l.parcela })))

  for (const l of novasPagas) {
    const corpo = `${l.clienteNome} pagou a nota ${l.nota || '(sem número)'} (${fmtBRL(l.liquido)}).`
    const { error } = await supabase.rpc('notificar_vendedor_por_codigo', {
      p_vendedor_codigo: l.vendedorCodigo,
      p_tipo: 'pagamento_nf',
      p_titulo: 'Cliente pagou uma nota',
      p_corpo: corpo,
    })
    if (error) console.error('[comissoes] falha ao notificar pagamento', error)
  }
}
