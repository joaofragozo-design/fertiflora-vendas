'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { CATEGORIAS_PARADA, paradaEmBranco, type ParadaInput } from '@/lib/producao/types'

export function ParadaDialog({
  open,
  onClose,
  onRegistrar,
}: {
  open: boolean
  onClose: () => void
  onRegistrar: (input: ParadaInput) => Promise<void>
}) {
  const [form, setForm] = useState<ParadaInput>(() => paradaEmBranco())
  const [salvando, setSalvando] = useState(false)

  function set<K extends keyof ParadaInput>(campo: K, valor: ParadaInput[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleRegistrar() {
    setSalvando(true)
    try {
      await onRegistrar(form)
      setForm(paradaEmBranco())
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar parada">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Categoria</span>
        <div className="grid grid-cols-2 gap-1.5">
          {CATEGORIAS_PARADA.map((cat) => (
            <button
              key={cat.valor}
              type="button"
              onClick={() => set('categoria', cat.valor)}
              className={cn(
                'rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors',
                form.categoria === cat.valor ? 'bg-brand-500 text-ink-950' : 'bg-white/[0.06] text-white/60'
              )}
            >
              {cat.rotulo}
            </button>
          ))}
        </div>
      </div>

      <Input id="parada-submotivo" name="submotivo" tone="dark" label="O que aconteceu" placeholder="Ex.: entupimento no duto de alimentação" value={form.submotivo} onChange={(e) => set('submotivo', e.target.value)} />
      <Input id="parada-observacao" name="observacao" tone="dark" label="Observação · opcional" value={form.observacao} onChange={(e) => set('observacao', e.target.value)} />

      <Button onClick={handleRegistrar} disabled={salvando}>
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        Registrar parada agora
      </Button>
    </Dialog>
  )
}
