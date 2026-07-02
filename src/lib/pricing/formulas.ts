import { createClient } from '@/lib/supabase/server'

export interface FormulaPreco {
  nome: string
  precoUsdAvista: number
}

export interface FormulasData {
  formulas: FormulaPreco[]
  dataTabela: string // ISO — data de referência da tabela de preços (created_at do seed)
}

export async function getFormulasComPreco(): Promise<FormulasData> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('formula_precos')
    .select('nome, preco_usd_avista, created_at')
    .order('nome', { ascending: true })

  if (error) throw new Error(`Falha ao carregar tabela de preços: ${error.message}`)

  const formulas = (data ?? []).map((row) => ({
    nome: row.nome as string,
    precoUsdAvista: Number(row.preco_usd_avista),
  }))

  const dataTabela = data && data.length > 0 ? (data[0].created_at as string) : new Date().toISOString()

  return { formulas, dataTabela }
}
