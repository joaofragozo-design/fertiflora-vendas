'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarClock, CheckCircle2, PackageSearch, Truck } from 'lucide-react'
import { listarAgendamentosDoVendedor } from '@/lib/agendamentos/queries'
import type { Agendamento } from '@/lib/agendamentos/types'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'

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

type StatusEntrega = 'jaCarregado' | 'carregando' | 'vaiCarregar'

/** Só existem 2 timestamps (enviado_em/confirmado_em) na Programação do Carregamento -- deriva o
 * status de 3 níveis a partir deles, mesma leitura que a tela da logística já faz visualmente. */
function statusDe(ag: Agendamento): StatusEntrega {
  if (ag.confirmadoEm) return 'jaCarregado'
  if (ag.enviadoEm) return 'carregando'
  return 'vaiCarregar'
}

const GRUPOS: { chave: StatusEntrega; titulo: string; icone: typeof Truck; cor: string }[] = [
  { chave: 'jaCarregado', titulo: 'Já carregado', icone: CheckCircle2, cor: 'bg-brand-500/15 text-brand-300' },
  { chave: 'carregando', titulo: 'Carregando', icone: Truck, cor: 'bg-warning-500/15 text-warning-400' },
  { chave: 'vaiCarregar', titulo: 'Vai carregar', icone: CalendarClock, cor: 'bg-white/10 text-white/50' },
]

/** Carregamentos agendados (na Programação do sistema de Carregamento) dos clientes do vendedor logado, agrupados por status e filtrados pela semana atual (segunda a sexta) -- mesma janela que a logística vê na tela dela. */
export function EntregaScreen() {
  usePageIntensity(0.2)
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

  const porGrupo = useMemo(() => {
    const mapa: Record<StatusEntrega, Agendamento[]> = { jaCarregado: [], carregando: [], vaiCarregar: [] }
    for (const ag of daSemana) mapa[statusDe(ag)].push(ag)
    return mapa
  }, [daSemana])

  const rotuloSemana = `${fmtData(inicio).split(' ')[1]} a ${fmtData(fim).split(' ')[1]}`

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display flex items-center gap-2 text-lg font-bold">
            <Truck className="h-5 w-5 text-brand-300" />
            Acompanhar Entrega
          </h1>
        </div>

        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-white/40">Semana de {rotuloSemana}</p>

        {carregando && <SkeletonListaCards />}

        {!carregando && daSemana.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <PackageSearch className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Nada agendado para essa semana</p>
            <p className="text-xs text-white/40">Assim que um cliente seu for programado na logística, aparece aqui.</p>
          </div>
        )}

        {!carregando && GRUPOS.map((grupo) => {
          const itens = porGrupo[grupo.chave]
          if (itens.length === 0) return null
          const Icone = grupo.icone
          return (
            <div key={grupo.chave} className="flex flex-col gap-2">
              <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-white/50">
                {grupo.titulo} <span className="text-white/30">({itens.length})</span>
              </div>
              {itens.map((ag) => (
                <div key={ag.id} className="glass flex flex-col gap-2 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${grupo.cor}`}>
                      <Icone className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{ag.cliente || 'Cliente não informado'}</div>
                      <div className="truncate text-xs text-white/45">
                        {fmtData(ag.data)} · {ag.totalToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ton
                      </div>
                    </div>
                  </div>
                  {ag.observacao && (
                    <p className="border-t border-white/10 pt-2 text-[11px] text-white/45">{ag.observacao}</p>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </main>
  )
}
