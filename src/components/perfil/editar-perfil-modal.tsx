'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { atualizarPerfil, enviarAvatar, type Perfil } from '@/lib/perfil/queries'

interface EditarPerfilModalProps {
  perfil: Perfil
  onFechar: () => void
  onAtualizado: (perfil: Perfil) => void
}

export function EditarPerfilModal({ perfil, onFechar, onAtualizado }: EditarPerfilModalProps) {
  const [apelido, setApelido] = useState(perfil.apelido ?? '')
  const [pracaAtuacao, setPracaAtuacao] = useState(perfil.pracaAtuacao ?? '')
  const [nomeCompleto, setNomeCompleto] = useState(perfil.nomeCompleto ?? '')
  const [telefone, setTelefone] = useState(perfil.telefone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(perfil.avatarUrl)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviandoFoto(true)
    try {
      const url = await enviarAvatar(perfil.id, perfil.username, arquivo)
      setAvatarUrl(url)
      toast.success('Foto atualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar foto')
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      await atualizarPerfil(perfil.id, perfil.username, { apelido, pracaAtuacao, nomeCompleto, telefone })
      onAtualizado({
        ...perfil,
        apelido: apelido.trim() || null,
        avatarUrl,
        pracaAtuacao: pracaAtuacao.trim() || null,
        nomeCompleto: nomeCompleto.trim() || null,
        telefone: telefone.trim() || null,
      })
      toast.success('Perfil atualizado')
      onFechar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar perfil')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <div
        className="glass flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-[28px] sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">Editar perfil</h2>
            <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => inputFotoRef.current?.click()}
              disabled={enviandoFoto}
              aria-label="Trocar foto de perfil"
              className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-500/20 text-2xl font-extrabold text-brand-300 transition-transform active:scale-95"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Sua foto" className="h-full w-full object-cover" />
              ) : (
                (apelido || perfil.username).slice(0, 2).toUpperCase()
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                {enviandoFoto ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
              </div>
            </button>
            <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            <span className="text-[11px] text-white/50">Toque na foto para trocar</span>
          </div>

          <Input tone="dark" label="Apelido" placeholder="Como quer ser chamado" value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={24} />
          <Input tone="dark" label="Nome completo" placeholder="Como aparece nos contratos" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} maxLength={80} />
          <Input tone="dark" label="Telefone" placeholder="(45) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={20} />
          <Input tone="dark" label="Localização" placeholder="Ex: MS, região de Dourados" value={pracaAtuacao} onChange={(e) => setPracaAtuacao(e.target.value)} maxLength={40} />
        </div>

        <div className="shrink-0 p-6 pt-2">
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
