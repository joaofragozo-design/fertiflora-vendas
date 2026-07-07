'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PackageCheck, Trophy } from 'lucide-react'
import {
  listarRanking,
  listarHistoricoRecente,
  listarVendasSemana,
  listarPedidosSemana,
  inscreverRankingEmTempoReal,
  type HistoricoPonto,
  type VendaSemanalPorCodigo,
  type PedidoSemanalPorVendedor,
} from '@/lib/ranking/queries'
import { calcularBadges, calcularBadgesSemanais, type Badge } from '@/lib/ranking/badges'
import type { RankingEntry } from '@/lib/ranking/types'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { PodioTop3 } from './podio-top3'
import { CardRanking } from './card-ranking'
import { PainelLateral } from './painel-lateral'
import { AjustarModal } from './ajustar-modal'
import { MiniRankingSemanal, type ItemMiniRankingSemanal } from './mini-ranking-semanal'

const ANO = new Date().getFullYear()

export function RankingScreen({ ehAdmin }: { ehAdmin: boolean }) {
  usePageIntensity(0.25)
  const [entradas, setEntradas] = useState<RankingEntry[]>([])
  const [historico, setHistorico] = useState<HistoricoPonto[]>([])
  const [vendasSemana, setVendasSemana] = useState<VendaSemanalPorCodigo[]>([])
  const [pedidosSemana, setPedidosSemana] = useState<PedidoSemanalPorVendedor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ajustando, setAjustando] = useState<RankingEntry | null>(null)

  useEffect(() => {
    let ativo = true
    function carregar() {
      Promise.all([listarRanking(ANO), listarHistoricoRecente(), listarVendasSemana(), listarPedidosSemana()]).then(
        ([r, h, vs, ps]) => {
          if (!ativo) return
          setEntradas(r)
          setHistorico(h)
          setVendasSemana(vs)
          setPedidosSemana(ps)
          setCarregando(false)
        }
      )
    }
    carregar()
    const parar = inscreverRankingEmTempoReal(carregar)
    return () => { ativo = false; parar() }
  }, [])

  const disputantes = useMemo(() => entradas.filter((e) => !e.agregado), [entradas])
  const agregados = useMemo(() => entradas.filter((e) => e.agregado), [entradas])
  const top3 = disputantes.slice(0, 3)
  const resto = [...disputantes.slice(3), ...agregados]

  const topVendasSemana = useMemo<ItemMiniRankingSemanal[]>(() => {
    const porCodigo = new Map(vendasSemana.map((v) => [v.codigo, v.toneladas]))
    return disputantes
      .map((entrada) => ({ entrada, toneladas: porCodigo.get(entrada.codigo) ?? 0 }))
      .filter((x) => x.toneladas > 0)
      .sort((a, b) => b.toneladas - a.toneladas)
      .slice(0, 3)
  }, [disputantes, vendasSemana])

  const topPedidosSemana = useMemo<ItemMiniRankingSemanal[]>(() => {
    const porProfileId = new Map(pedidosSemana.map((p) => [p.vendedorProfileId, p.toneladas]))
    return disputantes
      .map((entrada) => ({ entrada, toneladas: entrada.profileId ? porProfileId.get(entrada.profileId) ?? 0 : 0 }))
      .filter((x) => x.toneladas > 0)
      .sort((a, b) => b.toneladas - a.toneladas)
      .slice(0, 3)
  }, [disputantes, pedidosSemana])

  const badgesPorVendedor = useMemo(() => {
    const base = calcularBadges(entradas, historico)
    const semanais = calcularBadgesSemanais(topVendasSemana, topPedidosSemana)
    const combinado = new Map<string, Badge[]>(base)
    for (const [id, badges] of semanais) combinado.set(id, [...(combinado.get(id) ?? []), ...badges])
    return combinado
  }, [entradas, historico, topVendasSemana, topPedidosSemana])

  function recarregar() {
    listarRanking(ANO).then(setEntradas)
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6 lg:max-w-6xl lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-xl">
          <div>
            <h1 className="font-display flex items-center gap-2 text-lg font-bold">
              <Trophy className="h-5 w-5 text-warning-400" />
              Ranking Comercial
            </h1>
            <p className="text-[11px] font-semibold text-white/45">Toneladas faturadas em {ANO}</p>
          </div>

          {carregando && <SkeletonListaCards />}

          {!carregando && entradas.length === 0 && (
            <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
              <Trophy className="h-8 w-8 text-white/25" />
              <p className="text-sm font-semibold text-white/60">Nenhum vendedor no ranking ainda</p>
            </div>
          )}

          {!carregando && top3.length > 0 && (
            <PodioTop3 entradas={top3} badgesPorVendedor={badgesPorVendedor} ehAdmin={ehAdmin} onAjustar={setAjustando} />
          )}

          {!carregando && resto.length > 0 && (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {resto.map((entrada) => (
                  <CardRanking
                    key={entrada.id}
                    entrada={entrada}
                    badges={badgesPorVendedor.get(entrada.id) ?? []}
                    ehAdmin={ehAdmin}
                    onAjustar={setAjustando}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {!carregando && entradas.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MiniRankingSemanal
                titulo="Top vendas da semana"
                icone={Trophy}
                itens={topVendasSemana}
                vazio="Sem nota emitida nesta semana ainda."
              />
              <MiniRankingSemanal
                titulo="Top pedidos da semana"
                icone={PackageCheck}
                itens={topPedidosSemana}
                vazio="Sem pedido aprovado nesta semana ainda."
              />
            </div>
          )}
        </div>

        {!carregando && entradas.length > 0 && (
          <aside className="hidden lg:block lg:w-80 lg:shrink-0">
            <PainelLateral entradas={entradas} historico={historico} ano={ANO} />
          </aside>
        )}
      </div>

      {ajustando && (
        <AjustarModal entrada={ajustando} ano={ANO} onFechar={() => setAjustando(null)} onAtualizado={recarregar} />
      )}
    </main>
  )
}
