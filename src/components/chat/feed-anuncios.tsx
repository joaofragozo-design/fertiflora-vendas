'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Megaphone, Paperclip, Send, ShieldCheck } from 'lucide-react'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/dialog'
import {
  listarAnuncios,
  enviarAnuncio,
  apagarAnuncio,
  editarAnuncio,
  marcarAnunciosComoLidos,
  inscreverAnunciosEmTempoReal,
} from '@/lib/chat/queries'
import { enviarAnexoChat } from '@/lib/chat/upload'
import type { Anuncio } from '@/lib/chat/types'
import { MensagemBubble } from './mensagem-bubble'
import { AnexoPicker } from './anexo-picker'

interface FeedAnunciosProps {
  userId: string
  ehAdmin: boolean
}

export function FeedAnuncios({ userId, ehAdmin }: FeedAnunciosProps) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [arquivoEscolhido, setArquivoEscolhido] = useState<File | null>(null)
  const [apagando, setApagando] = useState<Anuncio | null>(null)
  const [imagemAberta, setImagemAberta] = useState<string | null>(null)
  const fimDaListaRef = useRef<HTMLDivElement>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  function carregar() {
    listarAnuncios()
      .then((dados) => { setAnuncios(dados); setErro(null); setCarregando(false) })
      .catch((e) => { setErro(e instanceof Error ? e.message : 'Falha ao carregar avisos'); setCarregando(false) })
  }

  useEffect(() => {
    carregar()
    marcarAnunciosComoLidos().catch(() => {})
    return inscreverAnunciosEmTempoReal(carregar)
  }, [])

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ block: 'end' })
  }, [anuncios.length])

  async function handleEnviar() {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      await enviarAnuncio(texto.trim())
      setTexto('')
      // Não espera o realtime pra mostrar o próprio aviso publicado -- se a replicação
      // não estiver habilitada na tabela, o autor nunca veria o que acabou de postar.
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao publicar aviso')
    } finally {
      setEnviando(false)
    }
  }

  async function handleEnviarAnexo(legenda: string | null) {
    if (!arquivoEscolhido) return
    try {
      const anexo = await enviarAnexoChat(userId, arquivoEscolhido)
      await enviarAnuncio(legenda, anexo)
      setArquivoEscolhido(null)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar anexo')
    }
  }

  async function handleApagar() {
    if (!apagando) return
    try {
      await apagarAnuncio(apagando.id)
      setApagando(null)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao apagar aviso')
    }
  }

  async function handleEditar(id: string, novoCorpo: string) {
    await editarAnuncio(id, novoCorpo)
    carregar()
  }

  if (carregando) return <SkeletonListaCards />

  if (erro) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
        <ShieldCheck className="h-8 w-8 text-danger-400" />
        <p className="text-sm font-semibold text-white/70">Não foi possível carregar os avisos</p>
        <p className="text-xs text-white/45">{erro}</p>
        <button onClick={carregar} className="mt-2 text-[11px] font-bold text-brand-300">Tentar de novo</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {anuncios.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <Megaphone className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Nenhum aviso publicado ainda</p>
          </div>
        )}
        {anuncios.map((a) => (
          <MensagemBubble
            key={a.id}
            corpo={a.corpo}
            anexo={a.anexo}
            createdAt={a.createdAt}
            deSi={false}
            apagada={a.apagado}
            editado={a.editado}
            podeApagar={ehAdmin && a.autorId === userId && !a.apagado}
            podeEditar={ehAdmin && a.autorId === userId && !a.apagado}
            onApagar={() => setApagando(a)}
            onEditar={(novoCorpo) => handleEditar(a.id, novoCorpo)}
            onAbrirImagem={setImagemAberta}
          />
        ))}
        <div ref={fimDaListaRef} />
      </div>

      {ehAdmin && (
        <div className="glass sticky bottom-0 flex items-center gap-2 rounded-2xl p-2">
          <button
            onClick={() => inputArquivoRef.current?.click()}
            aria-label="Anexar arquivo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>
          <input
            ref={inputArquivoRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setArquivoEscolhido(f); e.target.value = '' }}
          />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEnviar() }}
            placeholder="Escrever um aviso para todos…"
            aria-label="Escrever aviso"
            className="w-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
            disabled={enviando}
          />
          <button
            onClick={handleEnviar}
            disabled={enviando || !texto.trim()}
            aria-label="Publicar aviso"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-ink-950 transition-transform active:scale-90 disabled:opacity-40"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      )}

      {arquivoEscolhido && (
        <AnexoPicker arquivo={arquivoEscolhido} onFechar={() => setArquivoEscolhido(null)} onEnviar={handleEnviarAnexo} />
      )}

      <ConfirmDialog
        open={!!apagando}
        onClose={() => setApagando(null)}
        onConfirm={handleApagar}
        title="Apagar este aviso?"
        description="Todos os vendedores deixam de ver esse aviso. Essa ação não pode ser desfeita."
        confirmLabel="Apagar"
        variant="danger"
      />

      {imagemAberta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagem em tela cheia"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImagemAberta(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- vem de signed URL do Storage */}
          <img src={imagemAberta} alt="Anexo em tela cheia" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}
