import { cn } from '@/lib/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />
}

/** Substitui uma lista de cards enquanto os dados carregam — evita "pulo" de layout quando os dados chegam. */
export function SkeletonListaCards({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="glass flex items-center gap-3 rounded-2xl p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      ))}
    </div>
  )
}
