import { createClient } from '@/lib/supabase/client'
import { CATALOGO_PROVOCACOES, type TipoProvocacao } from './types'

/**
 * Manda uma provocação pro perfil `destinatarioProfileId` -- RPC valida no servidor que ele
 * participa do Ranking (vendedor vinculado ou equipe de apoio). Grava tanto o registro de tempo
 * real (toast, só pra quem está com a tela aberta na hora) quanto uma notificação persistente
 * (aparece no sininho depois, pra quem não estava online no momento do envio).
 */
export async function enviarProvocacao(destinatarioProfileId: string, tipo: TipoProvocacao, remetenteNome: string): Promise<void> {
  const supabase = createClient()
  const { emoji, texto } = CATALOGO_PROVOCACOES[tipo]
  const { error } = await supabase.rpc('enviar_provocacao_ranking', {
    p_destinatario_profile_id: destinatarioProfileId,
    p_tipo: tipo,
    p_titulo: `${remetenteNome} te mandou uma provocação`,
    p_corpo: `${emoji} ${texto}`,
  })
  if (error) throw new Error(error.message)
}
