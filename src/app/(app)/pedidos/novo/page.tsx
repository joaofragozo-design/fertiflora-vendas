import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { NovoPedidoScreen } from '@/components/pedidos/novo-pedido-screen'

export default async function NovoPedidoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  return <NovoPedidoScreen userId={user.id} />
}
