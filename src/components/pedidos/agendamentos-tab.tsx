'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Truck } from 'lucide-react'
import { listarAgendamentosDoVendedor } from '@/lib/agendamentos/queries'
import type { Agendamento } from '@/lib/agendamentos/types'
import { SkeletonListaCards } from '@/components/ui/skeleton'

function fmtData(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function paraIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** Segunda-feira da semana de `ref` -- mesma fórmula da Programação do Carregamento (segunda a sexta). */
function segundaDaSemana(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const dow = d.getDay() // 0 = domingo
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d
}
function somarDias(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Carregamentos agendados (na Programação do sistema de Carregamento) dos clientes do vendedor logado, filtrado pela semana atual (segunda a sexta) -- mesma janela que a Françoa vê na tela dela. */
export function AgendamentosTab() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    listarAgendamentosDoVendedor()
      .then((lista) => { if (ativo) { setAgendamentos(lista); setCarregando(false) } })
      .catch(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  const { inicio, fim } = useMemo(() => {
    const segunda = segundaDaSemana(new Date())
    return { inicio: paraIso(segunda), fim: paraIso(somarDias(segunda, 4)) }
  }, [])

  const daSemana = useMemo(
    () => agendamentos.filter((ag) => ag.data >= inicio && ag.data <= fim),
    [agendamentos, inicio, fim]
  )

  const rotuloSemana = `${fmtData(inicio).split(' ')[1]} a ${fmtData(fim).split(' ')[1]}`

  if (carregando) return <SkeletonListaCards />

  if (daSemana.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
        <CalendarClock className="h-8 w-8 text-white/25" />
        <p className="text-sm font-semibold text-white/60">Nada agendado para essa semana</p>
        <p className="text-xs text-white/40">Semana de {rotuloSemana} · assim que um cliente seu for programado na logística, aparece aqui.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-white/40">Semana de {rotuloSemana}</div>
      {daSemana.map((ag) => (
        <div key={ag.id} className="glass flex flex-col gap-2 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ag.confirmadoEm ? 'bg-brand-500/15 text-brand-300' : 'bg-white/10 text-white/50'}`}>
              <Truck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{ag.cliente || 'Cliente não informado'}</div>
              <div className="truncate text-xs text-white/45">
                {fmtData(ag.data)} · {ag.totalToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ton
              </div>
            </div>
            {ag.confirmadoEm ? (
              <span className="shrink-0 flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-[10px] font-bold text-brand-300">
                <CheckCircle2 className="h-3 w-3" /> Chegou
              </span>
            ) : ag.enviadoEm ? (
              <span className="shrink-0 rounded-full bg-warning-500/15 px-2.5 py-1 text-[10px] font-bold text-warning-400">Enviado</span>
            ) : (
              <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/50">Programado</span>
            )}
          </div>
          {ag.observacao && (
            <p className="border-t border-white/10 pt-2 text-[11px] text-white/45">{ag.observacao}</p>
          )}
        </div>
      ))}
    </div>
  )
}
