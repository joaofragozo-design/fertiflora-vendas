'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react'
import { listarTodosPedidos, aprovarCredito, reprovarCredito } from '@/lib/pedidos/queries'
import type { Pedido } from '@/lib/pedidos/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { PedidoCardBase } from './pedido-card-base'
import { ModalMotivo } from './modal-motivo'

type Aba = 'analise' | 'aprovados' | 'reprovados'

export function AnaliseCreditoScreen() {
  usePageIntensity(0.15)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('analise')
  const [reprovando, setReprovando] = useState<Pedido | null>(null)

  function carregar() {
    listarTodosPedidos().then((p) => { setPedidos(p); setCarregando(false) })
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(() => {
    if (aba === 'analise') return pedidos.filter((p) => p.status === 'aguardando_analise_credito')
    if (aba === 'aprovados') return pedidos.filter((p) => p.status === 'aprovado_credito')
    return pedidos.filter((p) => p.status === 'reprovado_credito')
  }, [pedidos, aba])

  async function handleAprovar(p: Pedido) {
    const numero = window.prompt('Número do contrato (deixe em branco se ainda não definido):', p.numeroContrato ?? '')
    if (numero === null) return
    try {
      await aprovarCredito(p.id, numero.trim() || null)
      toast.success('Pedido aprovado')
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aprovar')
    }
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/mais" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-brand-300" />
            Análise de Crédito
          </h1>
        </div>

        <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
          <button onClick={() => setAba('analise')} className={cn('flex-1 rounded-xl py-2 text-[11px] font-bold transition-colors', aba === 'analise' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}>Análise</button>
          <button onClick={() => setAba('aprovados')} className={cn('flex-1 rounded-xl py-2 text-[11px] font-bold transition-colors', aba === 'aprovados' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}>Aprovados</button>
          <button onClick={() => setAba('reprovados')} className={cn('flex-1 rounded-xl py-2 text-[11px] font-bold transition-colors', aba === 'reprovados' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}>Reprovados</button>
        </div>

        {carregando && <SkeletonListaCards />}
        {!carregando && filtrados.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <ShieldCheck className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">
              {aba === 'analise' ? 'Nenhum pedido aguardando análise' : aba === 'aprovados' ? 'Nenhum pedido aprovado ainda' : 'Nenhum pedido reprovado ainda'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtrados.map((p) => (
            <PedidoCardBase
              key={p.id}
              pedido={p}
              motivo={p.status === 'reprovado_credito' ? p.motivoRejeicao : null}
              statusIcone={
                p.status === 'aprovado_credito' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-300" />
                : p.status === 'reprovado_credito' ? <XCircle className="h-5 w-5 shrink-0 text-danger-400" />
                : <Clock3 className="h-5 w-5 shrink-0 text-warning-400" />
              }
              acoes={
                aba === 'analise' ? (
                  <>
                    <Button variant="ghost" className="w-auto flex-1 py-2 text-xs" onClick={() => setReprovando(p)}>Reprovar</Button>
                    <Button className="w-auto flex-1 py-2 text-xs" onClick={() => handleAprovar(p)}>Aprovar</Button>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>

      {reprovando && (
        <ModalMotivo
          titulo={`Reprovar pedido de ${reprovando.dados.clienteNome}`}
          onFechar={() => setReprovando(null)}
          onConfirmar={(motivo) => reprovarCredito(reprovando.id, motivo)}
          onConfirmado={() => { setReprovando(null); carregar() }}
        />
      )}
    </main>
  )
}
