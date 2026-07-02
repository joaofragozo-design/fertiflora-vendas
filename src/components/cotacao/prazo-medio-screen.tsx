'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { calcularPrazoMedio, type Parcela } from '@/lib/pricing/prazo-medio'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface PrazoMedioScreenProps {
  parcelasIniciais: Parcela[]
  onConfirmar: (parcelas: Parcela[]) => void
  onCancelar: () => void
}

const MAX_PARCELAS = 8

function fmtPct(v: number) {
  return (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%'
}

export function PrazoMedioScreen({ parcelasIniciais, onConfirmar, onCancelar }: PrazoMedioScreenProps) {
  const [parcelas, setParcelas] = useState<Parcela[]>(
    parcelasIniciais.length > 0 ? parcelasIniciais : [{ percentual: 1, data: '' }]
  )

  const resultado = useMemo(() => calcularPrazoMedio(parcelas, new Date()), [parcelas])

  function atualizar(i: number, campo: keyof Parcela, valor: string) {
    setParcelas((prev) =>
      prev.map((p, idx) => idx === i
        ? { ...p, [campo]: campo === 'percentual' ? (parseFloat(valor) || 0) / 100 : valor }
        : p)
    )
  }

  function adicionar() {
    if (parcelas.length >= MAX_PARCELAS) return
    setParcelas((prev) => [...prev, { percentual: 0, data: '' }])
  }

  function remover(i: number) {
    setParcelas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const podeConfirmar = resultado.fechaEm100 && parcelas.every((p) => p.percentual === 0 || !!p.data)

  return (
    <main className="min-h-screen bg-ink-950 pb-16">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <button onClick={onCancelar} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-lg font-bold">Cálculo de Prazo Médio</h1>
        </div>

        <p className="text-[12.5px] leading-relaxed text-white/50">
          Informe cada parcela combinada com o cliente — data e percentual. A soma dos percentuais precisa fechar em 100%.
        </p>

        <div className="glass flex flex-col gap-3 rounded-3xl p-5">
          {parcelas.map((p, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">Data</label>
                <input
                  type="date"
                  value={p.data}
                  onChange={(e) => atualizar(i, 'data', e.target.value)}
                  className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-3 text-[15px] font-medium text-white outline-none focus:border-brand-400"
                />
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <label className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">%</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={p.percentual === 0 ? '' : (p.percentual * 100).toString()}
                  onChange={(e) => atualizar(i, 'percentual', e.target.value)}
                  placeholder="0"
                  className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-3 text-[15px] font-medium text-white outline-none focus:border-brand-400"
                />
              </div>
              {parcelas.length > 1 && (
                <button onClick={() => remover(i)} className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger-500/15 text-danger-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {parcelas.length < MAX_PARCELAS && (
            <button onClick={adicionar} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-xs font-bold text-white/60 hover:border-brand-400 hover:text-brand-300">
              <Plus className="h-4 w-4" />Adicionar parcela
            </button>
          )}
        </div>

        <div className="glass flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/60">Total dos percentuais</span>
            <span className={cn('tabular text-base font-extrabold', resultado.fechaEm100 ? 'text-brand-300' : 'text-warning-400')}>
              {fmtPct(resultado.totalPercentual)}
            </span>
          </div>

          {!resultado.fechaEm100 && (
            <p className="text-[11.5px] text-warning-400">
              {resultado.totalPercentual > 1 ? 'Passou de 100% — ajuste as parcelas.' : 'Ainda não fecha 100% — continue ajustando.'}
            </p>
          )}

          {podeConfirmar && resultado.dataMedia && (
            <div className="flex items-center justify-between rounded-xl bg-brand-500/10 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-brand-300"><CheckCircle2 className="h-4 w-4" />Data média de pagamento</span>
              <span className="tabular text-sm font-extrabold text-white">{resultado.dataMedia.toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>

        <Button disabled={!podeConfirmar} onClick={() => onConfirmar(parcelas)}>Confirmar parcelamento</Button>
        <Button variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </main>
  )
}
