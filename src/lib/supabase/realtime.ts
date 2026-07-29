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

/**
 * `supabase.channel(topico)` reaproveita o canal existente quando o tópico já está
 * registrado -- se um mount anterior (StrictMode/Fast Refresh, ou remontar a mesma tela
 * rápido) ainda não terminou de remover seu canal (removeChannel é assíncrono) antes do
 * próximo mount tentar assinar de novo, `.on()` é chamado num canal que já passou por
 * `.subscribe()`, e o SDK estoura "cannot add ... callbacks ... after subscribe()".
 * Chamar isso antes de `supabase.channel(topico)` garante que não sobra lixo do mount
 * anterior pra ser reaproveitado.
 */
export function removerCanalExistente(supabase: SupabaseClient, topico: string): void {
  const existente = supabase.getChannels().find((c) => c.topic === `realtime:${topico}`)
  if (existente) supabase.removeChannel(existente)
}
