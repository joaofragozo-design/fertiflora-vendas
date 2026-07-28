'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { inscreverNovasNotificacoes } from '@/lib/notificacoes/queries'
import { apresentacaoDoTipo } from '@/lib/notificacoes/apresentacao'
import { destravarAudioNotificacao, tocarSomNotificacao, somNotificacaoAtivado } from '@/lib/audio/notificacao-som'

const DURACAO_TREMOR_MS = 400

/** Invisível -- som + tremor na tela + toast quando uma notificação nova chega, em qualquer página do app. */
export function NotificacaoToastListener() {
  useEffect(() => {
    // Navegadores só liberam áudio depois de uma interação do usuário -- destrava no primeiro toque/clique da sessão.
    document.addEventListener('pointerdown', destravarAudioNotificacao, { once: true })

    return inscreverNovasNotificacoes((notificacao) => {
      const { Icone, leve } = apresentacaoDoTipo(notificacao.tipo)

      // Tremor de tela e som ficam reservados pra notificações de maior peso -- disparar os dois
      // igual pra uma zoeira entre vendedores ou pra um baú de recompensa é sobre-reagir a um
      // evento de baixo risco, e ainda corre o risco de assustar quem está no meio de um cliente.
      if (!leve) {
        document.body.classList.remove('tela-tremor')
        void document.body.offsetWidth
        document.body.classList.add('tela-tremor')
        setTimeout(() => document.body.classList.remove('tela-tremor'), DURACAO_TREMOR_MS)

        if (somNotificacaoAtivado()) tocarSomNotificacao()
      }

      toast(notificacao.titulo, {
        description: notificacao.corpo,
        duration: 6000,
        icon: <Icone className="h-4 w-4" />,
      })
    })
  }, [])

  return null
}
