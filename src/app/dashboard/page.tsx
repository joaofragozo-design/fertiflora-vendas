import { redirect } from 'next/navigation'
import { Sprout } from 'lucide-react'
import { GrowthScene } from '@/components/scene/growth-scene'
import { Plant } from '@/components/scene/plant'
import { Logo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/forms/sign-out-button'
import { createClient } from '@/lib/supabase/server'
import { emailToUsername } from '@/lib/validations/auth'
import { ROUTES } from '@/constants/routes'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  return (
    <main className="relative min-h-screen overflow-hidden">
      <GrowthScene />
      <Plant />

      <div className="relative z-10 mx-auto flex max-w-md flex-col gap-5 p-5 pt-6">
        <header className="flex items-center justify-between">
          <Logo variant="icon" height={30} />
          <SignOutButton />
        </header>

        <div className="glass flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <Sprout className="h-7 w-7" />
          </div>
          <h1 className="font-display text-lg font-bold">Login confirmado 🌱</h1>
          <p className="text-sm text-white/55">
            Estrutura inicial no ar. As próximas telas — cotação, clientes, catálogo — entram aqui.
          </p>
          <p className="mt-2 text-xs text-white/35 tabular">{user.email && emailToUsername(user.email)}</p>
        </div>
      </div>
    </main>
  )
}
