import { createClient } from '@/lib/supabase/client'
import { cotacaoFromRow, type CotacaoDados, type CotacaoSalva } from './types'

export async function salvarCotacao(params: {
  clienteId: string | null
  produto: string
  precoVendido: number
  aprovado: boolean
  dados: CotacaoDados
}): Promise<CotacaoSalva> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { data, error } = await supabase.from('cotacoes').insert({
    vendedor_id: user.id,
    cliente_id: params.clienteId,
    produto: params.produto,
    preco_vendido: params.precoVendido,
    aprovado: params.aprovado,
    dados: params.dados,
  }).select('*').single()

  if (error) throw new Error(`Falha ao salvar cotação: ${error.message}`)
  return cotacaoFromRow(data)
}

export async function listarCotacoes(): Promise<CotacaoSalva[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('cotacoes').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Falha ao carregar cotações: ${error.message}`)
  return (data ?? []).map(cotacaoFromRow)
}

export async function listarCotacoesDoCliente(clienteId: string): Promise<CotacaoSalva[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Falha ao carregar histórico do cliente: ${error.message}`)
  return (data ?? []).map(cotacaoFromRow)
}
