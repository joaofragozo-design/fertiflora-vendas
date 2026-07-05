import { createClient } from '@/lib/supabase/client'

export interface Perfil {
  id: string
  username: string
  apelido: string | null
  avatarUrl: string | null
  pracaAtuacao: string | null
  nomeCompleto: string | null
  telefone: string | null
}

/**
 * Garante que a linha em `profiles` existe antes de ler/gravar. Alguns usuários
 * (ex.: provisionados via script admin) nunca tiveram o profile auto-criado pelo
 * trigger — sem isso, SELECT .single() falha com PGRST116 (406) e UPDATE vira
 * um no-op silencioso em 0 linhas, dando a falsa impressão de "não salva".
 */
async function garantirPerfil(userId: string, usernameFallback: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, username: usernameFallback, role: 'vendedor' }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw new Error(`Falha ao inicializar perfil: ${error.message}`)
}

export async function buscarPerfil(userId: string, usernameFallback: string): Promise<Perfil> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, apelido, avatar_url, praca_atuacao, nome_completo, telefone')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar perfil: ${error.message}`)

  if (!data) {
    await garantirPerfil(userId, usernameFallback)
    return { id: userId, username: usernameFallback, apelido: null, avatarUrl: null, pracaAtuacao: null, nomeCompleto: null, telefone: null }
  }

  return {
    id: data.id,
    username: data.username,
    apelido: data.apelido,
    avatarUrl: data.avatar_url,
    pracaAtuacao: data.praca_atuacao,
    nomeCompleto: data.nome_completo,
    telefone: data.telefone,
  }
}

export interface AtualizacaoPerfil {
  apelido: string
  pracaAtuacao: string
  nomeCompleto: string
  telefone: string
}

export async function atualizarPerfil(userId: string, usernameFallback: string, dados: AtualizacaoPerfil): Promise<void> {
  const supabase = createClient()
  await garantirPerfil(userId, usernameFallback)
  const { error } = await supabase
    .from('profiles')
    .update({
      apelido: dados.apelido.trim() || null,
      praca_atuacao: dados.pracaAtuacao.trim() || null,
      nome_completo: dados.nomeCompleto.trim() || null,
      telefone: dados.telefone.trim() || null,
    })
    .eq('id', userId)
  if (error) throw new Error(`Falha ao salvar perfil: ${error.message}`)
}

export async function enviarAvatar(userId: string, usernameFallback: string, arquivo: File): Promise<string> {
  const supabase = createClient()
  await garantirPerfil(userId, usernameFallback)

  const extensao = arquivo.name.split('.').pop() ?? 'png'
  const caminho = `${userId}/avatar.${extensao}`

  const { error: erroUpload } = await supabase.storage.from('avatars').upload(caminho, arquivo, { upsert: true })
  if (erroUpload) throw new Error(`Falha ao enviar foto: ${erroUpload.message}`)

  const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)
  const urlComCache = `${data.publicUrl}?v=${Date.now()}`

  const { error: erroUpdate } = await supabase.from('profiles').update({ avatar_url: urlComCache }).eq('id', userId)
  if (erroUpdate) throw new Error(`Falha ao salvar foto: ${erroUpdate.message}`)

  return urlComCache
}
