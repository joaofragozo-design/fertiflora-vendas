'use client'

import { ArrowLeft, Download, Lock, Share2 } from 'lucide-react'
import { gerarImagemResumo } from '@/lib/pricing/resumo-image'
import type { CotacaoSalva } from '@/lib/cotacoes/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface ComprovanteCotacaoProps {
  cotacao: CotacaoSalva
  clienteNome: string | null
  onFechar: () => void
}

/** Prova congelada da cotação no instante em que foi salva — dólar/preços não recalculam, só exibe o que já foi gravado. */
export function ComprovanteCotacao({ cotacao, clienteNome, onFechar }: ComprovanteCotacaoProps) {
  const { dados } = cotacao
  // Cotações salvas antes desses campos existirem não têm esses valores no jsonb — evita quebrar o comprovante.
  const comissaoRegistrada = dados.comissaoPorTonelada !== undefined
  const comissaoPorTonelada = dados.comissaoPorTonelada ?? 0
  const agenciadorPorTonelada = dados.agenciadorPorTonelada ?? 0

  // "Preço campanha à vista" é informação exclusiva do vendedor — nunca deve aparecer aqui,
  // nem na imagem gerada por "Compartilhar"/"Baixar" (poderia acabar indo pro cliente).
  const secoesSemCampanha = dados.secoes.map((sec) => {
    const indiceRemovido = sec.rows.findIndex((row) => row[0] === 'Preço campanha à vista')
    if (indiceRemovido === -1) return sec
    const rows = sec.rows.filter((_, i) => i !== indiceRemovido)
    const destaque = sec.destaque === undefined ? undefined : sec.destaque > indiceRemovido ? sec.destaque - 1 : sec.destaque
    return { ...sec, rows, destaque }
  })

  function gerarImagem() {
    return gerarImagemResumo(secoesSemCampanha, `Congelada em ${fmtDataHora(cotacao.createdAt)}`, 'comprovante interno')
  }

  async function baixar() {
    const a = document.createElement('a')
    a.href = await gerarImagem()
    a.download = 'comprovante-cotacao-fertiflora.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function compartilhar() {
    const dataUrl = await gerarImagem()
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], 'comprovante-cotacao-fertiflora.png', { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Comprovante de cotação FertiFlora' })
      } catch {
        // usuário cancelou
      }
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent('Comprovante de cotação FertiFlora em anexo.')}`, '_blank')
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <button onClick={onFechar} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-lg font-bold">Comprovante</h1>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5">
          <Lock className="h-4 w-4 shrink-0 text-white/50" />
          <p className="text-[11.5px] font-semibold leading-snug text-white/60">
            Dados congelados em <span className="tabular text-white">{fmtDataHora(cotacao.createdAt)}</span> — não mudam mesmo que o dólar varie depois.
          </p>
        </div>

        <div className="glass-light flex flex-col gap-4 rounded-[28px] p-6">
          <div className="flex flex-col items-center gap-1.5 border-b border-slate-800/10 pb-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- precisa ser <img> pra ficar idêntico ao PNG exportado do comprovante */}
            <img src="/logo-fertiflora.png" alt="FertiFlora" className="h-6 w-auto" />
            <div className="text-xs text-slate-800/55">Comprovante da cotação</div>
          </div>

          <div className="flex flex-col gap-4">
            {secoesSemCampanha.map((sec) => (
              <div key={sec.title} className="flex flex-col">
                <div className="mb-1 rounded-lg bg-gradient-to-r from-brand-200 to-brand-500 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-950">
                  {sec.title}
                </div>
                {sec.rows.map((row, i) => (
                  <div key={row[0]} className={cn('flex justify-between gap-3 border-b border-slate-800/10 py-2.5 text-[13px]', sec.destaque === i && 'py-3')}>
                    <span className={sec.destaque === i ? 'font-bold text-slate-800' : 'text-slate-800/60'}>{row[0]}</span>
                    <span className={cn('tabular text-right font-bold', sec.destaque === i ? 'text-[16px] text-brand-700' : 'text-slate-800')}>{row[1]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="glass flex flex-col gap-2.5 rounded-3xl p-5">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-white/50">Sua comissão (interno)</h2>
          {!comissaoRegistrada && (
            <p className="text-[11px] leading-snug text-white/50">Cotação salva antes desse detalhamento existir — só o total abaixo está disponível.</p>
          )}
          {comissaoRegistrada && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-white/60">Por tonelada</span>
              <span className="tabular text-lg font-extrabold text-brand-300">{fmtBRL(comissaoPorTonelada)}<small className="text-[11px] font-bold text-white/50">/t</small></span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-dashed border-white/15 pt-2.5">
            <span className="text-xs font-semibold text-white/60">Total ({(cotacao.quantidadeToneladas ?? 0).toLocaleString('pt-BR')} t)</span>
            <span className="tabular text-base font-extrabold text-brand-300">{fmtBRL(cotacao.comissaoTotal ?? 0)}</span>
          </div>
          {comissaoRegistrada && agenciadorPorTonelada > 0 && (
            <div className="flex items-baseline justify-between border-t border-dashed border-white/15 pt-2.5">
              <span className="text-xs font-semibold text-earth-tan">Agenciador recebe (por tonelada)</span>
              <span className="tabular text-sm font-extrabold text-earth-tan">{fmtBRL(agenciadorPorTonelada)}/t</span>
            </div>
          )}
          {clienteNome && (
            <div className="flex items-baseline justify-between border-t border-white/10 pt-2.5">
              <span className="text-xs font-semibold text-white/50">Cliente</span>
              <span className="text-xs font-bold text-white">{clienteNome}</span>
            </div>
          )}
        </div>

        <Button onClick={compartilhar}><Share2 className="h-4 w-4" />Compartilhar comprovante</Button>
        <Button variant="ghost" onClick={baixar}><Download className="h-4 w-4" />Baixar comprovante</Button>
      </div>
    </main>
  )
}
