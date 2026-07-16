'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { definirLimiteCarteiraPrazo } from '@/lib/fluxo-caixa/queries'
import type { LimiteCarteiraPrazoRow } from '@/lib/fluxo-caixa/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'

interface DefinirLimiteModalProps {
  chavePeriodo: string
  limiteAtual: LimiteCarteiraPrazoRow | null
  onFechar: () => void
  onDefinido: () => void
}

/** Sempre cria uma linha nova (histórico insert-only, ver migration 050) -- nunca edita a decisão anterior. */
export function DefinirLimiteModal({ chavePeriodo, limiteAtual, onFechar, onDefinido }: DefinirLimiteModalProps) {
  const [limiteToneladas, setLimiteToneladas] = useState(String(limiteAtual?.limiteToneladas ?? ''))
  const [reservaPct, setReservaPct] = useState(String(limiteAtual?.reservaPct ?? 30))
  const [salvando, setSalvando] = useState(false)

  // Remove separador de milhar (ponto) antes de trocar a vírgula decimal -- sem isso, "10.000,00"
  // (o formato óbvio de digitar um limite de 10 mil toneladas) vira "10.000.00", NaN, e salva 0
  // silenciosamente, desligando o alerta de reserva (que já não dispara com limite <= 0).
  function parseNumero(v: string): number {
    return Number(v.replace(/\./g, '').replace(',', '.')) || 0
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      await definirLimiteCarteiraPrazo({ chavePeriodo, limiteToneladas: parseNumero(limiteToneladas), reservaPct: parseNumero(reservaPct) })
      toast.success(`Limite de ${chavePeriodo} definido`)
      onDefinido()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao definir limite')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
        <div className="glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">Definir limite — {chavePeriodo}</h2>
            <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
              <X className="h-4 w-4" />
            </button>
          </div>
          {limiteAtual && (
            <p className="text-[10.5px] text-white/40">
              Valor atual: {limiteAtual.limiteToneladas.toLocaleString('pt-BR')}t, {limiteAtual.reservaPct}% de reserva. Isso cria uma nova decisão histórica — não sobrescreve a anterior.
            </p>
          )}
          <Input tone="dark" label="Limite de crédito (toneladas)" inputMode="decimal" value={limiteToneladas} onChange={(e) => setLimiteToneladas(e.target.value)} />
          <Input tone="dark" label="Reserva pra safrinha (%)" inputMode="decimal" value={reservaPct} onChange={(e) => setReservaPct(e.target.value)} />
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </Portal>
  )
}
