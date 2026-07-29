import { createClient } from '@/lib/supabase/client'

const EXPIRA_EM_SEGUNDOS = 3600
const cache = new Map<string, { url: string; expiraEm: number }>()

/** Bucket `chat-anexos` é privado -- todo anexo precisa de uma signed URL pra ser exibido. Cacheia em memória por path pra não reassinar a cada re-render. */
export async function resolverUrlAnexo(path: string): Promise<string> {
  const emCache = cache.get(path)
  if (emCache && emCache.expiraEm > Date.now()) return emCache.url

  const supabase = createClient()
  const { data, error } = await supabase.storage.from('chat-anexos').createSignedUrl(path, EXPIRA_EM_SEGUNDOS)
  if (error || !data) throw new Error(`Falha ao gerar link do anexo: ${error?.message ?? 'desconhecido'}`)

  cache.set(path, { url: data.signedUrl, expiraEm: Date.now() + (EXPIRA_EM_SEGUNDOS - 60) * 1000 })
  return data.signedUrl
}
