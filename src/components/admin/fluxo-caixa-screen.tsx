'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { ArrowLeft, Landmark, ShieldCheck } from 'lucide-react'
import { buscarTodasAsComissoes, buscarTodasAsComissoesLiquidadas } from '@/lib/comissoes/queries'
import type { ComissaoErpRow } from '@/lib/comissoes/types'
import { buscarTodasAsNotas, buscarTodosOsPedidos } from '@/lib/clientes-bi/queries'
import type { NotaFiscalRow, PedidoErpRow } from '@/lib/clientes-bi/types'
import {
  calcularAgingPorAno,
  calcularAtrasoPorAno,
  calcularResumoCarteiraPrazo,
  calcularResumoPedidosAbertoPrazo,
  montarItensAgingDDF,
  montarItensCarteiraPrazo,
  montarItensPedidosAbertoPrazo,
} from '@/lib/fluxo-caixa/calculos'
import { buscarLimiteVigente, inscreverFluxoCaixaEmTempoReal, liberarReservaSafrinha } from '@/lib/fluxo-caixa/queries'
import { estaNaJanelaDeDefinicao, periodoQueAJanelaDefine } from '@/lib/fluxo-caixa/safra'
import type { BucketVencimento, LimiteCarteiraPrazoRow } from '@/lib/fluxo-caixa/types'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { GaugeCarteiraPrazo } from '@/components/fluxo-caixa/gauge-carteira-prazo'
import { BucketsCarteiraPrazo } from '@/components/fluxo-caixa/buckets-carteira-prazo'
import { ListaBucket } from '@/components/fluxo-caixa/lista-bucket'
import { DefinirLimiteModal } from '@/components/fluxo-caixa/definir-limite-modal'
import { fmtT } from '@/components/ranking/formatadores'

// ssr:false -- ResponsiveContainer do Recharts usa useLayoutEffect (warning inofensivo mas
// ruidoso em SSR); os dados só chegam depois do mount de qualquer forma, então não há risco
// real de mismatch de hidratação, só adia o parse/execução do JS do Recharts pro client.
const GraficoAgingRecebiveis = dynamic(
  () => import('@/components/fluxo-caixa/grafico-aging-recebiveis').then((m) => m.GraficoAgingRecebiveis),
  { ssr: false, loading: () => <div className="flex h-[280px] items-center justify-center text-xs text-white/30">Carregando gráfico…</div> }
)
type LenteAging = import('@/components/fluxo-caixa/grafico-aging-recebiveis').LenteAging

