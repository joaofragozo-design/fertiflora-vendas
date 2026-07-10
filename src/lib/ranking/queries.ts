import { createClient } from '@/lib/supabase/client'
import { calcularFalta, calcularPercentual, diasUteisRestantes } from './calculos'
import { vendedorComercialFromRow, type RankingEntry, type VendedorComercial } from './types'

/** Ranking do ano — visível para qualquer usuário autenticado (admin e vendedores). */
export async function listarRanking(ano: number): Promise<RankingEntry[]> {
  const supabase = createClient()

  const [{ data: vendedores, error: errVendedores }, { data: metas, error: errMetas }, { data: faturamentos, error: errFaturamentos }] =
    await Promise.all([
      supabase.from('vendedores_comerciais').select('*').eq('ativo', true),
      supabase.from('metas_comerciais').select('vendedor_id, meta_toneladas').eq('ano', ano),
      supabase.from('faturamento_comercial').select('vendedor_id, faturado, pedido').eq('ano', ano),
    ])
  if (errVendedores) throw new Error(`Falha ao carregar vendedores: ${errVendedores.message}`)
  if (errMetas) throw new Error(`Falha ao carregar metas: ${errMetas.message}`)
  if (errFaturamentos) throw new Error(`Falha ao carregar faturamento: ${errFaturamentos.message}`)

  const metaPorVendedor = new Map((metas ?? []).map((m) => [m.vendedor_id as string, Number(m.meta_toneladas)]))
  const faturamentoPorVendedor = new Map(
    (faturamentos ?? []).map((f) => [f.vendedor_id as string, { faturado: Number(f.faturado), pedido: Number(f.pedido) }])
  )

  const profileIds = (vendedores ?? []).map((v) => v.profile_id).filter((id): id is string => !!id)
  const avatarPorProfile = new Map<string, string | null>()
  const localizacaoPorProfile = new Map<string, string | null>()
  if (profileIds.length > 0) {
    // RLS de profiles só libera a própria linha -- via RPC (security definer) pra ver a foto/localização de todo mundo.
    // Nunca lança: se a migration da RPC ainda não rodou, o ranking continua funcionando (só sem foto/localização).
    const { data: perfis, error: errPerfis } = await supabase.rpc('listar_avatares_vendedores', { p_ids: profileIds })
    if (errPerfis) {
      console.error('[ranking] falha ao carregar avatares/localização', errPerfis)
    } else {
      for (const p of perfis ?? []) {
        avatarPorProfile.set(p.id as string, (p.avatar_url as string) ?? null)
        localizacaoPorProfile.set(p.id as string, (p.praca_atuacao as string) ?? null)
      }
    }
  }

  const diasRestantes = diasUteisRestantes(ano)

  const entradas = (vendedores ?? []).map((row): Omit<RankingEntry, 'colocacao'> => {
    const v = vendedorComercialFromRow(row)
    const { faturado, pedido } = faturamentoPorVendedor.get(v.id) ?? { faturado: 0, pedido: 0 }
    const total = faturado + pedido
    const meta = metaPorVendedor.get(v.id) ?? 0
    return {
      id: v.id,
      codigo: v.codigo,
      nome: v.nome,
      profileId: v.profileId,
      avatarUrl: v.profileId ? (avatarPorProfile.get(v.profileId) ?? null) : null,
      localizacao: v.profileId ? (localizacaoPorProfile.get(v.profileId) ?? null) : null,
      agregado: v.agregado,
      faturado,
      pedido,
      total,
      meta,
      falta: calcularFalta(total, meta),
      percentual: calcularPercentual(total, meta),
      diasUteisRestantes: diasRestantes,
    }
  })

  // Colocação segue o Faturado (já entregue) — igual à planilha original,
  // não o Total (que inclui Pedido ainda não faturado). Agregados (Fertiflora,
  // Outros) não disputam colocação: ficam no fim, sem número.
  const normais = entradas.filter((e) => !e.agregado).sort((a, b) => b.faturado - a.faturado)
  const agregados = entradas.filter((e) => e.agregado).sort((a, b) => b.faturado - a.faturado)
  return [
    ...normais.map((e, i) => ({ ...e, colocacao: i + 1 })),
    ...agregados.map((e) => ({ ...e, colocacao: null })),
  ]
}

export interface VendaSemanalPorCodigo {
  codigo: number
  toneladas: number
}

/**
 * Vendas faturadas (notas emitidas) na semana atual (seg-dom), por código de vendedor.
 * A semana é calculada dentro da função no Postgres (fuso de Brasil) -- sem parâmetro de
 * data do client, pra não depender de conversão de fuso no browser e pra não dar pra
 * manipular o intervalo pedindo uma janela maior/menor que uma semana.
 */
export async function listarVendasSemana(): Promise<VendaSemanalPorCodigo[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('ranking_vendas_semana')
  if (error) throw new Error(`Falha ao carregar vendas da semana: ${error.message}`)
  return (data ?? []).map((r: { vendedor_codigo: number; toneladas: number }) => ({
    codigo: Number(r.vendedor_codigo),
    toneladas: Number(r.toneladas),
  }))
}

/**
 * Pedidos novos contratados na semana atual (seg-dom), por código de vendedor -- vem do
 * relatório de Pedidos de Vendas do ERP (pedidos_erp_importados, mesma base do BI de
 * cliente), não do fluxo interno de aprovação de crédito do app. Mesma estratégia de
 * listarVendasSemana: semana calculada no Postgres, sem parâmetro de data do client.
 */
export async function listarPedidosSemana(): Promise<VendaSemanalPorCodigo[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('ranking_pedidos_semana')
  if (error) throw new Error(`Falha ao carregar pedidos da semana: ${error.message}`)
  return (data ?? []).map((r: { vendedor_codigo: number; toneladas: number }) => ({
    codigo: Number(r.vendedor_codigo),
    toneladas: Number(r.toneladas),
  }))
}

