'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardCheck, Clock3, Send, XCircle } from 'lucide-react'
import { listarTodosPedidos, enviarParaAnaliseCredito, reprovarNaConferencia } from '@/lib/pedidos/queries'
import type { Pedido } from '@/lib/pedidos/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { PedidoCardBase } from './pedido-card-base'
import { ModalMotivo } from './modal-motivo'

type Aba = 'pendentes' | 'reprovados'

export function ConferenciaScreen() {
  usePageIntensity(0.15)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('pendentes')
  const [reprovando, setReprovando] = useState<Pedido | null>(null)

  function carregar() {
    listarTodosPedidos().then((p) => { setPedidos(p); setCarregando(false) })
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(
    () => pedidos.filter((p) => (aba === 'pendentes' ? p.status === 'aguardando_conferencia' : p.status === 'reprovado_conferencia')),
    [pedidos, aba]
  )

  async function handleEnviar(p: Pedido) {
    try {
      await enviarParaAnaliseCredito(p.id)
      toast.success('Enviado para análise de crédito')
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao encaminhar')
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
            <ClipboardCheck className="h-5 w-5 text-brand-300" />
            Conferência
          </h1>
        </div>

        <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
          <button onClick={() => setAba('pendentes')} className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'pendentes' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}>Pendentes</button>
          <button onClick={() => setAba('reprovados')} className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'reprovados' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}>Reprovados</button>
        </div>

        {carregando && <SkeletonListaCards />}
        {!carregando && filtrados.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <ClipboardCheck className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">
              {aba === 'pendentes' ? 'Nenhum pedido aguardando conferência' : 'Nenhum pedido reprovado ainda'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtrados.map((p) => (
            <PedidoCardBase
              key={p.id}
              pedido={p}
              motivo={p.status === 'reprovado_conferencia' ? p.motivoReprovacaoConferencia : null}
              statusIcone={p.status === 'reprovado_conferencia' ? <XCircle className="h-5 w-5 shrink-0 text-danger-400" /> : <Clock3 className="h-5 w-5 shrink-0 text-warning-400" />}
              acoes={
                aba === 'pendentes' ? (
                  <>
                    <Button variant="ghost" className="w-auto flex-1 py-2 text-xs" onClick={() => setReprovando(p)}>Reprovar</Button>
                    <Button className="w-auto flex-1 py-2 text-xs" onClick={() => handleEnviar(p)}>
                      <Send className="h-3.5 w-3.5" />
                      Análise de crédito
                    </Button>
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
          onConfirmar={(motivo) => reprovarNaConferencia(reprovando.id, motivo)}
          onConfirmado={() => { setReprovando(null); carregar() }}
        />
      )}
    </main>
  )
}
