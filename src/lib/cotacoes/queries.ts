import { createClient } from '@/lib/supabase/client'
import { autenticarRealtime } from '@/lib/supabase/realtime'
import { cotacaoConfigFromRow, cotacaoFromRow, type CotacaoConfig, type CotacaoDados, type CotacaoSalva } from './types'

export async function salvarCotacao(params: {
  clienteId: string | null
  produto: string
  precoVendido: number
  aprovado: boolean
  quantidadeToneladas: number
  comissaoTotal: number
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
    quantidade_toneladas: params.quantidadeToneladas,
    comissao_total: params.comissaoTotal,
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

/** Linha única (sempre a mesma) -- liga/desliga a criação de cotações pelos vendedores. */
export async function buscarConfigCotacao(): Promise<CotacaoConfig | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('cotacao_config').select('*').limit(1).maybeSingle()
  if (error) throw new Error(`Falha ao carregar configuração de cotação: ${error.message}`)
  return data ? cotacaoConfigFromRow(data) : null
}

export async function travarCotacao(id: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('cotacao_config')
    .update({ travada: true, travada_por: user?.id ?? null, travada_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Falha ao travar cotação: ${error.message}`)
}

export async function destravarCotacao(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('cotacao_config').update({ travada: false }).eq('id', id)
  if (error) throw new Error(`Falha ao destravar cotação: ${error.message}`)
}

export async function definirCampanhaAvista(id: string, params: { ativa: boolean; descontoPct: number }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('cotacao_config')
    .update({ campanha_avista_ativa: params.ativa, campanha_avista_desconto_pct: params.descontoPct })
    .eq('id', id)
  if (error) throw new Error(`Falha ao atualizar campanha à vista: ${error.message}`)
}

/** RLS aberta pra qualquer autenticado (não depende de auth.uid() na condição) -- autenticarRealtime não é estritamente necessário aqui, mas mantém o mesmo padrão do resto do app. */
export function inscreverConfigCotacaoEmTempoReal(onChange: (config: CotacaoConfig) => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel('cotacao-config-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cotacao_config' }, (payload) => {
      onChange(cotacaoConfigFromRow(payload.new as Record<string, unknown>))
    })

  autenticarRealtime(supabase).then(() => channel.subscribe())

  return () => {
    supabase.removeChannel(channel)
  }
}
