'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle, Download, Printer, ArrowLeftCircle } from 'lucide-react'
import { calcularCotacao, COMISSAO_BASE_NIVEL } from '@/lib/pricing/calculadora'
import { gerarImagemResumo, type ResumoSecao } from '@/lib/pricing/resumo-image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { FormulaPreco } from '@/lib/pricing/formulas'

interface CotacaoScreenProps {
  formulas: FormulaPreco[]
  dataTabela: string
  vendedor: string
}

const ESTADOS = [
  { uf: 'SC', icms: '4,00%' }, { uf: 'MT', icms: '4,00%' }, { uf: 'PR', icms: '0,00%' },
  { uf: 'SP', icms: '4,00%' }, { uf: 'MS', icms: '4,00%' }, { uf: 'RO', icms: '4,00%' },
  { uf: 'OUTRO', icms: '4,00% (padrão)' },
]

function fmtBRL(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtUSD(v: number) { return '$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtPct(v: number) { return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR') }
function toDateInput(d: Date) { return d.toISOString().slice(0, 10) }

export function CotacaoScreen({ formulas, dataTabela, vendedor }: CotacaoScreenProps) {
  const [produto, setProduto] = useState('')
  const [estado, setEstado] = useState('MS')
  const [entrega, setEntrega] = useState(toDateInput(new Date(Date.now() + 60 * 86400000)))
  const [pagamento, setPagamento] = useState(toDateInput(new Date(Date.now() + 300 * 86400000)))
  const [frete, setFrete] = useState('750')
  const [agenciador, setAgenciador] = useState('0')
  const [precoVendido, setPrecoVendido] = useState('')
  const [dolar, setDolar] = useState<number | null>(null)
  const [mostrarResumo, setMostrarResumo] = useState(false)

  useEffect(() => {
    fetch('/api/dolar').then((r) => r.json()).then((d) => setDolar(d.bid)).catch(() => setDolar(5.2))
  }, [])

  const precoBase = useMemo(() => formulas.find((f) => f.nome === produto)?.precoUsdAvista, [formulas, produto])

  const resultado = useMemo(() => {
    if (!precoBase || !dolar || !entrega || !pagamento) return null
    const precoVendidoNum = parseFloat(precoVendido)
    if (!precoVendidoNum || precoVendidoNum <= 0) return null

    return calcularCotacao({
      precoAvistaUSD: precoBase,
      estado,
      entrega: new Date(entrega + 'T00:00:00'),
      pagamento: new Date(pagamento + 'T00:00:00'),
      frete: parseFloat(frete) || 0,
      agenciadorPct: (parseFloat(agenciador) || 0) / 100,
      precoVendido: precoVendidoNum,
      dolarAgora: dolar,
      dataTabela: new Date(dataTabela),
    })
  }, [precoBase, dolar, entrega, pagamento, frete, agenciador, precoVendido, estado, dataTabela])

  const diasAteTravar = dolar ? Math.round((new Date(entrega).getTime() - new Date(dataTabela).getTime()) / 86400000) : null

  function montarSecoes(): ResumoSecao[] {
    if (!resultado) return []
    const v = parseFloat(precoVendido)
    const precoRows: [string, string][] = [
      ['Preço U$D/tonelada', fmtUSD(v / (dolar ?? 1))],
      ['Preço/tonelada', fmtBRL(v)],
      ['Preço/saca (50kg)', fmtBRL(v / 20)],
      ['Preço/bag (750kg)', fmtBRL(v * 0.75)],
      ['Pedido para entrega', resultado.pedidoEntrega],
    ]
    if (resultado.campanhaAvista !== null) precoRows.push(['Preço campanha à vista', fmtBRL(resultado.campanhaAvista) + '/t'])

    return [
      { title: 'Dados da venda', rows: [
        ['Produto', produto],
        ['Estado', estado === 'OUTRO' ? '—' : estado],
        ['Data', fmtDate(dataTabela)],
        ['Entrega', new Date(entrega + 'T00:00:00').toLocaleDateString('pt-BR')],
        ['Pagamento', new Date(pagamento + 'T00:00:00').toLocaleDateString('pt-BR')],
      ] },
      { title: 'Custos', rows: [
        ['ICMS', resultado.icms > 0 ? 'Incluso' : 'Isento'],
        ['Frete', (parseFloat(frete) || 0) > 0 ? 'CIF' : 'FOB'],
      ] },
      { title: 'Preço', rows: precoRows, destaque: 1 },
    ]
  }

  function baixarResumo() {
    const dataUrl = gerarImagemResumo(montarSecoes(), `Cotação sujeita a confirmação · vendedor ${vendedor}`)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'cotacao-fertiflora.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const secoes = mostrarResumo ? montarSecoes() : []

  return (
    <main className="min-h-screen bg-ink-950 pb-16">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display text-lg font-bold">Nova Cotação</h1>
          <div className="ml-auto text-right text-[11px] text-white/45">
            Vendedor<b className="block text-xs text-white">{vendedor}</b>
          </div>
        </div>

        <div className="glass flex items-center gap-3 rounded-2xl p-3.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-400 shadow-[0_0_0_0_rgba(24,165,88,0.6)]" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Dólar agora · tempo real</div>
            <div className="tabular text-lg font-extrabold">{dolar ? fmtBRL(dolar) : '—'}</div>
          </div>
          {diasAteTravar !== null && (
            <div className="ml-auto text-right text-[11px] text-white/50">
              trava em <b className="text-white">{diasAteTravar}</b> dias
            </div>
          )}
        </div>

        {!mostrarResumo && (
          <>
            <div className="glass flex flex-col gap-4 rounded-3xl p-5">
              <h2 className="font-display flex items-center gap-2 text-sm font-bold">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/20 text-[11px] text-brand-300">1</span>
                Produto e condições
              </h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Fórmula</label>
                <input
                  list="lista-formulas"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  placeholder="Buscar fórmula (ex: 00-08-08)"
                  autoComplete="off"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] font-medium text-white outline-none placeholder:text-white/35 focus:border-brand-400 focus:bg-brand-500/10"
                />
                <datalist id="lista-formulas">
                  {formulas.map((f) => <option key={f.nome} value={f.nome} />)}
                </datalist>
                <p className="text-[10.5px] text-white/40">
                  {precoBase !== undefined ? `Referência 100% à vista: ${fmtUSD(precoBase)}/t` : produto ? 'Fórmula não encontrada no catálogo.' : 'Preço de referência aparece aqui.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] font-medium text-white outline-none focus:border-brand-400"
                  >
                    {ESTADOS.map((e) => <option key={e.uf} value={e.uf} className="text-slate-800">{e.uf} — {e.icms}</option>)}
                  </select>
                </div>
                <Input tone="dark" label="Frete (R$)" type="number" min={0} step={10} value={frete} onChange={(e) => setFrete(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input tone="dark" label="Entrega" type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} />
                <Input tone="dark" label="Pagamento" type="date" value={pagamento} onChange={(e) => setPagamento(e.target.value)} />
              </div>

              <Input tone="dark" label="Agenciador (%) · opcional" type="number" min={0} max={100} step={0.5} value={agenciador} onChange={(e) => setAgenciador(e.target.value)} />
            </div>

            <div className="glass flex flex-col gap-4 rounded-3xl p-5">
              <h2 className="font-display flex items-center gap-2 text-sm font-bold">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/20 text-[11px] text-brand-300">2</span>
                Preço negociado
              </h2>
              <Input
                tone="dark"
                label="Preço vendido (R$ por tonelada)"
                type="number"
                min={0}
                step={1}
                placeholder="0,00"
                value={precoVendido}
                onChange={(e) => setPrecoVendido(e.target.value)}
              />
              <p className="text-[10.5px] text-white/40">
                Esse é o valor que você está fechando com o cliente — o sistema calcula ICMS, frete e sua comissão a partir dele.
              </p>
            </div>

            <div className="glass flex flex-col gap-4 rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Preço de tabela</div>
                  <div className="tabular text-2xl font-extrabold">
                    {resultado ? fmtBRL(resultado.precoTabela) : '—'}<small className="text-sm font-bold text-white/50">/t</small>
                  </div>
                  {resultado && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-brand-300">
                      🌱 Você ganha {fmtBRL(resultado.projecaoComissao)}<span className="font-medium text-white/45">/t de comissão</span>
                    </div>
                  )}
                </div>
                <span className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-extrabold',
                  !resultado && 'bg-white/10 text-white/50',
                  resultado?.aprovado && 'bg-brand-500/20 text-brand-300',
                  resultado && !resultado.aprovado && 'bg-danger-500/20 text-danger-400'
                )}>
                  {!resultado && 'Preencha os dados'}
                  {resultado?.aprovado && <><CheckCircle2 className="h-3.5 w-3.5" />Aprovado</>}
                  {resultado && !resultado.aprovado && <><AlertTriangle className="h-3.5 w-3.5" />Reprovado</>}
                </span>
              </div>

              {resultado && !resultado.aprovado && (
                <div className="rounded-xl border border-danger-500/35 bg-danger-500/15 p-3 text-xs leading-snug text-danger-300">
                  Preço abaixo do mínimo ({fmtBRL(resultado.precoMinimo)}/t). Entre em contato com a diretoria para aprovar essa condição.
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="ICMS" value={resultado ? fmtPct(resultado.icms) : '—'} />
                <MiniStat label="Condição" value={resultado ? (resultado.eAVista ? 'À vista' : 'Prazo') : '—'} />
                <MiniStat label="Mínimo" value={resultado ? fmtBRL(resultado.precoMinimo) : '—'} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Saca 50kg" value={resultado ? fmtBRL(resultado.precoSaca) : '—'} />
                <MiniStat label="Bag 750kg" value={resultado ? fmtBRL(resultado.precoBag) : '—'} />
                <MiniStat label="Em US$/t" value={resultado ? fmtUSD(resultado.precoUsd) : '—'} />
              </div>

              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                <div className="flex justify-between text-xs font-bold text-white/60">
                  <span>Sua comissão (interno)</span>
                  <span>{resultado ? fmtPct(resultado.comissaoCalculada) : '—'}</span>
                </div>
                <CommRow label="Base (Nível III)" value={fmtPct(COMISSAO_BASE_NIVEL)} />
                <CommRow label="Bônus 100% à vista" value={resultado ? `${resultado.bonusAvista >= 0 ? '+' : ''}${fmtPct(resultado.bonusAvista)}` : '—'} />
                <CommRow label={resultado && resultado.bonusPorPreco < 0 ? 'Desconto por preço' : 'Bônus por preço'} value={resultado ? `${resultado.bonusPorPreco >= 0 ? '+' : ''}${fmtPct(resultado.bonusPorPreco)}` : '—'} />
                <CommRow label="Ajuste agenciador" value={resultado ? `${resultado.ajusteAgenciador >= 0 ? '+' : ''}${fmtPct(resultado.ajusteAgenciador)}` : '—'} />
                <div className="flex items-baseline justify-between border-t border-dashed border-white/15 pt-2">
                  <span className="text-xs font-bold">Projeção por tonelada</span>
                  <span className="tabular text-lg font-extrabold text-brand-300">
                    {resultado ? fmtBRL(resultado.projecaoComissao) : '—'}<small className="text-[11px] font-bold text-white/50">/t</small>
                  </span>
                </div>
              </div>

              <Button disabled={!resultado} onClick={() => setMostrarResumo(true)}>Gerar resumo para o cliente</Button>
            </div>
          </>
        )}

        {mostrarResumo && resultado && (
          <div className="glass-light flex flex-col gap-4 rounded-[28px] p-6">
            <div className="flex flex-col items-center gap-1 border-b border-slate-800/10 pb-4 text-center">
              <div className="font-display text-base font-bold text-brand-700">🌱 FertiFlora</div>
              <div className="text-xs text-slate-800/55">Resumo da cotação</div>
            </div>

            <div className="flex flex-col gap-4">
              {secoes.map((sec) => (
                <div key={sec.title} className="flex flex-col">
                  <div className="mb-1 rounded-lg bg-gradient-to-r from-brand-200 to-brand-500 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-950">
                    {sec.title}
                  </div>
                  {sec.rows.map((row, i) => (
                    <div key={row[0]} className={cn('flex justify-between border-b border-slate-800/10 py-2.5 text-[13px]', sec.destaque === i && 'py-3')}>
                      <span className={sec.destaque === i ? 'font-bold text-slate-800' : 'text-slate-800/60'}>{row[0]}</span>
                      <span className={cn('tabular font-bold', sec.destaque === i ? 'text-[16px] text-brand-700' : 'text-slate-800')}>{row[1]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <Button onClick={baixarResumo}><Download className="h-4 w-4" />Baixar resumo</Button>
            <Button variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</Button>
            <Button variant="ghost" onClick={() => setMostrarResumo(false)}><ArrowLeftCircle className="h-4 w-4" />Voltar e ajustar</Button>
          </div>
        )}
      </div>
    </main>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-2.5">
      <div className="text-[9.5px] font-semibold uppercase tracking-wide text-white/40">{label}</div>
      <div className="tabular mt-0.5 text-[13.5px] font-extrabold">{value}</div>
    </div>
  )
}

function CommRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-white/60">
      <span>{label}</span>
      <b className="tabular text-white">{value}</b>
    </div>
  )
}
