'use client'

import { useMemo, useState } from 'react'
import { FileText, Loader2, Send } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AnexoPickerProps {
  arquivo: File
  onFechar: () => void
  onEnviar: (legenda: string | null) => Promise<void>
}

/** Preview do arquivo escolhido + legenda opcional, antes de efetivamente subir e enviar. */
export function AnexoPicker({ arquivo, onFechar, onEnviar }: AnexoPickerProps) {
  const [legenda, setLegenda] = useState('')
  const [enviando, setEnviando] = useState(false)
  const ehImagem = arquivo.type.startsWith('image/')
  const urlPreview = useMemo(() => (ehImagem ? URL.createObjectURL(arquivo) : null), [arquivo, ehImagem])

  async function handleEnviar() {
    setEnviando(true)
    try {
      await onEnviar(legenda.trim() || null)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open onClose={onFechar} title="Enviar anexo" closeOnBackdrop={!enviando}>
      {ehImagem && urlPreview ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview local via object URL, não é uma imagem do domínio do app
        <img src={urlPreview} alt={arquivo.name} className="max-h-72 w-full rounded-xl object-contain" />
      ) : (
        <div className="glass flex items-center gap-3 rounded-xl p-4">
          <FileText className="h-6 w-6 shrink-0 text-brand-300" />
          <span className="truncate text-sm font-semibold">{arquivo.name}</span>
        </div>
      )}

      <Input
        id="anexo-legenda"
        name="legenda"
        tone="dark"
        label="Legenda · opcional"
        value={legenda}
        onChange={(e) => setLegenda(e.target.value)}
        disabled={enviando}
      />

      <Button onClick={handleEnviar} disabled={enviando}>
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar
      </Button>
    </Dialog>
  )
}
