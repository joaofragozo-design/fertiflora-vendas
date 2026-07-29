'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { AvatarVendedor } from '@/components/ranking/avatar-vendedor'
import type { ContatoChat } from '@/lib/chat/types'

interface SeletorContatoModalProps {
  contatos: ContatoChat[]
  onSelecionar: (profileId: string) => void
  onFechar: () => void
}

export function SeletorContatoModal({ contatos, onSelecionar, onFechar }: SeletorContatoModalProps) {
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return contatos
    return contatos.filter((c) => c.nome.toLowerCase().includes(termo))
  }, [contatos, busca])

  return (
    <Dialog open onClose={onFechar} title="Nova conversa">
      <div className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3">
        <Search className="h-4 w-4 text-white/50" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar contato"
          aria-label="Buscar contato"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
        />
      </div>

      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {filtrados.length === 0 && <p className="p-4 text-center text-xs font-semibold text-white/40">Nenhum contato encontrado</p>}
        {filtrados.map((c) => (
          <button
            key={c.profileId}
            onClick={() => onSelecionar(c.profileId)}
            className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-white/8"
          >
            <AvatarVendedor nome={c.nome} avatarUrl={c.avatarUrl} size={36} />
            <span className="truncate text-sm font-bold text-white">{c.nome}</span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
