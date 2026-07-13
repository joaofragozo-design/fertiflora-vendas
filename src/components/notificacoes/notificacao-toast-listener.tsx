'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { inscreverNovasNotificacoes } from '@/lib/notificacoes/queries'
import { destravarAudioNotificacao, tocarSomNotificacao } from '@/lib/audio/notificacao-som'

const DURACAO_TREMOR_MS = 400

/** Invisível -- som + tremor na tela + toast quando uma notificação nova chega, em qualquer página do app. */
export function NotificacaoToastListener() {
  useEffect(() => {
    // Navegadores só liberam áudio depois de uma interação do usuário -- destrava no primeiro toque/clique da sessão.
    document.addEventListener('pointerdown', destravarAudioNotificacao, { once: true })

    return inscreverNovasNotificacoes((notificacao) => {
      document.body.classList.remove('tela-tremor')
      void document.body.offsetWidth
      document.body.classList.add('tela-tremor')
      setTimeout(() => document.body.classList.remove('tela-tremor'), DURACAO_TREMOR_MS)

      tocarSomNotificacao()
      toast(notificacao.titulo, { description: notificacao.corpo, duration: 6000 })
    })
  }, [])

  return null
}
