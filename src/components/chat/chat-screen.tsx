'use client'

import { useState } from 'react'
import { Megaphone, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { FeedAnuncios } from './feed-anuncios'
import { ListaConversas } from './lista-conversas'

interface ChatScreenProps {
  userId: string
  ehAdmin: boolean
}

type Aba = 'anuncios' | 'conversas'

export function ChatScreen({ userId, ehAdmin }: ChatScreenProps) {
  const [aba, setAba] = useState<Aba>('anuncios')

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <h1 className="font-display text-lg font-bold">Chat</h1>

        <div role="tablist" className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
          <button
            role="tab"
            aria-selected={aba === 'anuncios'}
            onClick={() => setAba('anuncios')}
            className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'anuncios' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Avisos
          </button>
          <button
            role="tab"
            aria-selected={aba === 'conversas'}
            onClick={() => setAba('conversas')}
            className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'conversas' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Conversas
          </button>
        </div>

        {aba === 'anuncios' && <FeedAnuncios userId={userId} ehAdmin={ehAdmin} />}
        {aba === 'conversas' && <ListaConversas userId={userId} />}
      </div>
    </main>
  )
}
