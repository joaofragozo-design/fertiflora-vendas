'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { criarVendedorComercial, atualizarVendedorComercial } from '@/lib/ranking/queries'
import type { VendedorComercial } from '@/lib/ranking/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'

interface VendedorComercialModalProps {
  vendedor: VendedorComercial | null
  onFechar: () => void
  onSalvo: () => void
}

export function VendedorComercialModal({ vendedor, onFechar, onSalvo }: VendedorComercialModalProps) {
  const [codigo, setCodigo] = useState(vendedor ? String(vendedor.codigo) : '')
  const [nome, setNome] = useState(vendedor?.nome ?? '')
  const [agregado, setAgregado] = useState(vendedor?.agregado ?? false)
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    const codigoNum = Number(codigo)
    if (!codigoNum || !nome.trim()) {
      toast.error('Preencha código e nome')
      return
    }
    setSalvando(true)
    try {
      if (vendedor) {
        await atualizarVendedorComercial(vendedor.id, { codigo: codigoNum, nome: nome.trim(), agregado })
      } else {
        await criarVendedorComercial({ codigo: codigoNum, nome: nome.trim() })
      }
      toast.success(vendedor ? 'Vendedor atualizado' : 'Vendedor criado')
      onSalvo()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <div className="glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">{vendedor ? 'Editar vendedor' : 'Novo vendedor'}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input tone="dark" label="Código" inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="240" />
        <Input tone="dark" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do vendedor" />
        {vendedor && (
          <label className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/70">
            <input type="checkbox" checked={agregado} onChange={(e) => setAgregado(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Não disputa colocação (ex: Fertiflora, Outros)
          </label>
        )}
        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
    </Portal>
  )
}
