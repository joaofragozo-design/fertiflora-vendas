'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, TrendingUp } from 'lucide-react'
import { listarComissoes, agruparPorMes, nomeMes, type ComissaoItem } from '@/lib/comissoes/queries'
import { cn } from '@/lib/utils/cn'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

type Aba = 'receber' | 'recebidas'

export function ComissoesScreen({ userId }: { userId: string }) {
  const [itens, setItens] = useState<ComissaoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('receber')

  useEffect(() => {
    listarComissoes(userId).then((r) => { setItens(r); setCarregando(false) }).catch(() => setCarregando(false))
  }, [userId])

  const totalRecebido = useMemo(() => itens.filter((i) => i.recebida).reduce((s, i) => s + i.valor, 0), [itens])
  const totalAReceber = useMemo(() => itens.filter((i) => !i.recebida).reduce((s, i) => s + i.valor, 0), [itens])

  const filtrados = itens.filter((i) => (aba === 'recebidas' ? i.recebida : !i.recebida))
  const grupos = useMemo(() => {
    const g = agruparPorMes(filtrados)
    const chaves = [...g.keys()].sort((a, b) => (aba === 'recebidas' ? b.localeCompare(a) : a.localeCompare(b)))
    return chaves.map((chave) => ({
      chave,
      itens: g.get(chave)!.sort((a, b) => (aba === 'recebidas' ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data))),
    }))
  }, [filtrados, aba])

  return (
    <main className="min-h-screen bg-ink-950 pb-16">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display text-lg font-bold">Minhas Comissões</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass flex flex-col gap-1 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-300" />
              Recebidas
            </div>
            <div className="tabular text-lg font-extrabold text-brand-300">{fmtBRL(totalRecebido)}</div>
          </div>
          <div className="glass flex flex-col gap-1 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
              <Clock3 className="h-3.5 w-3.5 text-warning-400" />
              A receber
            </div>
            <div className="tabular text-lg font-extrabold text-warning-400">{fmtBRL(totalAReceber)}</div>
          </div>
        </div>

        <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
          <button
            onClick={() => setAba('receber')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'receber' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            A receber
          </button>
          <button
            onClick={() => setAba('recebidas')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'recebidas' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            Recebidas
          </button>
        </div>

        {carregando && <p className="text-center text-xs text-white/40">Carregando…</p>}
        {!carregando && grupos.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <TrendingUp className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">
              {aba === 'receber' ? 'Nenhuma comissão a receber ainda' : 'Nenhuma comissão recebida ainda'}
            </p>
          </div>
        )}

        {grupos.map(({ chave, itens: itensMes }) => {
          const totalMes = itensMes.reduce((s, i) => s + i.valor, 0)
          return (
            <div key={chave} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs font-extrabold uppercase tracking-wide text-white/50">{nomeMes(chave)}</span>
                <span className="tabular text-xs font-bold text-white/40">{fmtBRL(totalMes)}</span>
              </div>
              <div className="glass flex flex-col rounded-2xl p-2">
                {itensMes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{item.clienteNome ?? item.produto}</div>
                      <div className="truncate text-[11px] text-white/45">{item.produto} · {fmtData(item.data)}</div>
                    </div>
                    <div className={cn('tabular shrink-0 text-sm font-extrabold', item.recebida ? 'text-brand-300' : 'text-warning-400')}>
                      {fmtBRL(item.valor)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
