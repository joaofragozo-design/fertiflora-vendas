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
  if (profileIds.length > 0) {
    const { data: perfis, error: errPerfis } = await supabase.from('profiles').select('id, avatar_url').in('id', profileIds)
    if (errPerfis) throw new Error(`Falha ao carregar avatares: ${errPerfis.message}`)
    for (const p of perfis ?? []) avatarPorProfile.set(p.id as string, (p.avatar_url as string) ?? null)
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
  // não o Total (que inclui Pedido ainda não faturado).
  entradas.sort((a, b) => b.faturado - a.faturado)
  return entradas.map((e, i) => ({ ...e, colocacao: i + 1 }))
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
  params: { codigo?: number; nome?: string; profileId?: string | null; ativo?: boolean }
): Promise<void> {
  const supabase = createClient()
  const payload: Record<string, unknown> = {}
  if (params.codigo !== undefined) payload.codigo = params.codigo
  if (params.nome !== undefined) payload.nome = params.nome
  if (params.profileId !== undefined) payload.profile_id = params.profileId
  if (params.ativo !== undefined) payload.ativo = params.ativo

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
