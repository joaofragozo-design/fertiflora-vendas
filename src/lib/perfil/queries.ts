import { createClient } from '@/lib/supabase/client'

export interface Perfil {
  id: string
  username: string
  apelido: string | null
  avatarUrl: string | null
}

export async function buscarPerfil(userId: string): Promise<Perfil> {
  const supabase = createClient()
  const { data, error } = await supabase.from('profiles').select('id, username, apelido, avatar_url').eq('id', userId).single()
  if (error) throw new Error(`Falha ao carregar perfil: ${error.message}`)
  return { id: data.id, username: data.username, apelido: data.apelido, avatarUrl: data.avatar_url }
}

export async function atualizarApelido(userId: string, apelido: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update({ apelido: apelido.trim() || null }).eq('id', userId)
  if (error) throw new Error(`Falha ao salvar apelido: ${error.message}`)
}

export async function enviarAvatar(userId: string, arquivo: File): Promise<string> {
  const supabase = createClient()
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