export interface HistoricoPonto {
  vendedorId: string
  data: string
  toneladas: number
}

/** Histórico dos últimos N dias de todos os vendedores — base para badges de evolução/crescimento. */
export async function listarHistoricoRecente(dias = 8): Promise<HistoricoPonto[]> {
  const supabase = createClient()
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)
  const { data, error } = await supabase
    .from('faturamento_historico')
    .select('vendedor_id, data, toneladas')
    .gte('data', desde.toISOString().slice(0, 10))
    .order('data', { ascending: true })
  if (error) throw new Error(`Falha ao carregar histórico: ${error.message}`)
  return (data ?? []).map((r) => ({ vendedorId: r.vendedor_id as string, data: r.data as string, toneladas: Number(r.toneladas) }))
}

// ─── Administração (role admin — RLS garante a permissão real) ───────────

export async function listarVendedoresComerciais(): Promise<VendedorComercial[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('vendedores_comerciais').select('*').order('codigo', { ascending: true })
  if (error) throw new Error(`Falha ao carregar vendedores: ${error.message}`)
  return (data ?? []).map(vendedorComercialFromRow)
}

/** Vendedor comercial vinculado à conta logada (via profile_id) — usado pelo BI do Cliente pra saber "qual é o meu código". */
export async function buscarVendedorComercialDoUsuario(userId: string): Promise<VendedorComercial | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('vendedores_comerciais').select('*').eq('profile_id', userId).maybeSingle()
  if (error) throw new Error(`Falha ao buscar vendedor vinculado: ${error.message}`)
  return data ? vendedorComercialFromRow(data) : null
}

/** Faturado/Pedido/Meta de um único vendedor no ano — base do trio no dashboard (zerado se ainda não tem linha, mesmo dado exato do Ranking). */
export async function buscarFaturamentoDoVendedor(vendedorId: string, ano: number): Promise<{ faturado: number; pedido: number; meta: number }> {
  const supabase = createClient()
  const [{ data: fat, error: errFat }, { data: meta, error: errMeta }] = await Promise.all([
    supabase.from('faturamento_comercial').select('faturado, pedido').eq('vendedor_id', vendedorId).eq('ano', ano).maybeSingle(),
    supabase.from('metas_comerciais').select('meta_toneladas').eq('vendedor_id', vendedorId).eq('ano', ano).maybeSingle(),
  ])
  if (errFat) throw new Error(`Falha ao buscar faturamento do vendedor: ${errFat.message}`)
  if (errMeta) throw new Error(`Falha ao buscar meta do vendedor: ${errMeta.message}`)
  return { faturado: Number(fat?.faturado ?? 0), pedido: Number(fat?.pedido ?? 0), meta: Number(meta?.meta_toneladas ?? 0) }
}

export async function criarVendedorComercial(params: { codigo: number; nome: string; profileId?: string | null }): Promise<VendedorComercial> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendedores_comerciais')
    .insert({ codigo: params.codigo, nome: params.nome, profile_id: params.profileId ?? null })
    .select('*')
    .single()
  if (error) throw new Error(`Falha ao criar vendedor: ${error.message}`)
  return vendedorComercialFromRow(data)
}

export async function atualizarVendedorComercial(
  id: string,
  params: { codigo?: number; nome?: string; profileId?: string | null; ativo?: boolean; agregado?: boolean }
): Promise<void> {
  const supabase = createClient()
  const payload: Record<string, unknown> = {}
  if (params.codigo !== undefined) payload.codigo = params.codigo
  if (params.nome !== undefined) payload.nome = params.nome
  if (params.profileId !== undefined) payload.profile_id = params.profileId
  if (params.ativo !== undefined) payload.ativo = params.ativo
  if (params.agregado !== undefined) payload.agregado = params.agregado

  const { error } = await supabase.from('vendedores_comerciais').update(payload).eq('id', id)
  if (error) throw new Error(`Falha ao atualizar vendedor: ${error.message}`)
}

export async function ajustarFaturamento(vendedorId: string, ano: number, valores: { faturado: number; pedido: number }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('faturamento_comercial')
    .upsert(
      { vendedor_id: vendedorId, ano, faturado: valores.faturado, pedido: valores.pedido, atualizado_em: new Date().toISOString() },
      { onConflict: 'vendedor_id,ano' }
    )
  if (error) throw new Error(`Falha ao ajustar faturamento: ${error.message}`)
}

/** Atualiza só o Faturado (ex: importação do ERP) — nunca mexe no Pedido, que vem dos Pedidos aprovados no app. */
export async function atualizarFaturadoImportado(vendedorId: string, ano: number, novoFaturado: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('faturamento_comercial')
    .update({ faturado: novoFaturado, atualizado_em: new Date().toISOString() })
    .eq('vendedor_id', vendedorId)
    .eq('ano', ano)
  if (error) throw new Error(`Falha ao importar faturado: ${error.message}`)
}

export async function ajustarMeta(vendedorId: string, ano: number, novaMeta: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('metas_comerciais')
    .upsert({ vendedor_id: vendedorId, ano, meta_toneladas: novaMeta, updated_at: new Date().toISOString() }, { onConflict: 'vendedor_id,ano' })
  if (error) throw new Error(`Falha ao ajustar meta: ${error.message}`)
}

/** Qualquer mudança em faturamento/meta/vendedor dispara `onChange` — sem refresh manual. */
export function inscreverRankingEmTempoReal(onChange: () => void) {
  const supabase = createClient()
  const channel = supabase
    .channel('ranking-comercial-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'faturamento_comercial' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'metas_comerciais' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedores_comerciais' }, onChange)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
