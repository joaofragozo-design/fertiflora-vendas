import { createClient } from '@/lib/supabase/client'
import { autenticarRealtime } from '@/lib/supabase/realtime'
import { listarRanking } from '@/lib/ranking/queries'
import { listarEquipeApoio } from '@/lib/equipe-apoio/queries'
import { anuncioFromRow, mensagemDiretaFromRow, type Anexo, type Anuncio, type ConversaResumo, type ContatoChat, type MensagemDireta } from './types'

const ANO = new Date().getFullYear()

function colunasAnexo(anexo?: Anexo | null) {
  if (!anexo) return { anexo_url: null, anexo_nome_original: null, anexo_tipo_mime: null, anexo_tamanho_bytes: null }
  return {
    anexo_url: anexo.path,
    anexo_nome_original: anexo.nomeOriginal,
    anexo_tipo_mime: anexo.tipo === 'imagem' ? 'image/*' : 'application/octet-stream',
    anexo_tamanho_bytes: anexo.tamanhoBytes,
  }
}

/** Dispara e esquece -- notificação push nunca pode travar nem quebrar o envio da mensagem
 *  em si; qualquer falha de rede/servidor aqui é só engolida. */
function dispararPush(corpo: { destinatarios: string[]; titulo: string; corpo: string; url: string } | { todosExceto: string; titulo: string; corpo: string; url: string }) {
  fetch('/api/push/enviar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  }).catch(() => {})
}

// ─── Anúncios (canal admin -> todos) ───────────────────────────────────────

export async function listarAnuncios(antesDe?: string, limite = 50): Promise<Anuncio[]> {
  const supabase = createClient()
  let query = supabase.from('chat_anuncios').select('*').order('criado_em', { ascending: false }).limit(limite)
  if (antesDe) query = query.lt('criado_em', antesDe)
  const { data, error } = await query
  if (error) throw new Error(`Falha ao carregar avisos: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(anuncioFromRow).reverse()
}

/** Sempre via RPC -- o fan-out de notificação pra TODO MUNDO (tabela notificacoes) acontece dentro dela. */
export async function enviarAnuncio(corpo: string | null, anexo?: Anexo | null): Promise<void> {
  const supabase = createClient()
  const cols = colunasAnexo(anexo)
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.rpc('postar_anuncio', {
    p_corpo: corpo,
    p_anexo_url: cols.anexo_url,
    p_anexo_nome_original: cols.anexo_nome_original,
    p_anexo_tipo_mime: cols.anexo_tipo_mime,
    p_anexo_tamanho_bytes: cols.anexo_tamanho_bytes,
  })
  if (error) throw new Error(`Falha ao publicar aviso: ${error.message}`)

  if (user) {
    dispararPush({ todosExceto: user.id, titulo: 'Novo aviso', corpo: corpo ?? '📎 Enviou um anexo', url: '/chat' })
  }
}

/** Soft-delete -- o trigger no banco zera corpo/anexo, aqui só sinaliza a intenção. */
export async function apagarAnuncio(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('chat_anuncios').update({ deletado_em: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`Falha ao apagar aviso: ${error.message}`)
}

/** Edita o corpo -- o trigger no banco distingue "editar" de "apagar" pela intenção do UPDATE. */
export async function editarAnuncio(id: string, novoCorpo: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('chat_anuncios').update({ corpo: novoCorpo }).eq('id', id)
  if (error) throw new Error(`Falha ao editar aviso: ${error.message}`)
}

/** Marca-d'água por usuário (não é por mensagem) -- upsert na própria linha. */
export async function marcarAnunciosComoLidos(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('chat_anuncios_leituras')
    .upsert({ usuario_id: user.id, ultima_leitura_em: new Date().toISOString() })
  if (error) throw new Error(`Falha ao marcar avisos como lidos: ${error.message}`)
}

export function inscreverAnunciosEmTempoReal(onChange: () => void) {
  const supabase = createClient()
  const channel = supabase.channel('chat-anuncios-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_anuncios' }, onChange)
  autenticarRealtime(supabase).then(() => channel.subscribe())
  return () => { supabase.removeChannel(channel) }
}

// ─── Contatos (mesma audiência de "provocar" no Ranking) ───────────────────

export async function listarContatosChat(userId: string): Promise<ContatoChat[]> {
  const [ranking, equipeApoio] = await Promise.all([listarRanking(ANO), listarEquipeApoio()])

  const doRanking: ContatoChat[] = ranking
    .filter((r) => r.profileId && !r.agregado && r.profileId !== userId)
    .map((r) => ({ profileId: r.profileId as string, nome: r.nome, avatarUrl: r.avatarUrl }))

  const daEquipe: ContatoChat[] = equipeApoio
    .filter((m) => m.profileId !== userId)
    .map((m) => ({ profileId: m.profileId, nome: m.nome, avatarUrl: m.avatarUrl }))

  const porId = new Map<string, ContatoChat>()
  for (const c of [...doRanking, ...daEquipe]) porId.set(c.profileId, c)
  return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome))
}

// ─── Mensagens diretas (DM 1:1) ────────────────────────────────────────────

export async function listarConversas(userId: string): Promise<ConversaResumo[]> {
  const supabase = createClient()
  const [{ data, error }, contatos] = await Promise.all([
    supabase.rpc('chat_listar_conversas'),
    listarContatosChat(userId),
  ])
  if (error) throw new Error(`Falha ao carregar conversas: ${error.message}`)

  const contatoPorId = new Map(contatos.map((c) => [c.profileId, c]))
  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      const contato = contatoPorId.get(row.outro_profile_id as string)
      return {
        outroProfileId: row.outro_profile_id as string,
        outroNome: contato?.nome ?? 'Usuário',
        outroAvatarUrl: contato?.avatarUrl ?? null,
        ultimaMensagemTexto: row.ultima_mensagem_corpo as string | null,
        ultimaMensagemTemAnexo: row.ultima_mensagem_tem_anexo as boolean,
        ultimaMensagemEm: row.ultima_mensagem_em as string,
        naoLidas: Number(row.nao_lidas),
      }
    })
}

export async function listarMensagens(outroProfileId: string, userId: string, antesDe?: string, limite = 50): Promise<MensagemDireta[]> {
  const supabase = createClient()
  let query = supabase
    .from('chat_mensagens_diretas')
    .select('*')
    .or(`and(remetente_id.eq.${userId},destinatario_id.eq.${outroProfileId}),and(remetente_id.eq.${outroProfileId},destinatario_id.eq.${userId})`)
    .order('criado_em', { ascending: false })
    .limit(limite)
  if (antesDe) query = query.lt('criado_em', antesDe)
  const { data, error } = await query
  if (error) throw new Error(`Falha ao carregar mensagens: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(mensagemDiretaFromRow).reverse()
}

/** Sempre via RPC -- cruza a fronteira do auth.uid() do destinatário, igual a enviar_provocacao_ranking. */
export async function enviarMensagemDireta(destinatarioProfileId: string, corpo: string | null, anexo?: Anexo | null): Promise<void> {
  const supabase = createClient()
  const cols = colunasAnexo(anexo)
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.rpc('enviar_mensagem_direta', {
    p_destinatario_profile_id: destinatarioProfileId,
    p_corpo: corpo,
    p_anexo_url: cols.anexo_url,
    p_anexo_nome_original: cols.anexo_nome_original,
    p_anexo_tipo_mime: cols.anexo_tipo_mime,
    p_anexo_tamanho_bytes: cols.anexo_tamanho_bytes,
  })
  if (error) throw new Error(error.message)

  dispararPush({
    destinatarios: [destinatarioProfileId],
    titulo: 'Nova mensagem',
    corpo: corpo ?? '📎 Enviou um anexo',
    url: user ? `/chat/${user.id}` : '/chat',
  })
}

/** Marca como lida na própria linha do destinatário -- RLS + trigger permitem, sem RPC. */
export async function marcarConversaComoLida(outroProfileId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('chat_mensagens_diretas')
    .update({ lida_em: new Date().toISOString() })
    .eq('remetente_id', outroProfileId)
    .eq('destinatario_id', userId)
    .is('lida_em', null)
  if (error) throw new Error(`Falha ao marcar conversa como lida: ${error.message}`)
}

export async function apagarMensagemDireta(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('chat_mensagens_diretas').update({ deletado_em: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`Falha ao apagar mensagem: ${error.message}`)
}

/** Edita o corpo -- o trigger no banco distingue "editar" de "apagar" pela intenção do UPDATE. */
export async function editarMensagemDireta(id: string, novoCorpo: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('chat_mensagens_diretas').update({ corpo: novoCorpo }).eq('id', id)
  if (error) throw new Error(`Falha ao editar mensagem: ${error.message}`)
}

/** Uma função só, reaproveitada pela lista de conversas e pela thread aberta -- cada
 *  consumidor decide o que fazer com a linha que mudou (RLS já garante que só chegam
 *  linhas onde o usuário é remetente ou destinatário). */
export function inscreverChatDiretoEmTempoReal(onChange: () => void) {
  const supabase = createClient()
  const channel = supabase.channel('chat-mensagens-diretas-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_mensagens_diretas' }, onChange)
  autenticarRealtime(supabase).then(() => channel.subscribe())
  return () => { supabase.removeChannel(channel) }
}

// ─── Badge combinado (avisos + DMs não lidos) ──────────────────────────────

export async function contarNaoLidasChat(): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('chat_contar_nao_lidas')
  if (error) throw new Error(`Falha ao contar não lidas do chat: ${error.message}`)
  return Number(data ?? 0)
}

// ─── Indicador de "digitando" -- broadcast puro, sem tabela, um canal só por
// conversa aberta (reaproveitado tanto pra mandar quanto pra receber, em vez de
// abrir/fechar um canal novo a cada sinal -- mais barato e sem corrida). ────

export interface CanalDigitando {
  enviar: () => void
  fechar: () => void
}

export function abrirCanalDigitando(userId: string, outroProfileId: string, onDigitando: () => void): CanalDigitando {
  const supabase = createClient()
  const nomeCanal = `chat-digitando-${[userId, outroProfileId].sort().join('-')}`
  const channel = supabase.channel(nomeCanal)

  channel
    .on('broadcast', { event: 'digitando' }, ({ payload }) => {
      if (payload?.remetenteId !== userId) onDigitando()
    })
    .subscribe()

  return {
    enviar: () => { channel.send({ type: 'broadcast', event: 'digitando', payload: { remetenteId: userId } }) },
    fechar: () => { supabase.removeChannel(channel) },
  }
}
