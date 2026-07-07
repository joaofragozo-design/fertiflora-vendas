'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Plus, CheckCircle2, Clock3, Download, FileText, XCircle } from 'lucide-react'
import { listarMeusPedidos } from '@/lib/pedidos/queries'
import { baixarContratoPdf } from '@/lib/pedidos/contrato-pdf'
import { precisaAvisoMinimo, type Pedido, type StatusPedido } from '@/lib/pedidos/types'
import { cn } from '@/lib/utils/cn'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'

const STATUS_INFO: Record<StatusPedido, { rotulo: string; cor: string; icone: typeof CheckCircle2 }> = {
  rascunho: { rotulo: 'Rascunho', cor: 'text-white/50 bg-white/10', icone: FileText },
  aguardando_conferencia: { rotulo: 'Em conferência', cor: 'text-warning-400 bg-warning-500/15', icone: Clock3 },
  reprovado_conferencia: { rotulo: 'Reprovado na conferência', cor: 'text-danger-400 bg-danger-500/15', icone: XCircle },
  aguardando_analise_credito: { rotulo: 'Em análise de crédito', cor: 'text-warning-400 bg-warning-500/15', icone: Clock3 },
  aprovado_credito: { rotulo: 'Aprovado', cor: 'text-brand-300 bg-brand-500/15', icone: CheckCircle2 },
  reprovado_credito: { rotulo: 'Reprovado', cor: 'text-danger-400 bg-danger-500/15', icone: XCircle },
}

export function PedidosScreen() {
  usePageIntensity(0.2)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    listarMeusPedidos().then((p) => { setPedidos(p); setCarregando(false) })
  }, [])

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold">Meus Pedidos</h1>
          <Link
            href="/pedidos/novo"
            aria-label="Novo pedido"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-ink-950 transition-transform active:scale-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </Link>
        </div>

        {carregando && <SkeletonListaCards />}
        {!carregando && pedidos.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <FileText className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Nenhum pedido gerado ainda</p>
            <Link href="/pedidos/novo" className="text-xs font-bold text-brand-300">Criar novo pedido</Link>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {pedidos.map((p) => {
            const info = STATUS_INFO[p.status]
            const Icone = info.icone
            return (
              <div key={p.id} className="glass flex flex-col gap-2 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', info.cor)}>
                    <Icone className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {precisaAvisoMinimo(p) && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-400" aria-label="Preço abaixo do mínimo" />}
                      <div className="truncate text-sm font-bold text-white">{p.dados.clienteNome}</div>
                    </div>
                    <div className="truncate text-xs text-white/45">{p.dados.produto} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold', info.cor)}>{info.rotulo}</span>
                </div>
                {p.status === 'reprovado_conferencia' && p.motivoReprovacaoConferencia && (
                  <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-2.5 text-[11px] text-danger-300">{p.motivoReprovacaoConferencia}</p>
                )}
                {p.status === 'reprovado_credito' && p.motivoRejeicao && (
                  <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-2.5 text-[11px] text-danger-300">{p.motivoRejeicao}</p>
                )}
                <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                  <span className="text-[10.5px] font-semibold text-white/50">{p.numeroContrato ? `Contrato ${p.numeroContrato}` : 'Sem número ainda'}</span>
                  <button onClick={() => { void baixarContratoPdf(p) }} className="flex items-center gap-1 text-[11px] font-bold text-brand-300">
                    <Download className="h-3.5 w-3.5" />
                    Baixar PDF
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
