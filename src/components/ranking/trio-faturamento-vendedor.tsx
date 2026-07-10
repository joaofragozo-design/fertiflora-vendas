'use client'

import { useEffect, useState } from 'react'
import { buscarVendedorComercialDoUsuario, buscarFaturamentoDoVendedor } from '@/lib/ranking/queries'
import { TrioFaturamento } from './trio-faturamento'

const ANO = new Date().getFullYear()

interface TrioFaturamentoVendedorProps {
  userId: string
}

/** Faturado/Pedido/Total do próprio vendedor logado no ano -- mesmo trio usado no Ranking. */
export function TrioFaturamentoVendedor({ userId }: TrioFaturamentoVendedorProps) {
  const [dados, setDados] = useState<{ faturado: number; pedido: number } | null>(null)
  const [semVinculo, setSemVinculo] = useState(false)

  useEffect(() => {
    let ativo = true
    buscarVendedorComercialDoUsuario(userId)
      .then((vendedor) => {
        if (!vendedor) { if (ativo) setSemVinculo(true); return }
        return buscarFaturamentoDoVendedor(vendedor.id, ANO).then((d) => { if (ativo) setDados(d) })
      })
      .catch(() => { if (ativo) setSemVinculo(true) })
    return () => { ativo = false }
  }, [userId])

  if (semVinculo || !dados) return null

  return (
    <div className="glass flex flex-col gap-2 rounded-2xl p-4">
      <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Seu desempenho em {ANO}</div>
      <TrioFaturamento faturado={dados.faturado} pedido={dados.pedido} total={dados.faturado + dados.pedido} />
    </div>
  )
}
