import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * O handoff automático do JWT pro socket de realtime nem sempre completa a tempo de um
 * .subscribe() logo após criar o client -- sem isso, canais com RLS por usuário (ex.:
 * "destinatario_id = auth.uid()") simplesmente não recebem nenhum evento, mesmo com a
 * subscription confirmando status "SUBSCRIBED". Sempre aplicar antes de assinar um canal
 * que dependa de RLS por usuário (não é necessário para tabelas com RLS aberta pra
 * qualquer autenticado).
 */
export async function autenticarRealtime(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) await supabase.realtime.setAuth(data.session.access_token)
}
