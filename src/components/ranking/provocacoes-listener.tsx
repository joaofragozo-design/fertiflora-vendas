'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { inscreverProvocacoesRecebidas } from '@/lib/provocacoes/queries'
import { CATALOGO_PROVOCACOES } from '@/lib/provocacoes/types'
import type { RankingEntry } from '@/lib/ranking/types'
import type { MembroEquipeApoio } from '@/lib/equipe-apoio/types'

interface ProvocacoesListenerProps {
  entradas: RankingEntry[]
  equipeApoio: MembroEquipeApoio[]
}

/** Invisível -- assina provocações recebidas em tempo real e mostra toast. Nome de quem mandou vem de `entradas`/`equipeApoio` (já carregados), sem query extra. */
export function ProvocacoesListener({ entradas, equipeApoio }: ProvocacoesListenerProps) {
  useEffect(() => {
    const parar = inscreverProvocacoesRecebidas((provocacao) => {
      const nome =
        entradas.find((e) => e.profileId === provocacao.remetenteId)?.nome ??
        equipeApoio.find((m) => m.profileId === provocacao.remetenteId)?.nome ??
        'Alguém'
      const { emoji, texto } = CATALOGO_PROVOCACOES[provocacao.tipo]
      toast(`${emoji} ${nome}: ${texto}`, { duration: 6000 })
    })
    return parar
  }, [entradas, equipeApoio])

  return null
}
