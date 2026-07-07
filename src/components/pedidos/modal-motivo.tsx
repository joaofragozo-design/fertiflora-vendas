'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ModalMotivoProps {
  titulo: string
  onFechar: () => void
  onConfirmar: (motivo: string) => Promise<void>
  onConfirmado: () => void
}

/** Modal genérico de "reprovar com motivo" — reutilizado pela Conferência e pela Análise de Crédito. */
export function ModalMotivo({ titulo, onFechar, onConfirmar, onConfirmado }: ModalMotivoProps) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleConfirmar() {
    setEnviando(true)
    try {
      await onConfirmar(motivo)
      toast.success('Registrado')
      onConfirmado()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao registrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <div className="glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">{titulo}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input tone="dark" label="Motivo" placeholder="Explique o motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <Button onClick={handleConfirmar} disabled={enviando}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirmar
        </Button>
      </div>
    </div>
  )
}
