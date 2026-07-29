'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { inscreverNovasNotificacoes } from '@/lib/notificacoes/queries'
import { apresentacaoDoTipo, destinoDaNotificacao } from '@/lib/notificacoes/apresentacao'
import { destravarAudioNotificacao, somNotificacaoAtivado } from '@/lib/audio/notificacao-som'

const DURACAO_TREMOR_MS = 400

/** Invisível -- som + tremor na tela + toast quando uma notificação nova chega, em qualquer página do app. */
export function NotificacaoToastListener() {
  const router = useRouter()

  useEffect(() => {
    // Navegadores só liberam áudio depois de uma interação do usuário -- destrava no primeiro toque/clique da sessão.
    document.addEventListener('pointerdown', destravarAudioNotificacao, { once: true })

    return inscreverNovasNotificacoes((notificacao) => {
      const { Icone, tremor, som } = apresentacaoDoTipo(notificacao.tipo)
      const destino = destinoDaNotificacao(notificacao)

      // Tremor e som são independentes por tipo (ver apresentacao.ts) -- tremor continua
      // reservado pra evento de peso alto (nenhum tipo usa hoje); som toca sempre que o
      // catálogo define um, mesmo sem tremor (ex.: chat quer ser ouvido, não quer assustar).
      if (tremor) {
        document.body.classList.remove('tela-tremor')
        void document.body.offsetWidth
        document.body.classList.add('tela-tremor')
        setTimeout(() => document.body.classList.remove('tela-tremor'), DURACAO_TREMOR_MS)
      }

      if (som && somNotificacaoAtivado()) som()

      toast(notificacao.titulo, {
        description: notificacao.corpo,
        duration: 6000,
        icon: <Icone className="h-4 w-4" />,
        action: destino ? { label: 'Abrir', onClick: () => router.push(destino) } : undefined,
      })
    })
  }, [router])

  return null
}
