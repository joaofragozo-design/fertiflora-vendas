import { createClient } from '@/lib/supabase/client'

/**
 * Reautentica com a senha atual antes de trocar -- `auth.updateUser` por si só não exige a senha
 * atual (só a sessão já autenticada), o que deixaria qualquer um com a sessão aberta num
 * dispositivo compartilhado trocar a senha sem saber a antiga.
 */
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('Sessão expirada — faça login novamente.')

  const { error: erroReauth } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaAtual })
  if (erroReauth) throw new Error('Senha atual incorreta.')

  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) throw new Error(`Falha ao trocar a senha: ${error.message}`)
}
