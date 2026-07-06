'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, BarChart3, FileUp, Pencil, Plus, Power, Users } from 'lucide-react'
import { listarVendedoresComerciais, listarRanking, atualizarVendedorComercial } from '@/lib/ranking/queries'
import type { VendedorComercial } from '@/lib/ranking/types'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { AjustarModal } from '@/components/ranking/ajustar-modal'
import { VendedorComercialModal } from './vendedor-comercial-modal'
import { ImportarErpModal } from './importar-erp-modal'
import { fmtT } from '@/components/ranking/formatadores'
import { cn } from '@/lib/utils/cn'

const ANO = new Date().getFullYear()

interface Linha {
  vendedor: VendedorComercial
  faturado: number
  pedido: number
  meta: number
}

export function VendedoresComerciaisScreen() {
  usePageIntensity(0.15)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<VendedorComercial | null>(null)
  const [criando, setCriando] = useState(false)
  const [ajustando, setAjustando] = useState<Linha | null>(null)
  const [importando, setImportando] = useState(false)

  function carregar() {
    Promise.all([listarVendedoresComerciais(), listarRanking(ANO)]).then(([vendedores, ranking]) => {
      const porId = new Map(ranking.map((r) => [r.id, r]))
      setLinhas(
        vendedores.map((v) => ({
          vendedor: v,
          faturado: porId.get(v.id)?.faturado ?? 0,
          pedido: porId.get(v.id)?.pedido ?? 0,
          meta: porId.get(v.id)?.meta ?? 0,
        }))
      )
      setCarregando(false)
    })
  }

  useEffect(() => { carregar() }, [])

  async function alternarAtivo(v: VendedorComercial) {
    try {
      await atualizarVendedorComercial(v.id, { ativo: !v.ativo })
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao atualizar')
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
            <Users className="h-5 w-5 text-brand-300" />
            Vendedores Comerciais
          </h1>
          <button
            onClick={() => setImportando(true)}
            aria-label="Importar relatório do ERP"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/70 transition-colors hover:bg-white/15 hover:text-white active:scale-90"
          >
            <FileUp className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setCriando(true)}
            aria-label="Novo vendedor"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-ink-950 transition-transform active:scale-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="px-1 text-[10.5px] text-white/50">Substitui a planilha — controla quem aparece no Ranking Comercial e os valores de {ANO}.</p>

        {carregando && <SkeletonListaCards />}

        <div className="flex flex-col gap-2">
          {linhas.map(({ vendedor, faturado, pedido, meta }) => (
            <div key={vendedor.id} className={cn('glass flex items-center gap-3 rounded-2xl p-3.5', !vendedor.ativo && 'opacity-45')}>
              <div className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[11px] font-extrabold text-white/60">
                #{vendedor.codigo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{vendedor.nome}</div>
                <div className="tabular text-[11px] text-white/45">
                  Faturado {fmtT(faturado)} · Pedido {fmtT(pedido)} · Total {fmtT(faturado + pedido)} de {fmtT(meta)}
                </div>
              </div>
              <button onClick={() => setAjustando({ vendedor, faturado, pedido, meta })} aria-label="Ajustar faturado e meta" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/50 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditando(vendedor)} aria-label="Editar nome e código" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/50 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => alternarAtivo(vendedor)}
                aria-label={vendedor.ativo ? 'Desativar' : 'Ativar'}
                className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90', vendedor.ativo ? 'bg-brand-500/15 text-brand-300 hover:bg-brand-500/25' : 'bg-white/8 text-white/40 hover:bg-white/15')}
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {criando && <VendedorComercialModal vendedor={null} onFechar={() => setCriando(false)} onSalvo={carregar} />}
      {editando && <VendedorComercialModal vendedor={editando} onFechar={() => setEditando(null)} onSalvo={carregar} />}
      {importando && (
        <ImportarErpModal
          linhasAtuais={linhas.map(({ vendedor, faturado }) => ({ vendedor, faturado }))}
          ano={ANO}
          onFechar={() => setImportando(false)}
          onImportado={carregar}
        />
      )}
      {ajustando && (
        <AjustarModal
          entrada={{ id: ajustando.vendedor.id, nome: ajustando.vendedor.nome, faturado: ajustando.faturado, pedido: ajustando.pedido, meta: ajustando.meta }}
          ano={ANO}
          onFechar={() => setAjustando(null)}
          onAtualizado={carregar}
        />
      )}
    </main>
  )
}
