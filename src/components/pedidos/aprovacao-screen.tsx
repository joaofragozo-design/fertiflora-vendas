'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Clock3, Download, Loader2, ShieldCheck, X, XCircle } from 'lucide-react'
import { listarTodosPedidos, aprovarPedido, rejeitarPedido } from '@/lib/pedidos/queries'
import { baixarContratoPdf } from '@/lib/pedidos/contrato-pdf'
import { calcularPedido, infoEmbalagem, type Pedido } from '@/lib/pedidos/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Aba = 'pendentes' | 'decididos'

export function AprovacaoScreen() {
  usePageIntensity(0.15)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('pendentes')
  const [rejeitando, setRejeitando] = useState<Pedido | null>(null)

  function carregar() {
    listarTodosPedidos().then((p) => { setPedidos(p); setCarregando(false) })
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(
    () => pedidos.filter((p) => (aba === 'pendentes' ? p.status === 'aguardando_aprovacao' : p.status === 'aprovado' || p.status === 'rejeitado')),
    [pedidos, aba]
  )

  async function handleAprovar(p: Pedido) {
    const numero = window.prompt('Número do contrato (deixe em branco se ainda não definido):', p.numeroContrato ?? '')
    if (numero === null) return
    try {
      await aprovarPedido(p.id, numero.trim() || null)
      toast.success('Pedido aprovado')
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aprovar')
    }
  }

  return (
    <main className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-brand-300" />
            Aprovações
          </h1>
        </div>

        <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
          <button
            onClick={() => setAba('pendentes')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'pendentes' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            Pendentes
          </button>
          <button
            onClick={() => setAba('decididos')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'decididos' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            Decididos
          </button>
        </div>

        {carregando && <p className="text-center text-xs text-white/40">Carregando…</p>}
        {!carregando && filtrados.length === 0 && (
          <p className="glass rounded-2xl p-5 text-center text-xs text-white/45">
            {aba === 'pendentes' ? 'Nenhum pedido aguardando aprovação.' : 'Nenhum pedido decidido ainda.'}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {filtrados.map((p) => {
            const calculo = calcularPedido(p.quantidadeToneladas, p.embalagem, p.dados.precoVendidoTon, p.dados.freteTon)
            return (
              <div key={p.id} className="glass flex flex-col gap-2.5 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{p.dados.clienteNome}</div>
                    <div className="truncate text-xs text-white/45">{p.dados.produto} · {infoEmbalagem(p.embalagem).rotulo}</div>
                  </div>
                  {p.status === 'aprovado' && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-300" />}
                  {p.status === 'rejeitado' && <XCircle className="h-5 w-5 shrink-0 text-danger-400" />}
                  {p.status === 'aguardando_aprovacao' && <Clock3 className="h-5 w-5 shrink-0 text-warning-400" />}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MiniRow label="Vendedor" value={p.dados.vendedorNome} />
                  <MiniRow label="Quantidade" value={`${p.quantidadeToneladas.toLocaleString('pt-BR')} t`} />
                  <MiniRow label="Preço/t" value={fmtBRL(p.dados.precoVendidoTon)} />
                  <MiniRow label="Valor total" value={fmtBRL(calculo.valorTotalPedido)} />
                </div>

                {p.motivoRejeicao && (
                  <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-2.5 text-[11px] text-danger-300">{p.motivoRejeicao}</p>
                )}

                <div className="flex items-center gap-2 border-t border-white/10 pt-2.5">
                  <button onClick={() => baixarContratoPdf(p)} className="flex items-center gap-1 text-[11px] font-bold text-white/50">
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  {p.status === 'aguardando_aprovacao' && (
                    <div className="ml-auto flex w-auto gap-2">
                      <Button variant="ghost" className="w-auto flex-1 py-2 text-xs" onClick={() => setRejeitando(p)}>Rejeitar</Button>
                      <Button className="w-auto flex-1 py-2 text-xs" onClick={() => handleAprovar(p)}>Aprovar</Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {rejeitando && (
        <ModalRejeitar
          pedido={rejeitando}
          onFechar={() => setRejeitando(null)}
          onRejeitado={() => { setRejeitando(null); carregar() }}
        />
      )}
    </main>
  )
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9.5px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      <span className="tabular text-xs font-bold text-white">{value}</span>
    </div>
  )
}

function ModalRejeitar({ pedido, onFechar, onRejeitado }: { pedido: Pedido; onFechar: () => void; onRejeitado: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleRejeitar() {
    setEnviando(true)
    try {
      await rejeitarPedido(pedido.id, motivo)
      toast.success('Pedido rejeitado')
      onRejeitado()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao rejeitar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <div className="glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Rejeitar pedido</h2>
          <button onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input tone="dark" label="Motivo" placeholder="Explique o motivo da rejeição" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <Button onClick={handleRejeitar} disabled={enviando}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirmar rejeição
        </Button>
      </div>
    </div>
  )
}
