import { createClient } from '@/lib/supabase/client'
import { pedidoFromRow, type Embalagem, type Pedido, type PedidoDados } from './types'

export async function criarPedido(params: {
  clienteId: string
  cotacaoId: string
  quantidadeToneladas: number
  embalagem: Embalagem
  dados: PedidoDados
}): Promise<Pedido> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      vendedor_id: user.id,
      cliente_id: params.clienteId,
      cotacao_id: params.cotacaoId,
      quantidade_toneladas: params.quantidadeToneladas,
      embalagem: params.embalagem,
      dados: params.dados,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Falha ao criar pedido: ${error.message}`)
  return pedidoFromRow(data)
}

export async function listarMeusPedidos(): Promise<Pedido[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`)
  return (data ?? []).map(pedidoFromRow)
}

/** Vendedor manda o pedido pra fila de conferência (etapa 1). */
export async function solicitarAprovacao(pedidoId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('pedidos')
    .update({ status: 'aguardando_conferencia', solicitado_em: new Date().toISOString() })
    .eq('id', pedidoId)
  if (error) throw new Error(`Falha ao solicitar aprovação: ${error.message}`)
}

/** Conferência e análise de crédito enxergam tudo — a RLS filtra o resto (vendedor só vê os próprios). */
export async function listarTodosPedidos(): Promise<Pedido[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`)
  return (data ?? []).map(pedidoFromRow)
}

// ─── Etapa 1: Conferência (Françoa) ───────────────────────────────────────

export async function enviarParaAnaliseCredito(pedidoId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { error } = await supabase
    .from('pedidos')
    .update({ status: 'aguardando_analise_credito', conferido_em: new Date().toISOString(), conferido_por: user.id })
    .eq('id', pedidoId)
  if (error) throw new Error(`Falha ao encaminhar pra análise de crédito: ${error.message}`)
}

export async function reprovarNaConferencia(pedidoId: string, motivo: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { error } = await supabase
    .from('pedidos')
    .update({
      status: 'reprovado_conferencia',
      conferido_em: new Date().toISOString(),
      conferido_por: user.id,
      motivo_reprovacao_conferencia: motivo.trim() || null,
    })
    .eq('id', pedidoId)
  if (error) throw new Error(`Falha ao reprovar na conferência: ${error.message}`)
}

// ─── Etapa 2: Análise de Crédito (admin/Djeisson) — decisão final ─────────

export async function aprovarCredito(pedidoId: string, numeroContrato: string | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { error } = await supabase
    .from('pedidos')
    .update({ status: 'aprovado_credito', decidido_em: new Date().toISOString(), decidido_por: user.id, numero_contrato: numeroContrato })
    .eq('id', pedidoId)
  if (error) throw new Error(`Falha ao aprovar na análise de crédito: ${error.message}`)
}

export async function reprovarCredito(pedidoId: string, motivo: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { error } = await supabase
    .from('pedidos')
    .update({ status: 'reprovado_credito', decidido_em: new Date().toISOString(), decidido_por: user.id, motivo_rejeicao: motivo.trim() || null })
    .eq('id', pedidoId)
  if (error) throw new Error(`Falha ao reprovar na análise de crédito: ${error.message}`)
}
