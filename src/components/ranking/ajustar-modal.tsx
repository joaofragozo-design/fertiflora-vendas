'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { ajustarFaturado, ajustarMeta } from '@/lib/ranking/queries'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AjustarModalProps {
  entrada: { id: string; nome: string; faturado: number; meta: number }
  ano: number
  onFechar: () => void
  onAtualizado: () => void
}

export function AjustarModal({ entrada, ano, onFechar, onAtualizado }: AjustarModalProps) {
  const [faturado, setFaturado] = useState(String(entrada.faturado))
  const [meta, setMeta] = useState(String(entrada.meta))
  const [salvando, setSalvando] = useState(false)

  function parseNumero(v: string): number {
    return Number(v.replace(',', '.')) || 0
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      await Promise.all([
        ajustarFaturado(entrada.id, ano, parseNumero(faturado)),
        ajustarMeta(entrada.id, ano, parseNumero(meta)),
      ])
      toast.success('Ranking atualizado')
      onAtualizado()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <div className="glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Ajustar {entrada.nome}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input tone="dark" label={`Faturado ${ano} (toneladas)`} inputMode="decimal" value={faturado} onChange={(e) => setFaturado(e.target.value)} />
        <Input tone="dark" label={`Meta ${ano} (toneladas)`} inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} />
        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}
