'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { inscreverNovasNotificacoes } from '@/lib/notificacoes/queries'

const DURACAO_TREMOR_MS = 400

/** Invisível -- tremor na tela + toast quando uma notificação nova chega, em qualquer página do app. */
export function NotificacaoToastListener() {
  useEffect(() => {
    return inscreverNovasNotificacoes((notificacao) => {
      document.body.classList.remove('tela-tremor')
      void document.body.offsetWidth
      document.body.classList.add('tela-tremor')
      setTimeout(() => document.body.classList.remove('tela-tremor'), DURACAO_TREMOR_MS)

      toast(notificacao.titulo, { description: notificacao.corpo, duration: 6000 })
    })
  }, [])

  return null
}
