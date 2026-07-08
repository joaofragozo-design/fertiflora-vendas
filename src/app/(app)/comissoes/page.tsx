import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { ComissoesScreen } from '@/components/comissoes/comissoes-screen'

export default async function ComissoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  return <ComissoesScreen userId={user.id} ehAdmin={perfil?.role === 'admin'} />
}
