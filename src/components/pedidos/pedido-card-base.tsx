import type { ReactNode } from 'react'
import { AlertTriangle, Download } from 'lucide-react'
import { baixarContratoPdf } from '@/lib/pedidos/contrato-pdf'
import { calcularPedido, infoEmbalagem, precisaAvisoMinimo, type Pedido } from '@/lib/pedidos/types'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(v: number) {
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

interface PedidoCardBaseProps {
  pedido: Pedido
  statusIcone?: ReactNode
  /** Mensagem de reprovação/rejeição a mostrar, se houver (cada etapa tem o seu campo). */
  motivo?: string | null
  /** Botões de ação da etapa atual (Aprovar/Reprovar, etc.) — cada tela define os seus. */
  acoes?: ReactNode
}

/** Estrutura comum dos cards de pedido em Conferência e Análise de Crédito — só as ações mudam por etapa. */
export function PedidoCardBase({ pedido: p, statusIcone, motivo, acoes }: PedidoCardBaseProps) {
  const calculo = calcularPedido(p.quantidadeToneladas, p.embalagem, p.dados.precoVendidoTon, p.dados.freteTon)
  const aviso = precisaAvisoMinimo(p)

  return (
    <div className="glass flex flex-col gap-2.5 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {aviso && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-400" aria-label="Preço abaixo do mínimo" />}
            <div className="truncate text-sm font-bold text-white">{p.dados.clienteNome}</div>
          </div>
          <div className="truncate text-xs text-white/45">{p.dados.produto} · {infoEmbalagem(p.embalagem).rotulo}</div>
        </div>
        {statusIcone}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <MiniRow label="Vendedor" value={p.dados.vendedorNome} />
        <MiniRow label="Quantidade" value={`${p.quantidadeToneladas.toLocaleString('pt-BR')} t`} />
        <MiniRow label="Preço/t" value={fmtBRL(p.dados.precoVendidoTon)} />
        <MiniRow label="Valor total" value={fmtBRL(calculo.valorTotalPedido)} />
        <MiniRow label="Comissão vendedor" value={p.dados.comissaoPct != null ? fmtPct(p.dados.comissaoPct) : '—'} />
        <MiniRow label="Comissão agenciador" value={p.dados.agenciadorPct ? fmtPct(p.dados.agenciadorPct) : '—'} />
      </div>

      {aviso && (
        <p className="flex items-center gap-1.5 rounded-xl border border-warning-500/30 bg-warning-500/10 p-2.5 text-[11px] text-warning-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Preço abaixo do mínimo — decisão final cabe à análise de crédito.
        </p>
      )}

      {motivo && (
        <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-2.5 text-[11px] text-danger-300">{motivo}</p>
      )}

      <div className="flex items-center gap-2 border-t border-white/10 pt-2.5">
        <button onClick={() => { void baixarContratoPdf(p) }} className="flex items-center gap-1 text-[11px] font-bold text-white/50">
          <Download className="h-3.5 w-3.5" />
          PDF
        </button>
        {acoes && <div className="ml-auto flex w-auto gap-2">{acoes}</div>}
      </div>
    </div>
  )
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9.5px] font-semibold uppercase tracking-wide text-white/50">{label}</span>
      <span className="tabular text-xs font-bold text-white">{value}</span>
    </div>
  )
}
