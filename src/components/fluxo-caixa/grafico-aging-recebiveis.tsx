'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipProps } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { AgingAnoAtraso, AgingAnoDDF, FaixaAtraso, FaixaDDF } from '@/lib/fluxo-caixa/types'
import { fmtT } from '@/components/ranking/formatadores'

function fmtBRL(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Cinza neutro -- não é bom nem ruim, é dado faltante (mesmo tom em toda faixa "sem informação"
// do painel, para o usuário aprender a associar essa cor a "não dá pra confirmar" em qualquer gráfico).
const CINZA_SEM_DADO = 'rgba(255,255,255,0.14)'

const CORES_DDF: Record<FaixaDDF, string> = {
  a_vista: '#0d6b3d',
  ate_30: '#5fd196',
  ate_90: '#e9a23d',
  mais_90: '#e5636b',
  em_aberto: CINZA_SEM_DADO,
}

const ROTULOS_DDF: Record<FaixaDDF, string> = {
  a_vista: 'À vista (até 5 dias)',
  ate_30: 'Até 30 DDF',
  ate_90: 'Até 90 DDF',
  mais_90: 'Acima de 90 DDF',
  em_aberto: 'Em aberto (sem pagamento registrado)',
}

const ORDEM_DDF: FaixaDDF[] = ['a_vista', 'ate_30', 'ate_90', 'mais_90', 'em_aberto']

// Verde -> vermelho como o DDF, mas "adiantado" ganha o mesmo verde forte do "à vista" (ainda
// melhor que pagar em dia); "sem_vencimento" e "em_aberto" ficam cinza -- dado faltante, não julgamento.
const CORES_ATRASO: Record<FaixaAtraso, string> = {
  adiantado: '#0d6b3d',
  ate_15: '#5fd196',
  ate_30: '#e9a23d',
  mais_30: '#e5636b',
  sem_vencimento: CINZA_SEM_DADO,
  em_aberto: CINZA_SEM_DADO,
}

const ROTULOS_ATRASO: Record<FaixaAtraso, string> = {
  adiantado: 'Em dia ou adiantado',
  ate_15: 'Até 15 dias de atraso',
  ate_30: 'Até 30 dias de atraso',
  mais_30: 'Acima de 30 dias de atraso',
  sem_vencimento: 'Sem vencimento cadastrado',
  em_aberto: 'Em aberto (sem pagamento registrado)',
}

const ORDEM_ATRASO: FaixaAtraso[] = ['adiantado', 'ate_15', 'ate_30', 'mais_30', 'sem_vencimento', 'em_aberto']

export type LenteAging = 'ddf' | 'atraso'

const CONFIG_POR_LENTE = {
  ddf: { ordem: ORDEM_DDF as string[], cores: CORES_DDF as Record<string, string>, rotulos: ROTULOS_DDF as Record<string, string> },
  atraso: { ordem: ORDEM_ATRASO as string[], cores: CORES_ATRASO as Record<string, string>, rotulos: ROTULOS_ATRASO as Record<string, string> },
}

type DadoAno = { ano: number; total: number } & Record<string, number>

interface ConfigLenteResolvida {
  ordem: string[]
  cores: Record<string, string>
  rotulos: Record<string, string>
}

/**
 * Lê o valor absoluto direto do dado original (`payload[0].payload`), não do valor que o
 * Recharts passa pra desenhar a barra (que com `stackOffset="expand"` vira fração 0-1) --
 * garante que o tooltip sempre mostra o valor absoluto (R$ ou t), nunca a fração usada só pro
 * desenho visual.
 */
function TooltipRecebiveis({
  active,
  payload,
  label,
  formatarValor,
  ordem,
  cores,
  rotulos,
}: TooltipProps<ValueType, NameType> & { formatarValor: (v: number) => string } & ConfigLenteResolvida) {
  if (!active || !payload?.length) return null
  const dado = payload[0].payload as DadoAno
  return (
    <div className="glass rounded-xl p-3 text-xs">
      <div className="mb-1.5 font-display font-bold text-white">{label}</div>
      {ordem.map((faixa) => {
        const valor = dado[faixa]
        // Mostra sempre, mesmo zerado -- uma faixa zerada é um dado real ("nada vencido acima de
        // 90 dias"), não ausência de dado; esconder o valor confundiria os dois casos.
        return (
          <div key={faixa} className="flex items-center gap-2 py-0.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cores[faixa] }} />
            <span className="min-w-0 flex-1 text-white/70">{rotulos[faixa]}</span>
            <span className="tabular font-bold text-white">{formatarValor(valor)}</span>
            <span className="tabular w-9 text-right text-white/40">{dado.total > 0 ? `${((valor / dado.total) * 100).toFixed(0)}%` : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

interface GraficoAgingRecebiveisProps {
  porAno: AgingAnoDDF[] | AgingAnoAtraso[]
  chave: 'toneladas' | 'reais'
  lente: LenteAging
}

/** Barra 100% empilhada por ano -- distribuição de "quantos dias depois do faturamento o cliente pagou" (DDF) ou "quanto atrasou vs o vencimento combinado" (Atraso). */
export function GraficoAgingRecebiveis({ porAno, chave, lente }: GraficoAgingRecebiveisProps) {
  const { ordem, cores, rotulos } = CONFIG_POR_LENTE[lente]
  const formatarValor = chave === 'toneladas' ? fmtT : fmtBRL
  const todos: DadoAno[] = porAno.map((a) => {
    const porFaixa = (chave === 'toneladas' ? a.porFaixaToneladas : a.porFaixaReais) as Record<string, number>
    const total = chave === 'toneladas' ? a.totalToneladas : a.totalReais
    return { ano: a.ano, total, ...porFaixa }
  })
  // `stackOffset="expand"` (d3) só normaliza quando a soma do ano é > 0 -- um ano com total exatamente
  // 0 ou negativo (ex.: estornos que se cancelam) faria a barra plotar valores não-normalizados
  // contra o eixo 0-1 fixo, aparecendo cheia/estourada. Mais seguro excluir do gráfico (nunca
  // silenciosamente -- ver legenda abaixo) do que deixar o Recharts desenhar algo enganoso.
  const dados = todos.filter((d) => d.total > 0)
  const anosExcluidos = todos.filter((d) => d.total <= 0).map((d) => d.ano)
  const semDados = dados.length === 0

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dados} stackOffset="expand" barCategoryGap="20%">
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="ano"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'var(--font-manrope)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            content={(props) => <TooltipRecebiveis {...props} formatarValor={formatarValor} ordem={ordem} cores={cores} rotulos={rotulos} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          {ordem.map((faixa, i) => (
            <Bar key={faixa} dataKey={faixa} stackId="aging" fill={cores[faixa]} radius={i === ordem.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {ordem.map((faixa) => (
          <div key={faixa} className="flex items-center gap-1.5 text-[10.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cores[faixa] }} />
            <span className="font-semibold text-white/70">{rotulos[faixa]}</span>
          </div>
        ))}
      </div>

      {semDados && <p className="text-center text-[11px] text-white/40">Nenhum recebimento registrado nesse período ainda</p>}
      {anosExcluidos.length > 0 && (
        <p className="text-center text-[10px] text-white/30">
          {anosExcluidos.join(', ')}: total zerado, negativo (estornos) ou sem toneladas estimáveis -- não exibido no gráfico
        </p>
      )}
    </div>
  )
}
