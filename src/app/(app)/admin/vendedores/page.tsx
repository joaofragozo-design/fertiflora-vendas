import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { VendedoresComerciaisScreen } from '@/components/admin/vendedores-comerciais-screen'

export default async function AdminVendedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (perfil?.role !== 'admin') redirect(ROUTES.DASHBOARD)

  return <VendedoresComerciaisScreen />
}
