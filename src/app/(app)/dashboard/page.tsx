import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, HandCoins, ArrowRight } from 'lucide-react'
import { AnunciarIntensidade } from '@/components/scene/living-background/anunciar-intensidade'
import { Logo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/forms/sign-out-button'
import { SinoNotificacoes } from '@/components/notificacoes/sino-notificacoes'
import { PerfilCard } from '@/components/perfil/perfil-card'
import { TrioFaturamentoVendedor } from '@/components/ranking/trio-faturamento-vendedor'
import { createClient } from '@/lib/supabase/server'
import { emailToUsername } from '@/lib/validations/auth'
import { ROUTES } from '@/constants/routes'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  return (
    <main className="relative min-h-screen pb-28">
      <AnunciarIntensidade value={0.3} />

      <div className="relative z-10 mx-auto flex max-w-md flex-col gap-5 p-5 pt-6">
        <header className="flex items-center justify-between">
          <Logo variant="icon" height={30} />
          <div className="flex items-center gap-2">
            <SinoNotificacoes />
            <SignOutButton />
          </div>
        </header>

        <PerfilCard userId={user.id} usernameFallback={user.email ? emailToUsername(user.email) : 'vendedor'} />

        <TrioFaturamentoVendedor userId={user.id} />

        <Link
          href="/cotacao"
          className="group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 shadow-glow-brand transition-transform active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/15 text-ink-950">
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-extrabold text-ink-950">Nova Cotação</div>
            <div className="text-xs font-semibold text-ink-950/70">Montar cotação pro cliente agora</div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-ink-950/60 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link href="/pedidos/novo" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10 active:scale-[0.98]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold">Novo Pedido</div>
            <div className="text-xs text-white/50">Gerar contrato de venda</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
        </Link>

        <Link href="/comissoes" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10 active:scale-[0.98]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <HandCoins className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold">Minhas Comissões</div>
            <div className="text-xs text-white/50">Recebidas e a receber, mês a mês</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
        </Link>
      </div>
    </main>
  )
}
