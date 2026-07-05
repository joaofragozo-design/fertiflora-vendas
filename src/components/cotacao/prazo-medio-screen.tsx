'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, X, CheckCircle2 } from 'lucide-react'
import { calcularPrazoMedio, type Parcela } from '@/lib/pricing/prazo-medio'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface PrazoMedioScreenProps {
  parcelasIniciais: Parcela[]
  onConfirmar: (parcelas: Parcela[]) => void
  onCancelar: () => void
}

/**
 * Percentual é guardado como string bruta enquanto o vendedor digita — nunca
 * reformatado a partir do número (0.07 * 100 vira 7.000000000000001 em ponto
 * flutuante, e o campo "buga"). Só vira fração (0..1) na hora de calcular.
 */
interface ParcelaForm {
  percentualStr: string
  data: string
}

const MAX_PARCELAS = 8

function fmtPct(v: number) {
  return (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%'
}

function paraParcelas(form: ParcelaForm[]): Parcela[] {
  return form.map((p) => ({ percentual: (parseFloat(p.percentualStr.replace(',', '.')) || 0) / 100, data: p.data }))
}

export function PrazoMedioScreen({ parcelasIniciais, onConfirmar, onCancelar }: PrazoMedioScreenProps) {
  const [form, setForm] = useState<ParcelaForm[]>(
    parcelasIniciais.length > 0
      ? parcelasIniciais.map((p) => ({ percentualStr: p.percentual ? String(p.percentual * 100) : '', data: p.data }))
      : [{ percentualStr: '100', data: '' }]
  )

  const resultado = useMemo(() => calcularPrazoMedio(paraParcelas(form), new Date()), [form])

  function atualizarData(i: number, valor: string) {
    setForm((prev) => prev.map((p, idx) => (idx === i ? { ...p, data: valor } : p)))
  }

  function atualizarPercentual(i: number, valor: string) {
    setForm((prev) => prev.map((p, idx) => (idx === i ? { ...p, percentualStr: valor } : p)))
  }

  function adicionar() {
    if (form.length >= MAX_PARCELAS) return
    setForm((prev) => [...prev, { percentualStr: '', data: '' }])
  }

  function remover(i: number) {
    setForm((prev) => prev.filter((_, idx) => idx !== i))
  }

  const podeConfirmar = resultado.fechaEm100 && form.every((p) => !p.percentualStr || parseFloat(p.percentualStr) === 0 || !!p.data)

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <button onClick={onCancelar} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-lg font-bold">Cálculo de Prazo Médio</h1>
        </div>

        <p className="text-[12.5px] leading-relaxed text-white/50">
          Informe cada parcela combinada com o cliente — data e percentual. A soma dos percentuais precisa fechar em 100%.
        </p>

        <div className="flex flex-col gap-3">
          {form.map((p, i) => (
            <div key={i} className="glass flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70">Parcela {i + 1}</span>
                {form.length > 1 && (
                  <button onClick={() => remover(i)} aria-label="Remover parcela" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-white/50 hover:bg-danger-500/20 hover:text-danger-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-bold uppercase tracking-wide text-white/50">Data</label>
                  <input
                    type="date"
                    value={p.data}
                    onChange={(e) => atualizarData(i, e.target.value)}
                    className="rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-3 text-[15px] font-medium text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div className="flex w-24 flex-col gap-1.5">
                  <label className="text-[10.5px] font-bold uppercase tracking-wide text-white/50">%</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={p.percentualStr}
                      onChange={(e) => atualizarPercentual(i, e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-white/15 bg-white/[0.06] py-3 pl-3.5 pr-6 text-[15px] font-medium text-white outline-none focus:border-brand-400"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/50">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {form.length < MAX_PARCELAS && (
            <button onClick={adicionar} className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-3.5 text-xs font-bold text-white/60 hover:border-brand-400 hover:text-brand-300">
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

        <Button disabled={!podeConfirmar} onClick={() => onConfirmar(paraParcelas(form))}>Confirmar parcelamento</Button>
        <Button variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </main>
  )
}
