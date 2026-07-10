'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { enviarProvocacao } from '@/lib/provocacoes/queries'
import { CATALOGO_PROVOCACOES, type TipoProvocacao } from '@/lib/provocacoes/types'

interface ProvocarModalProps {
  destinatarioProfileId: string
  destinatarioNome: string
  remetenteNome: string
  onFechar: () => void
}

const OPCOES = Object.entries(CATALOGO_PROVOCACOES) as [TipoProvocacao, { emoji: string; texto: string }][]

/** Modal de reação rápida (emoji + frase) -- livre, qualquer participante do Ranking (vendedor ou equipe de apoio) manda pra qualquer outro. */
export function ProvocarModal({ destinatarioProfileId, destinatarioNome, remetenteNome, onFechar }: ProvocarModalProps) {
  const [enviando, setEnviando] = useState<TipoProvocacao | null>(null)

  async function handleEnviar(tipo: TipoProvocacao) {
    setEnviando(tipo)
    try {
      await enviarProvocacao(destinatarioProfileId, tipo, remetenteNome)
      toast.success(`Enviado pra ${destinatarioNome}!`)
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar')
      setEnviando(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <div className="glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Provocar {destinatarioNome}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {OPCOES.map(([tipo, { emoji, texto }]) => (
            <button
              key={tipo}
              onClick={() => handleEnviar(tipo)}
              disabled={enviando !== null}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/8 p-3 text-center transition-colors hover:bg-white/15 disabled:opacity-40"
            >
              {enviando === tipo ? <Loader2 className="h-7 w-7 animate-spin text-brand-300" /> : <span className="text-3xl leading-none">{emoji}</span>}
              <span className="text-[10px] font-bold leading-tight text-white/70">{texto}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
