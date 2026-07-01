import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { LoginForm } from '@/components/forms/login-form'
import { GrowthScene } from '@/components/scene/growth-scene'
import { Plant } from '@/components/scene/plant'
import { Logo } from '@/components/brand/logo'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'

export const metadata: Metadata = {
  title: 'Entrar',
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your_supabase') && !key.includes('your_supabase')
}

export default async function LoginPage() {
  const configured = isSupabaseConfigured()

  if (configured) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) redirect(ROUTES.DASHBOARD)
    } catch {
      // segue para o formulário de login
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <GrowthScene />
      <Plant />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-end p-5 pb-10 sm:justify-center">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <Logo variant="full" height={40} priority />
            <p className="font-display text-sm font-semibold text-brand-300">Gestão de Vendas</p>
          </div>

          {!configured && (
            <div className="glass mb-4 flex items-start gap-3 rounded-2xl p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-400" />
              <div className="text-xs">
                <p className="font-semibold text-warning-300">Configuração pendente</p>
                <p className="mt-1 text-white/50">
                  Adicione as credenciais do Supabase no <code className="rounded bg-black/30 px-1 font-mono">.env.local</code>
                </p>
              </div>
            </div>
          )}

          <div className="glass-light rounded-[28px] p-7">
            <h2 className="font-display mb-1 text-base font-bold text-slate-800">Acesse sua conta</h2>
            <p className="mb-6 text-sm text-slate-800/55">Informe seu usuário e senha</p>

            <Suspense fallback={<div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>}>
              <LoginForm supabaseConfigured={configured} />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-[11px] text-white/40">
            © {new Date().getFullYear()} FertiFlora Organomineral. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </main>
  )
}
