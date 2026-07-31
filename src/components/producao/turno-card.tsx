import Link from 'next/link'
import { Gauge } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { corDoAproveitamento } from '@/lib/producao/oee'
import type { ProducaoTurno } from '@/lib/producao/types'

const COR_CHIP: Record<ReturnType<typeof corDoAproveitamento>, string> = {
  verde: 'bg-brand-500/20 text-brand-300',
  amarelo: 'bg-warning-500/20 text-warning-400',
  vermelho: 'bg-danger-500/20 text-danger-400',
  neutro: 'bg-white/10 text-white/60',
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export function TurnoCard({ turno }: { turno: ProducaoTurno }) {
  const cor = corDoAproveitamento(turno.aproveitamento)

  return (
    <Link href={`/producao/${turno.id}`} className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-earth-tan/15 text-xs font-extrabold text-earth-tan">
        {turno.linhaNome}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-white">{formatarData(turno.data)} · {turno.responsavelNome ?? 'sem responsável'}</div>
        <div className="truncate text-xs text-white/45">
          {turno.status === 'aberto' ? 'Em andamento' : `${turno.toneladasTotal ?? '—'} ton produzidas`}
        </div>
      </div>
      {turno.status === 'aberto' ? (
        <span className="shrink-0 rounded-full bg-warning-500/20 px-2.5 py-1 text-[10px] font-bold uppercase text-warning-400">Aberto</span>
      ) : (
        <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold', COR_CHIP[cor])}>
          <Gauge className="h-3 w-3" />
          {turno.aproveitamento !== null ? `${Math.round(turno.aproveitamento * 100)}%` : '—'}
        </span>
      )}
    </Link>
  )
}
