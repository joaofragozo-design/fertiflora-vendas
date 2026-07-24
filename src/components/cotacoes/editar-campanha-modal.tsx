'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { definirCampanhaAvista } from '@/lib/cotacoes/queries'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'

interface EditarCampanhaModalProps {
  configId: string
  ativaAtual: boolean
  descontoPctAtual: number
  onFechar: () => void
  onSalvo: () => void
}

/** Edita só o percentual -- liga/desliga a campanha fica no botão de fora (handleAlternarCampanha), não aqui. */
export function EditarCampanhaModal({ configId, ativaAtual, descontoPctAtual, onFechar, onSalvo }: EditarCampanhaModalProps) {
  const [descontoPct, setDescontoPct] = useState(String((descontoPctAtual * 100).toLocaleString('pt-BR')))
  const [salvando, setSalvando] = useState(false)

  function parseNumero(v: string): number {
    return Number(v.replace(/\./g, '').replace(',', '.')) || 0
  }

  async function handleSalvar() {
    const pct = parseNumero(descontoPct)
    if (pct <= 0 || pct >= 100) {
      toast.error('Informe um percentual entre 0 e 100')
      return
    }
    setSalvando(true)
    try {
      await definirCampanhaAvista(configId, { ativa: ativaAtual, descontoPct: pct / 100 })
      toast.success(`Desconto da campanha à vista atualizado para ${pct.toLocaleString('pt-BR')}%`)
      onSalvo()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao atualizar desconto')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
        <div className="glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">Desconto — Campanha à Vista</h2>
            <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10.5px] text-white/40">
            Percentual de desconto sobre o preço de tabela, mostrado ao cliente quando a entrega acontece no mesmo dia ou depois do pagamento. Não muda a comissão extra de 1% à vista.
          </p>
          <Input tone="dark" label="Desconto (%)" inputMode="decimal" value={descontoPct} onChange={(e) => setDescontoPct(e.target.value)} />
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </Portal>
  )
}
