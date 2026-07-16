'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BarChart3, Landmark, MapPin, ShieldCheck, Target, TrendingUp, Users } from 'lucide-react'
import { buscarTodasAsNotas } from '@/lib/clientes-bi/queries'
import { calcularResumoVendedor, calcularSerieAnual, calcularSerieMensal, variacaoPct } from '@/lib/clientes-bi/calculos'
import type { NotaFiscalRow } from '@/lib/clientes-bi/types'
import { listarRanking } from '@/lib/ranking/queries'
import type { RankingEntry } from '@/lib/ranking/types'
import { calcularPorMunicipio, calcularPorPraca, calcularRankingVendedores, codigosAgregados, mapaPracaPorCodigo } from '@/lib/vendas-gerais/calculos'
import { fmtT, fmtPct } from '@/components/ranking/formatadores'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { GraficoBarras } from '@/components/clientes-bi/grafico-barras'
import { GraficoPizza } from '@/components/clientes-bi/grafico-pizza'
import { ContadorAnimado } from '@/components/clientes-bi/contador-animado'

const ANO = new Date().getFullYear()
const NOMES_MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtBRLCompleto(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
/** "vs ano anterior" -- diferente do `fmtPct` de ranking/formatadores (esse é só % da meta, sem sinal). */
function fmtVariacao(v: number) {
  const sinal = v >= 0 ? '+' : ''
  return `${sinal}${v.toFixed(0)}%`
}

export function VendasGeraisScreen() {
  usePageIntensity(0.15)
  const [notas, setNotas] = useState<NotaFiscalRow[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [vendedoresChave, setVendedoresChave] = useState<'toneladas' | 'reais'>('reais')
  const [pracaChave, setPracaChave] = useState<'toneladas' | 'reais'>('reais')
  const [serieChave, setSerieChave] = useState<'toneladas' | 'reais'>('toneladas')

  function carregar() {
    setCarregando(true)
    setErro(null)
    Promise.all([buscarTodasAsNotas(), listarRanking(ANO)])
      .then(([listaNotas, listaRanking]) => {
        setNotas(listaNotas)
        setRanking(listaRanking)
        setCarregando(false)
      })
      .catch((e) => {
        console.error('Falha ao carregar Visão Geral de Vendas:', e)
        setErro(e instanceof Error ? e.message : 'Falha ao carregar dados')
        setCarregando(false)
      })
  }

  useEffect(() => {
    carregar()
  }, [])

  const resumo = useMemo(() => calcularResumoVendedor(notas, ANO), [notas])
  const variacaoReais = variacaoPct(resumo.totalReais, resumo.totalReaisAnoAnterior)
  const variacaoToneladas = variacaoPct(resumo.totalToneladas, resumo.totalToneladasAnoAnterior)

  const agregados = useMemo(() => codigosAgregados(ranking), [ranking])
  const rankingVendedores = useMemo(() => calcularRankingVendedores(notas, ANO, agregados), [notas, agregados])
  const maiorCrescimento = useMemo(() => {
    return rankingVendedores
      .filter((v) => v.reaisAnoAnterior > 0)
      .map((v) => ({ v, pct: variacaoPct(v.reais, v.reaisAnoAnterior) }))
      .filter((x): x is { v: (typeof rankingVendedores)[number]; pct: number } => x.pct !== null)
      .sort((a, b) => b.pct - a.pct)[0]
  }, [rankingVendedores])

  const mapaPraca = useMemo(() => mapaPracaPorCodigo(ranking), [ranking])
  const porPraca = useMemo(() => calcularPorPraca(notas, mapaPraca, ANO), [notas, mapaPraca])
  const porMunicipio = useMemo(() => calcularPorMunicipio(notas, ANO), [notas])

  const serieMensal = useMemo(() => calcularSerieMensal(notas), [notas])
  const serieAnual = useMemo(() => calcularSerieAnual(notas), [notas])

  const rankingComMeta = useMemo(() => ranking.filter((r) => !r.agregado).sort((a, b) => b.percentual - a.percentual), [ranking])

  const codigosVendedorNoErp = useMemo(() => new Set(notas.map((n) => n.vendedorCodigo)).size, [notas])

  if (carregando) return <SkeletonListaCards />

  if (erro) {
    return (
      <main className="relative z-10 min-h-screen pb-28">
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <h1 className="font-display flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="h-5 w-5 text-brand-300" />
              Visão Geral de Vendas
            </h1>
          </div>
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <ShieldCheck className="h-8 w-8 text-danger-400" />
            <p className="text-sm font-semibold text-white/70">Não foi possível carregar o painel</p>
            <p className="text-xs text-white/45">{erro}</p>
            <button onClick={carregar} className="mt-2 text-[11px] font-bold text-brand-300">
              Tentar de novo
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6 lg:max-w-6xl lg:p-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-brand-300" />
            Visão Geral de Vendas
          </h1>
        </div>

        <Link
          href="/admin/fluxo-caixa"
          className="glass flex items-center gap-3 rounded-2xl border border-warning-500/30 p-4 transition-colors hover:bg-white/10 active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-500/20 text-warning-400">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold">Fluxo de Caixa & Crédito</div>
            <div className="text-xs text-white/50">Aging de recebíveis e carteira a prazo por safra</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
        </Link>

        {notas.length === 0 ? (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <BarChart3 className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Nenhuma nota fiscal importada ainda</p>
          </div>
        ) : (
          <>
            <p className="px-1 text-[10px] text-white/40">
              Notas fiscais do ERP — R$ e toneladas, {codigosVendedorNoErp} códigos de vendedor
            </p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="glass flex flex-col gap-1 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Toneladas {ANO}</div>
                <ContadorAnimado valor={resumo.totalToneladas} formatar={fmtT} className="tabular font-display text-lg font-extrabold text-white" />
                {variacaoToneladas !== null && (
                  <span className={`text-[10px] font-bold ${variacaoToneladas >= 0 ? 'text-brand-300' : 'text-danger-400'}`}>{fmtVariacao(variacaoToneladas)} vs {ANO - 1}</span>
                )}
              </div>
              <div className="glass flex flex-col gap-1 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Faturado {ANO}</div>
                <ContadorAnimado valor={resumo.totalReais} formatar={fmtBRL} className="tabular font-display text-lg font-extrabold text-white" />
                {variacaoReais !== null && (
                  <span className={`text-[10px] font-bold ${variacaoReais >= 0 ? 'text-brand-300' : 'text-danger-400'}`}>{fmtVariacao(variacaoReais)} vs {ANO - 1}</span>
                )}
              </div>
              <div className="glass flex flex-col gap-1 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Vendedores ativos</div>
                <div className="tabular font-display text-lg font-extrabold text-white">{rankingVendedores.length}</div>
              </div>
              <div className="glass flex flex-col gap-1 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Ticket médio/t</div>
                <div className="tabular font-display text-lg font-extrabold text-white">{fmtBRL(resumo.ticketMedioReaisPorTonelada)}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 xl:grid-cols-3">
              <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    <TrendingUp className="h-3.5 w-3.5 text-brand-300" />
                    Últimos 12 meses
                  </div>
                  <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                    <button onClick={() => setSerieChave('toneladas')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${serieChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>t</button>
                    <button onClick={() => setSerieChave('reais')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${serieChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>R$</button>
                  </div>
                </div>
                <GraficoBarras
                  itens={serieMensal
                    .slice()
                    .reverse()
                    .map((p) => ({ label: NOMES_MES_CURTO[Number(p.mes.slice(5, 7)) - 1], valor: serieChave === 'toneladas' ? p.toneladas : p.reais }))}
                  formatarValor={serieChave === 'toneladas' ? fmtT : fmtBRLCompleto}
                />
              </div>

              {serieAnual.length > 1 && (
                <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">Por ano</div>
                  <GraficoBarras itens={serieAnual.map((a) => ({ label: String(a.ano), valor: serieChave === 'toneladas' ? a.toneladas : a.reais }))} formatarValor={serieChave === 'toneladas' ? fmtT : fmtBRLCompleto} />
                  <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                    {serieAnual.map((a) => (
                      <div key={a.ano} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-white/60">{a.ano}</span>
                        <span className="tabular flex gap-3">
                          <span className="font-bold text-white">{fmtBRLCompleto(a.reais)}</span>
                          <span className="text-white/50">{fmtT(a.toneladas)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    <Users className="h-3.5 w-3.5 text-brand-300" />
                    Comparativo entre vendedores
                  </div>
                  <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                    <button onClick={() => setVendedoresChave('toneladas')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${vendedoresChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>t</button>
                    <button onClick={() => setVendedoresChave('reais')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${vendedoresChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>R$</button>
                  </div>
                </div>
                {maiorCrescimento && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1.5 text-[10.5px] font-bold text-white/80">
                      <TrendingUp className="h-3 w-3 text-brand-300" />
                      Maior crescimento: {maiorCrescimento.v.nome} ({fmtVariacao(maiorCrescimento.pct)} vs {ANO - 1})
                    </span>
                  </div>
                )}
                <GraficoBarras
                  itens={rankingVendedores.map((v) => ({ label: v.nome, valor: vendedoresChave === 'toneladas' ? v.toneladas : v.reais }))}
                  formatarValor={vendedoresChave === 'toneladas' ? fmtT : fmtBRL}
                />
              </div>

              <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    <MapPin className="h-3.5 w-3.5 text-brand-300" />
                    Faturamento por praça
                  </div>
                  <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                    <button onClick={() => setPracaChave('toneladas')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${pracaChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>t</button>
                    <button onClick={() => setPracaChave('reais')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${pracaChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>R$</button>
                  </div>
                </div>
                <p className="text-[10px] text-white/35">Praça vem do perfil de cada vendedor -- pode estar incompleta.</p>
                <GraficoPizza
                  fatias={porPraca.map((p) => ({ id: p.chave, label: p.chave, valor: pracaChave === 'toneladas' ? p.toneladas : p.reais }))}
                  formatarValor={pracaChave === 'toneladas' ? fmtT : fmtBRL}
                />
              </div>

              {porMunicipio.length > 0 && (
                <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    <MapPin className="h-3.5 w-3.5 text-brand-300" />
                    Top municípios em {ANO}
                  </div>
                  <GraficoBarras itens={porMunicipio.slice(0, 8).map((m) => ({ label: m.chave, valor: m.reais }))} formatarValor={fmtBRL} cor="#a9835f" />
                </div>
              )}

              <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                  <Target className="h-3.5 w-3.5 text-brand-300" />
                  Metas vs realizado
                </div>
                <p className="text-[10px] text-white/35">
                  Toneladas, ano corrente — cobre os {rankingComMeta.length} vendedores cadastrados no Ranking Comercial
                </p>
                <div className="flex flex-col gap-3">
                  {rankingComMeta.map((r) => (
                    <div key={r.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="min-w-0 flex-1 truncate font-semibold text-white/70">{r.nome}</span>
                        <span className="tabular shrink-0 font-bold text-white">
                          {fmtT(r.total)} / {fmtT(r.meta)} · {fmtPct(r.percentual)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(r.percentual, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
