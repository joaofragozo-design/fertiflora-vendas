import { SkeletonListaCards } from '@/components/ui/skeleton'

/** Some instantaneamente ao trocar de aba, enquanto a tela de destino busca dados no servidor — sem isso, o clique parecia travar. */
export default function CarregandoApp() {
  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <SkeletonListaCards />
      </div>
    </main>
  )
}
