import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, HandCoins, BarChart3, ShieldCheck, Truck, ArrowRight } from 'lucide-react'
import { AnunciarIntensidade } from '@/components/scene/living-background/anunciar-intensidade'
import { Logo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/forms/sign-out-button'
import { SinoNotificacoes } from '@/components/notificacoes/sino-notificacoes'
import { BauIndicador } from '@/components/perfil/bau-indicador'
import { PerfilCard } from '@/components/perfil/perfil-card'
import { TrioFaturamentoVendedor } from '@/components/ranking/trio-faturamento-vendedor'
import { ProximosLembretesCard } from '@/components/lembretes/proximos-lembretes-card'
import { createClient } from '@/lib/supabase/server'
import { emailToUsername } from '@/lib/validations/auth'
import { ehGestorGeral } from '@/lib/gamificacao/tiers-gestao'
import { ROUTES } from '@/constants/routes'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const ehAdmin = perfil?.role === 'admin'
  const usernameFallback = user.email ? emailToUsername(user.email) : 'vendedor'
  const gestorGeral = ehGestorGeral(usernameFallback)

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

        <PerfilCard userId={user.id} usernameFallback={usernameFallback} gestorGeral={gestorGeral} />

        <BauIndicador />

        <TrioFaturamentoVendedor userId={user.id} gestorGeral={gestorGeral} />

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

        <div className="flex flex-col gap-2.5">
          <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-white/40">Ações rápidas</span>
          <div className="grid grid-cols-3 gap-2.5">
            <Link href="/pedidos/novo" className="glass flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center transition-colors hover:bg-white/10 active:scale-[0.96]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-display text-[11px] font-bold leading-tight">Novo Pedido</span>
            </Link>

            {ehAdmin ? (
              <Link href="/admin/pedidos" className="glass flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center transition-colors hover:bg-white/10 active:scale-[0.96]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-500/20 text-danger-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="font-display text-[11px] font-bold leading-tight">Análise de Crédito</span>
              </Link>
            ) : (
              <Link href="/comissoes" className="glass flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center transition-colors hover:bg-white/10 active:scale-[0.96]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-500/20 text-warning-400">
                  <HandCoins className="h-5 w-5" />
                </div>
                <span className="font-display text-[11px] font-bold leading-tight">Comissões</span>
              </Link>
            )}

            <Link href="/entrega" className="glass flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center transition-colors hover:bg-white/10 active:scale-[0.96]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-500/20 text-olive-400">
                <Truck className="h-5 w-5" />
              </div>
              <span className="font-display text-[11px] font-bold leading-tight">Entrega</span>
            </Link>
          </div>
        </div>

        <ProximosLembretesCard />

        {ehAdmin && (
          <Link
            href="/admin/vendas-gerais"
            className="glass flex items-center gap-3 rounded-2xl border border-warning-500/30 p-4 transition-colors hover:bg-white/10 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-500/20 text-warning-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold">Visão Geral de Vendas</div>
              <div className="text-xs text-white/50">Indicadores agregados e fluxo de caixa</div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
          </Link>
        )}
      </div>
    </main>
  )
}
