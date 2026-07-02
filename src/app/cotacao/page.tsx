import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { CotacaoScreen } from '@/components/cotacao/cotacao-screen'
import { createClient } from '@/lib/supabase/server'
import { getFormulasComPreco } from '@/lib/pricing/formulas'
import { emailToUsername } from '@/lib/validations/auth'
import { ROUTES } from '@/constants/routes'

export const metadata: Metadata = { title: 'Nova Cotação' }

export default async function CotacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { formulas, dataTabela } = await getFormulasComPreco()
  const vendedor = user.email ? emailToUsername(user.email) : 'vendedor'

  return <CotacaoScreen formulas={formulas} dataTabela={dataTabela} vendedor={vendedor} />
}
