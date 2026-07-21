import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { CotacaoScreen } from '@/components/cotacao/cotacao-screen'
import { createClient } from '@/lib/supabase/server'
import { getFormulasComPreco } from '@/lib/pricing/formulas'
import { buscarTaxasJuros } from '@/lib/pricing/taxas-juros'
import { emailToUsername } from '@/lib/validations/auth'
import { cotacaoConfigFromRow } from '@/lib/cotacoes/types'
import { ROUTES } from '@/constants/routes'

export const metadata: Metadata = { title: 'Nova Cotação' }

export default async function CotacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const [{ formulas, dataTabela }, taxas, { data: perfil }, { data: configRow }] = await Promise.all([
    getFormulasComPreco(),
    buscarTaxasJuros(),
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('cotacao_config').select('*').limit(1).maybeSingle(),
  ])
  const vendedor = user.email ? emailToUsername(user.email) : 'vendedor'
  const ehAdmin = perfil?.role === 'admin'
  const configInicial = configRow ? cotacaoConfigFromRow(configRow) : null

  return (
    <CotacaoScreen
      formulas={formulas}
      dataTabela={dataTabela}
      vendedor={vendedor}
      ehAdmin={ehAdmin}
      configInicial={configInicial}
      taxasJurosIniciais={taxas}
    />
  )
}
