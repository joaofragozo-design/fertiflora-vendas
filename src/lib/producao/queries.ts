import { createClient } from '@/lib/supabase/client'
import {
  linhaFromRow, turnoFromRow, paradaFromRow, referenciaFormulaFromRow,
  novoTurnoToRow,
  type ProducaoLinha, type ProducaoTurno, type ProducaoParada,
  type ProducaoReferenciaFormula,
  type NovoTurnoInput, type ParadaInput, type FecharTurnoInput,
  numOrNull,
} from './types'
import { calcularOee, calcularTaxaObservada } from './oee'

const TURNO_SELECT = '*, producao_linhas(nome)'

export async function listarLinhas(): Promise<ProducaoLinha[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('producao_linhas').select('*').eq('ativo', true).order('nome')
  if (error) throw new Error(`Falha ao carregar linhas: ${error.message}`)
  return (data ?? []).map(linhaFromRow)
}

/** Fórmulas já usadas nessa linha — alimenta o autocomplete do campo "Fórmula" ao abrir turno. */
export async function listarFormulasUsadas(linhaId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('producao_turnos')
    .select('formula')
    .eq('linha_id', linhaId)
    .not('formula', 'is', null)
  if (error) throw new Error(`Falha ao carregar fórmulas: ${error.message}`)
  const unicas = new Set((data ?? []).map((r) => r.formula as string).filter(Boolean))
  return Array.from(unicas).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export async function buscarReferenciaFormula(linhaId: string, formula: string): Promise<ProducaoReferenciaFormula | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('producao_referencias_formula')
    .select('*')
    .eq('linha_id', linhaId)
    .eq('formula', formula)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar referência da fórmula: ${error.message}`)
  return data ? referenciaFormulaFromRow(data) : null
}

export async function listarTurnosRecentes(limite = 30): Promise<ProducaoTurno[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('producao_turnos')
    .select(TURNO_SELECT)
    .order('data_producao', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw new Error(`Falha ao carregar turnos: ${error.message}`)
  return (data ?? []).map(turnoFromRow)
}

export async function buscarTurno(id: string): Promise<ProducaoTurno | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('producao_turnos').select(TURNO_SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(`Falha ao carregar turno: ${error.message}`)
  return data ? turnoFromRow(data) : null
}

export async function criarTurno(input: NovoTurnoInput): Promise<ProducaoTurno> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('producao_turnos')
    .insert(novoTurnoToRow(input))
    .select(TURNO_SELECT)
    .single()
  if (error) throw new Error(`Falha ao abrir turno: ${error.message}`)
  return turnoFromRow(data)
}

export async function listarParadas(turnoId: string): Promise<ProducaoParada[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('producao_paradas')
    .select('*')
    .eq('turno_id', turnoId)
    .order('inicio')
  if (error) throw new Error(`Falha ao carregar paradas: ${error.message}`)
  return (data ?? []).map(paradaFromRow)
}

export async function registrarParada(turnoId: string, input: ParadaInput): Promise<ProducaoParada> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('producao_paradas')
    .insert({
      turno_id: turnoId,
      categoria: input.categoria,
      submotivo: input.submotivo.trim() || null,
      observacao: input.observacao.trim() || null,
      inicio: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw new Error(`Falha ao registrar parada: ${error.message}`)
  return paradaFromRow(data)
}

export async function encerrarParada(paradaId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('producao_paradas')
    .update({ fim: new Date().toISOString() })
    .eq('id', paradaId)
  if (error) throw new Error(`Falha ao encerrar parada: ${error.message}`)
}

/**
 * Calcula o aproveitamento (OEE) e grava tudo ao fechar o turno.
 * Tempo rodando vem do horímetro (dado da máquina); paradas "programada" (almoço,
 * limpeza, manutenção) saem do tempo planejado antes de contar como perda.
 * Performance é medida contra o melhor turno já registrado pra essa mesma fórmula+linha —
 * não existe capacidade nominal fixa, porque o rendimento muda conforme a fórmula granulada.
 * Se este turno bater a marca, ele vira a nova referência pro próximo.
 */
export async function fecharTurno(
  turno: ProducaoTurno,
  input: FecharTurnoInput
): Promise<ProducaoTurno> {
  const supabase = createClient()

  const [paradas, linhas, referenciaAnterior] = await Promise.all([
    listarParadas(turno.id),
    listarLinhas(),
    turno.formula ? buscarReferenciaFormula(turno.linhaId, turno.formula) : Promise.resolve(null),
  ])
  const linha = linhas.find((l) => l.id === turno.linhaId)

  const toneladasTotal = numOrNull(input.toneladasTotal)
  const toneladasReciclo = numOrNull(input.toneladasReciclo)
  const horaFinal = input.horaFinal || null
  const horimetroFinal = numOrNull(input.horimetroFinal)

  const oee = calcularOee({
    horaInicio: turno.horaInicio,
    horaFinal,
    horimetroInicio: turno.horimetroInicio,
    horimetroFinal,
    toneladasTotal,
    toneladasReciclo,
    // referência: melhor taxa já vista pra essa fórmula nessa linha; sem histórico, cai no valor manual da linha (se algum dia for cadastrado); sem nenhum dos dois, fica sem Performance ainda.
    taxaReferenciaTonHora: referenciaAnterior?.melhorTaxaTonHora ?? linha?.capacidadeNominalTonHora ?? null,
    paradas,
  })

  const { data, error } = await supabase
    .from('producao_turnos')
    .update({
      horimetro_final: horimetroFinal,
      hora_final: horaFinal,
      toneladas_total: toneladasTotal,
      sacos_total: numOrNull(input.sacosTotal),
      toneladas_reciclo: toneladasReciclo,
      disponibilidade: oee.disponibilidade,
      performance: oee.performance,
      qualidade: oee.qualidade,
      aproveitamento: oee.aproveitamento,
      status: 'fechado',
      updated_at: new Date().toISOString(),
    })
    .eq('id', turno.id)
    .select(TURNO_SELECT)
    .single()
  if (error) throw new Error(`Falha ao fechar turno: ${error.message}`)

  const taxaObservada = calcularTaxaObservada(toneladasTotal, oee.horasRodando)
  if (turno.formula && taxaObservada !== null && (!referenciaAnterior || taxaObservada > referenciaAnterior.melhorTaxaTonHora)) {
    await supabase.from('producao_referencias_formula').upsert(
      {
        linha_id: turno.linhaId,
        formula: turno.formula,
        melhor_taxa_ton_hora: taxaObservada,
        turno_referencia_id: turno.id,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'linha_id,formula' }
    )
  }

  return turnoFromRow(data)
}
