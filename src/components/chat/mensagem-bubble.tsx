'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { resolverUrlAnexo } from '@/lib/chat/signed-url'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Anexo } from '@/lib/chat/types'

function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtTamanho(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

interface AnexoPreviewProps {
  anexo: Anexo
  onAbrirImagem: (url: string) => void
}

function AnexoPreview({ anexo, onAbrirImagem }: AnexoPreviewProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let ativo = true
    resolverUrlAnexo(anexo.path)
      .then((u) => { if (ativo) setUrl(u) })
      .catch(() => { if (ativo) setFalhou(true) })
    return () => { ativo = false }
  }, [anexo.path])

  if (falhou) {
    return <p className="text-xs italic text-danger-300">Anexo indisponível</p>
  }

  if (anexo.tipo === 'imagem') {
    if (!url) return <div className="skeleton h-40 w-full max-w-[220px] rounded-xl" />
    return (
      <button onClick={() => onAbrirImagem(url)} className="block overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- anexo vem de signed URL do Storage, não do domínio de imagens do Next */}
        <img src={url} alt={anexo.nomeOriginal} className="max-h-60 w-auto max-w-[220px] object-cover" />
      </button>
    )
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('flex items-center gap-2.5 rounded-xl bg-black/15 p-3', !url && 'pointer-events-none opacity-60')}
    >
      <FileText className="h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold">{anexo.nomeOriginal}</div>
        {anexo.tamanhoBytes && <div className="text-[10px] opacity-70">{fmtTamanho(anexo.tamanhoBytes)}</div>}
      </div>
    </a>
  )
}

interface MensagemBubbleProps {
  corpo: string | null
  anexo: Anexo | null
  createdAt: string
  deSi: boolean
  apagada: boolean
  editado: boolean
  podeApagar: boolean
  podeEditar: boolean
  onApagar?: () => void
  onEditar?: (novoCorpo: string) => Promise<void>
  onAbrirImagem: (url: string) => void
}

export function MensagemBubble({
  corpo,
  anexo,
  createdAt,
  deSi,
  apagada,
  editado,
  podeApagar,
  podeEditar,
  onApagar,
  onEditar,
  onAbrirImagem,
}: MensagemBubbleProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(corpo ?? '')
  const [salvando, setSalvando] = useState(false)

  async function handleSalvarEdicao() {
    if (!rascunho.trim() || !onEditar) return
    setSalvando(true)
    try {
      await onEditar(rascunho.trim())
      setEditando(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao editar mensagem')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={cn('flex', deSi ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative flex max-w-[80%] flex-col gap-1.5 rounded-2xl px-3.5 py-2.5 text-sm',
          deSi ? 'rounded-br-md bg-gradient-to-br from-brand-300 to-brand-500 text-ink-950' : 'glass rounded-bl-md text-white'
        )}
      >
        {apagada ? (
          <p className={cn('text-xs italic', deSi ? 'text-ink-950/60' : 'text-white/45')}>Mensagem apagada</p>
        ) : (
          <>
            {anexo && <AnexoPreview anexo={anexo} onAbrirImagem={onAbrirImagem} />}
            {corpo && <p className="whitespace-pre-wrap leading-snug">{corpo}</p>}
          </>
        )}

        <span className={cn('self-end text-[10px] font-semibold', deSi ? 'text-ink-950/60' : 'text-white/40')}>
          {fmtHora(createdAt)}
          {editado && ' · editado'}
        </span>

        {(podeApagar || podeEditar) && (
          <div className="absolute -top-2 right-2">
            <button
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Opções da mensagem"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-950/70 text-white/70 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuAberto && (
              <div className="glass absolute right-0 top-7 z-10 flex flex-col rounded-xl p-1 text-xs font-bold" style={{ backgroundColor: 'rgba(15, 18, 16, 0.97)' }}>
                {podeEditar && (
                  <button
                    onClick={() => { setMenuAberto(false); setRascunho(corpo ?? ''); setEditando(true) }}
                    className="rounded-lg px-3 py-2 text-left text-white/80 hover:bg-white/8"
                  >
                    Editar
                  </button>
                )}
                {podeApagar && (
                  <button
                    onClick={() => { setMenuAberto(false); onApagar?.() }}
                    className="rounded-lg px-3 py-2 text-left text-danger-300 hover:bg-danger-500/10"
                  >
                    Apagar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {editando && (
        <Dialog open onClose={() => !salvando && setEditando(false)} title="Editar mensagem">
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            aria-label="Editar mensagem"
            rows={4}
            disabled={salvando}
            className="w-full resize-none rounded-2xl border border-white/15 bg-white/[0.06] p-3.5 text-sm text-white outline-none focus:border-brand-400"
          />
          <Button onClick={handleSalvarEdicao} disabled={salvando || !rascunho.trim()}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </Dialog>
      )}
    </div>
  )
}
