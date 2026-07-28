'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ajustarFaturamento, ajustarMeta } from '@/lib/ranking/queries'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { fmtT } from './formatadores'

interface AjustarModalProps {
  entrada: { id: string; nome: string; faturado: number; pedido: number; meta: number }
  ano: number
  onFechar: () => void
  onAtualizado: () => void
}

export function AjustarModal({ entrada, ano, onFechar, onAtualizado }: AjustarModalProps) {
  const [faturado, setFaturado] = useState(String(entrada.faturado))
  const [pedido, setPedido] = useState(String(entrada.pedido))
  const [meta, setMeta] = useState(String(entrada.meta))
  const [salvando, setSalvando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  function parseNumero(v: string): number {
    return Math.max(0, Number(v.replace(',', '.')) || 0)
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      await Promise.all([
        ajustarFaturamento(entrada.id, ano, { faturado: parseNumero(faturado), pedido: parseNumero(pedido) }),
        ajustarMeta(entrada.id, ano, parseNumero(meta)),
      ])
      toast.success('Ranking atualizado')
      onAtualizado()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSalvando(false)
      setConfirmando(false)
    }
  }

  return (
    <>
      <Dialog open onClose={onFechar} title={`Ajustar ${entrada.nome}`}>
        <Input tone="dark" label={`Faturado ${ano} (toneladas — já entregue)`} inputMode="decimal" value={faturado} onChange={(e) => setFaturado(e.target.value)} />
        <Input tone="dark" label={`Pedido ${ano} (toneladas — contratado, ainda não entregue)`} inputMode="decimal" value={pedido} onChange={(e) => setPedido(e.target.value)} />
        <Input tone="dark" label={`Meta ${ano} (toneladas)`} inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} />
        <Button onClick={() => setConfirmando(true)} disabled={salvando}>
          Salvar
        </Button>
      </Dialog>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={handleSalvar}
        loading={salvando}
        title="Confirmar ajuste no ranking?"
        description={
          <div className="flex flex-col gap-1">
            <p>Essa mudança aparece pra todo mundo no Ranking em tempo real, assim que salvar.</p>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-bold text-white">{fmtT(parseNumero(faturado))}</div><div className="text-white/45">Faturado</div></div>
              <div><div className="font-bold text-white">{fmtT(parseNumero(pedido))}</div><div className="text-white/45">Pedido</div></div>
              <div><div className="font-bold text-white">{fmtT(parseNumero(meta))}</div><div className="text-white/45">Meta</div></div>
            </div>
          </div>
        }
        confirmLabel="Confirmar e publicar"
      />
    </>
  )
}
