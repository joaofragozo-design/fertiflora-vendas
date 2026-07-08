import { createClient } from '@/lib/supabase/client'
import { buscarTodasAsPaginas } from '@/lib/supabase/paginacao'
import type { ComissaoErpLinha } from '@/lib/ranking/importar-erp'
import { comissaoErpFromRow, type ComissaoErpRow } from './types'

type TabelaComissoes = 'comissoes_erp_importadas' | 'comissoes_liquidadas_importadas'

async function buscarComissoesDe(tabela: TabelaComissoes, vendedorCodigo: number): Promise<ComissaoErpRow[]> {
  const supabase = createClient()
  const linhas = await buscarTodasAsPaginas<Record<string, unknown>>((from, to) =>
    supabase.from(tabela).select('*').eq('vendedor_codigo', vendedorCodigo).range(from, to)
  )
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

export async function substituirComissoesLiquidadasErp(linhas: ComissaoErpLinha[]): Promise<void> {
  return substituirComissoesDe('comissoes_liquidadas_importadas', linhas)
}
