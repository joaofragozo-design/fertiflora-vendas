'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Clock3, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { listarTodosPedidos, aprovarCredito, reprovarCredito } from '@/lib/pedidos/queries'
import type { Pedido } from '@/lib/pedidos/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
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
  const [aprovando, setAprovando] = useState<Pedido | null>(null)
  const [numeroContrato, setNumeroContrato] = useState('')
  const [confirmandoAprovacao, setConfirmandoAprovacao] = useState(false)

  function carregar() {
    listarTodosPedidos().then((p) => { setPedidos(p); setCarregando(false) })
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(() => {
    if (aba === 'analise') return pedidos.filter((p) => p.status === 'aguardando_analise_credito')
    if (aba === 'aprovados') return pedidos.filter((p) => p.status === 'aprovado_credito')
    return pedidos.filter((p) => p.status === 'reprovado_credito')
  }, [pedidos, aba])

  function abrirAprovacao(p: Pedido) {
    setNumeroContrato(p.numeroContrato ?? '')
    setAprovando(p)
  }

  async function handleAprovar() {
    if (!aprovando) return
    setConfirmandoAprovacao(true)
    try {
      await aprovarCredito(aprovando.id, numeroContrato.trim() || null)
      toast.success('Pedido aprovado')
      setAprovando(null)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aprovar')
    } finally {
      setConfirmandoAprovacao(false)
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
            <ShieldCheck className="h-5 w-5 text-danger-400" />
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
                    <Button className="w-auto flex-1 py-2 text-xs" onClick={() => abrirAprovacao(p)}>Aprovar</Button>
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

      <Dialog open={!!aprovando} onClose={() => setAprovando(null)} title={aprovando ? `Aprovar pedido de ${aprovando.dados.clienteNome}` : undefined}>
        <p className="text-xs text-white/60">
          Essa decisão libera a entrega e obriga a empresa pelo contrato. Confira os dados do pedido antes de confirmar.
        </p>
        <Input
          tone="dark"
          label="Número do contrato · opcional"
          placeholder="Deixe em branco se ainda não definido"
          value={numeroContrato}
          onChange={(e) => setNumeroContrato(e.target.value)}
        />
        <Button onClick={handleAprovar} disabled={confirmandoAprovacao}>
          {confirmandoAprovacao ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar aprovação
        </Button>
      </Dialog>
    </main>
  )
}
