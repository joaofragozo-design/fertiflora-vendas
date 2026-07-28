'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
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
    <Dialog
      open
      onClose={onFechar}
      title={`😏 Provocar ${destinatarioNome}`}
      className="border border-warning-500/25 shadow-glow-gold [animation:conquista-pop_0.45s_cubic-bezier(.34,1.56,.64,1)]"
    >
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {OPCOES.map(([tipo, { emoji, texto }]) => (
          <button
            key={tipo}
            onClick={() => handleEnviar(tipo)}
            disabled={enviando !== null}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-warning-500/10 p-3 text-center transition-colors hover:bg-warning-500/20 disabled:opacity-40"
          >
            {enviando === tipo ? <Loader2 className="h-7 w-7 animate-spin text-brand-300" /> : <span className="text-3xl leading-none">{emoji}</span>}
            <span className="text-[10px] font-bold leading-tight text-white/70">{texto}</span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
