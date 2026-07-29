'use client'

import { useEffect, useState } from 'react'
import { contarNaoLidasChat, inscreverChatDiretoEmTempoReal, inscreverAnunciosEmTempoReal } from '@/lib/chat/queries'

/** Auto-contido (fetch + realtime próprios), igual ao sino de notificações -- só que vira um badge dentro do item "Chat" do menu inferior. */
export function BadgeChatNaoLidas() {
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const carregar = () => { contarNaoLidasChat().then(setTotal).catch(() => {}) }
    carregar()
    const pararDiretas = inscreverChatDiretoEmTempoReal(carregar)
    const pararAnuncios = inscreverAnunciosEmTempoReal(carregar)
    return () => { pararDiretas(); pararAnuncios() }
  }, [])

  if (total === 0) return null

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[9px] font-extrabold text-white">
      {total > 9 ? '9+' : total}
    </span>
  )
}
