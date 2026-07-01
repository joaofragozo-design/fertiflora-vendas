import { SplashScreen } from '@/components/brand/splash-screen'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'

export default async function SplashPage() {
  let destination: string = ROUTES.LOGIN

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) destination = ROUTES.DASHBOARD
  } catch {
    // Supabase ainda não configurado — segue para o login normalmente
  }

  return <SplashScreen destination={destination} />
}