function fmtBRL(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function FluxoCaixaScreen() {
  usePageIntensity(0.15)
  const [comissoesGerais, setComissoesGerais] = useState<ComissaoErpRow[]>([])
  const [comissoesLiquidadas, setComissoesLiquidadas] = useState<ComissaoErpRow[]>([])
  const [notas, setNotas] = useState<NotaFiscalRow[]>([])
  const [pedidos, setPedidos] = useState<PedidoErpRow[]>([])
  const [limite, setLimite] = useState<LimiteCarteiraPrazoRow | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [bucketSelecionado, setBucketSelecionado] = useState<BucketVencimento | null>(null)
  const [definindoLimite, setDefinindoLimite] = useState(false)
  const [carteiraChave, setCarteiraChave] = useState<'toneladas' | 'reais'>('toneladas')
  const [agingChave, setAgingChave] = useState<'toneladas' | 'reais'>('reais')
  const [agingLente, setAgingLente] = useState<LenteAging>('ddf')

  function carregar() {
    setCarregando(true)
    setErro(null)
    Promise.all([buscarTodasAsComissoes(), buscarTodasAsComissoesLiquidadas(), buscarTodasAsNotas(), buscarTodosOsPedidos(), buscarLimiteVigente()])
      .then(([geral, liquidadas, listaNotas, listaPedidos, limiteVigente]) => {
        setComissoesGerais(geral)
        setComissoesLiquidadas(liquidadas)
        setNotas(listaNotas)
        setPedidos(listaPedidos)
        setLimite(limiteVigente)
        setCarregando(false)
      })
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Falha ao carregar dados')
        setCarregando(false)
      })
  }

  useEffect(() => {
    carregar()
    return inscreverFluxoCaixaEmTempoReal(carregar)
  }, [])

  const itensAging = useMemo(
    () => montarItensAgingDDF(notas, comissoesGerais, comissoesLiquidadas),
    [notas, comissoesGerais, comissoesLiquidadas]
  )
  const agingPorAno = useMemo(() => calcularAgingPorAno(itensAging), [itensAging])
  const atrasoPorAno = useMemo(() => calcularAtrasoPorAno(itensAging), [itensAging])
  const naoConfirmadoRecebimentos = useMemo(() => agingPorAno.reduce((s, a) => s + a.totalReaisNaoConfirmado, 0), [agingPorAno])

  const itensCarteira = useMemo(
    () => montarItensCarteiraPrazo(notas, comissoesGerais, comissoesLiquidadas),
    [notas, comissoesGerais, comissoesLiquidadas]
  )
  const itensPedidos = useMemo(() => montarItensPedidosAbertoPrazo(pedidos), [pedidos])
  const resumoPedidos = useMemo(() => calcularResumoPedidosAbertoPrazo(itensPedidos), [itensPedidos])

  const resumoCarteira = useMemo(() => (limite ? calcularResumoCarteiraPrazo(itensCarteira, itensPedidos, limite) : null), [itensCarteira, itensPedidos, limite])

  const bucketItens = bucketSelecionado ? (resumoCarteira?.buckets.find((b) => b.bucket === bucketSelecionado)?.itens ?? []) : []

  const janelaAberta = estaNaJanelaDeDefinicao(new Date())
  const periodoDaJanela = periodoQueAJanelaDefine(new Date())

  async function handleLiberarReserva() {
    if (!limite) return
    if (!confirm('Confirma liberar a reserva da safrinha? Isso só deve ser feito com o caixa no Nível 3 (180 dias) ou acima e garantia de recebimento (Pilar 5).')) return
    try {
      await liberarReservaSafrinha(limite.id)
      toast.success('Reserva da safrinha liberada')
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao liberar reserva')
    }
  }

  if (carregando) return <SkeletonListaCards />

  if (erro) {
    return (
      <main className="relative z-10 min-h-screen pb-28">
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/vendas-gerais"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <h1 className="font-display flex items-center gap-2 text-lg font-bold">
              <Landmark className="h-5 w-5 text-brand-300" />
              Fluxo de Caixa & Crédito
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
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vendas-gerais"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display flex items-center gap-2 text-lg font-bold">
            <Landmark className="h-5 w-5 text-brand-300" />
            Fluxo de Caixa & Crédito
          </h1>
        </div>

        {janelaAberta && (
          <div className="glass flex items-center gap-2 rounded-2xl border border-warning-500/30 p-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-warning-400" />
            <p className="min-w-0 flex-1 text-[11px] font-semibold text-white/80">
              Janela de definição aberta (30/04–30/05) — hora de definir o limite da {periodoDaJanela.chave}.
            </p>
            <button onClick={() => setDefinindoLimite(true)} className="shrink-0 text-[11px] font-bold text-brand-300">
              Definir
            </button>
          </div>
        )}

        <div className="glass flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Painel de Recebimentos</div>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                <button
                  onClick={() => setAgingLente('ddf')}
                  className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${agingLente === 'ddf' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}
                >
                  Desde emissão
                </button>
                <button
                  onClick={() => setAgingLente('atraso')}
                  className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${agingLente === 'atraso' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}
                >
                  Vs. vencimento
                </button>
              </div>
              <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                <button
                  onClick={() => setAgingChave('toneladas')}
                  className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${agingChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}
                >
                  t
                </button>
                <button
                  onClick={() => setAgingChave('reais')}
                  className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${agingChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}
                >
                  R$
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/35">
            {agingLente === 'ddf'
              ? 'Emissão, vencimento, peso e valor direto da nota fiscal (RFT6); pagamento cruzado com o Relatório de Comissionados (RFT159) — DDF = dias entre a emissão da nota e o pagamento (ou hoje, se ainda em aberto).'
              : 'Atraso vs a data de vencimento da nota fiscal (RFT6) — separa quem pagou dentro de um prazo longo já acertado (ex.: financiamento até a colheita) de quem realmente atrasou.'}
            {' '}“Em aberto” (cinza) = ainda sem pagamento registrado no relatório de comissões — não é atraso confirmado, é dado faltante.
            {agingChave === 'toneladas' && ' Toneladas somadas direto da nota fiscal — notas sem nenhuma linha em KG ficam de fora.'}
          </p>
          <GraficoAgingRecebiveis porAno={agingLente === 'ddf' ? agingPorAno : atrasoPorAno} chave={agingChave} lente={agingLente} />
          {agingChave === 'reais' && naoConfirmadoRecebimentos > 0 && (
            <p className="text-center text-[10px] text-white/30">
              {fmtBRL(naoConfirmadoRecebimentos)} sem nenhuma correspondência no relatório de comissões — status de pagamento não confirmado, contado como em aberto
            </p>
          )}
        </div>

        {!limite && (
          <div className="glass flex flex-col items-center gap-2 rounded-2xl p-6 text-center">
            <Landmark className="h-6 w-6 text-white/25" />
            <p className="text-xs font-semibold text-white/60">Nenhum limite de carteira a prazo definido ainda</p>
            <button onClick={() => setDefinindoLimite(true)} className="text-[11px] font-bold text-brand-300">
              Definir agora
            </button>
          </div>
        )}

        {resumoCarteira && (
          <>
            <GaugeCarteiraPrazo resumo={resumoCarteira} onEditar={() => setDefinindoLimite(true)} />
            {resumoCarteira.totalReaisForaDoAno > 0 && (
              <p className="px-1 text-[10px] text-white/35">
                {fmtBRL(resumoCarteira.totalReaisForaDoAno)} ({fmtT(resumoCarteira.totalToneladasForaDoAno)}) de anos anteriores — não consome mais a cota
                da safra vigente, acompanhe no Painel de Recebimentos
              </p>
            )}
            {resumoCarteira.totalReaisForaDoPrazo > 0 && (
              <p className="px-1 text-[10px] text-white/35">
                {fmtBRL(resumoCarteira.totalReaisForaDoPrazo)} ({fmtT(resumoCarteira.totalToneladasForaDoPrazo)}) vencido ou com menos de 60 dias até o
                vencimento — fora da carteira a prazo, acompanhe no Painel de Recebimentos
              </p>
            )}
            {resumoCarteira.totalReaisSemPeso > 0 && (
              <p className="px-1 text-[10px] text-white/35">
                {fmtBRL(resumoCarteira.totalReaisSemPeso)} em notas sem nenhuma linha em KG (não entram no total de toneladas acima)
              </p>
            )}
            {resumoCarteira.totalReaisNaoConfirmado > 0 && (
              <p className="px-1 text-[10px] text-white/35">
                {fmtBRL(resumoCarteira.totalReaisNaoConfirmado)} sem nenhuma correspondência no relatório de comissões — status de pagamento não confirmado, contado como em aberto
              </p>
            )}
            <div className="glass flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Carteira a prazo por vencimento (60+ dias)</div>
                <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                  <button
                    onClick={() => setCarteiraChave('toneladas')}
                    className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${carteiraChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}
                  >
                    t
                  </button>
                  <button
                    onClick={() => setCarteiraChave('reais')}
                    className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${carteiraChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}
                  >
                    R$
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-white/35">Toneladas direto da nota fiscal (RFT6) — clique num bucket pra ver as notas</p>
              <BucketsCarteiraPrazo
                buckets={resumoCarteira.buckets}
                chave={carteiraChave}
                formatarValor={carteiraChave === 'toneladas' ? fmtT : fmtBRL}
                onSelecionarBucket={setBucketSelecionado}
              />
            </div>
          </>
        )}

        <div className="glass flex flex-col gap-3 rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Pedidos em aberto a prazo</div>
          <p className="text-[10px] text-white/35">Estimado pela janela emissão→entrega do pedido — não é o prazo de pagamento real (esse dado não existe no ERP hoje)</p>
          <BucketsCarteiraPrazo buckets={resumoPedidos} chave="toneladas" formatarValor={fmtT} />
        </div>

        {limite && !limite.reservaLiberada && (
          <button onClick={handleLiberarReserva} className="glass rounded-2xl p-3 text-center text-xs font-bold text-white/70 transition-colors hover:bg-white/10">
            Liberar reserva da safrinha
          </button>
        )}
      </div>

      {bucketSelecionado && <ListaBucket bucket={bucketSelecionado} itens={bucketItens} onFechar={() => setBucketSelecionado(null)} />}

      {definindoLimite && (
        <DefinirLimiteModal
          chavePeriodo={limite ? limite.chavePeriodo : periodoDaJanela.chave}
          limiteAtual={limite}
          onFechar={() => setDefinindoLimite(false)}
          onDefinido={() => {
            setDefinindoLimite(false)
            carregar()
          }}
        />
      )}
    </main>
  )
}
