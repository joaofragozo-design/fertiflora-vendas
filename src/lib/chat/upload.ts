import { createClient } from '@/lib/supabase/client'
import type { Anexo, TipoAnexo } from './types'

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024

function tipoDoArquivo(arquivo: File): TipoAnexo {
  return arquivo.type.startsWith('image/') ? 'imagem' : 'arquivo'
}

/**
 * Sobe um anexo pro bucket privado `chat-anexos`. Path muda conforme o destino
 * (DM fica isolado por par de participantes, aviso fica numa pasta só de admin) --
 * as políticas de storage validam exatamente esse prefixo, ver Fase 0 do plano.
 */
export async function enviarAnexoChat(userId: string, arquivo: File, outroProfileId?: string): Promise<Anexo> {
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error('Arquivo muito grande (máx. 10MB)')
  }

  const supabase = createClient()
  const id = crypto.randomUUID()
  const prefixo = outroProfileId ? `dm/${[userId, outroProfileId].sort().join('/')}` : 'anuncios'
  const path = `${prefixo}/${id}-${arquivo.name}`

  const { error } = await supabase.storage.from('chat-anexos').upload(path, arquivo)
  if (error) throw new Error(`Falha ao enviar anexo: ${error.message}`)

  return { path, tipo: tipoDoArquivo(arquivo), nomeOriginal: arquivo.name, tamanhoBytes: arquivo.size }
}
