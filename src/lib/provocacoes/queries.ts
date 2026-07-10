import { createClient } from '@/lib/supabase/client'
import { CATALOGO_PROVOCACOES, provocacaoFromRow, type Provocacao, type TipoProvocacao } from './types'

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

/** RLS já restringe a `destinatario_id = auth.uid()` -- só chega evento de provocação recebida por mim. */
export function inscreverProvocacoesRecebidas(onNova: (provocacao: Provocacao) => void) {
  const supabase = createClient()
  const channel = supabase
    .channel('provocacoes-recebidas')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'provocacoes_ranking' }, (payload) => {
      onNova(provocacaoFromRow(payload.new as Record<string, unknown>))
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
