export type StatusTurno = 'aberto' | 'fechado'

export type CategoriaParada =
  | 'mecanica_eletrica'
  | 'processo_ajuste'
  | 'suprimento_insumo'
  | 'qualidade'
  | 'programada'
  | 'outros'

export const CATEGORIAS_PARADA: { valor: CategoriaParada; rotulo: string }[] = [
  { valor: 'mecanica_eletrica', rotulo: 'Mecânica/Elétrica' },
  { valor: 'processo_ajuste', rotulo: 'Processo/Ajuste' },
  { valor: 'suprimento_insumo', rotulo: 'Suprimento/Insumo' },
  { valor: 'qualidade', rotulo: 'Qualidade' },
  { valor: 'programada', rotulo: 'Programada (almoço, limpeza, manutenção)' },
  { valor: 'outros', rotulo: 'Outros' },
]

export function rotuloCategoria(categoria: CategoriaParada): string {
  return CATEGORIAS_PARADA.find((c) => c.valor === categoria)?.rotulo ?? categoria
}

export interface ProducaoLinha {
  id: string
  nome: string
  capacidadeNominalTonHora: number | null
  ativo: boolean
}

export function linhaFromRow(row: Record<string, unknown>): ProducaoLinha {
  return {
    id: row.id as string,
    nome: row.nome as string,
    capacidadeNominalTonHora: (row.capacidade_nominal_ton_hora as number) ?? null,
    ativo: row.ativo as boolean,
  }
}

export interface ProducaoTurno {
  id: string
  linhaId: string
  linhaNome: string
  data: string
  formula: string | null
  responsavelNome: string | null
  horimetroInicio: number | null
  horimetroFinal: number | null
  horaInicio: string | null
  horaFinal: string | null
  toneladasTotal: number | null
  sacosTotal: number | null
  toneladasReciclo: number | null
  disponibilidade: number | null
  performance: number | null
  qualidade: number | null
  aproveitamento: number | null
  status: StatusTurno
  createdAt: string
}

export function turnoFromRow(row: Record<string, unknown>): ProducaoTurno {
  const linha = row.producao_linhas as { nome?: string } | null
  return {
    id: row.id as string,
    linhaId: row.linha_id as string,
    linhaNome: linha?.nome ?? '—',
    data: row.data_producao as string,
    formula: (row.formula as string) ?? null,
    responsavelNome: (row.responsavel_nome as string) ?? null,
    horimetroInicio: (row.horimetro_inicio as number) ?? null,
    horimetroFinal: (row.horimetro_final as number) ?? null,
    horaInicio: (row.hora_inicio as string) ?? null,
    horaFinal: (row.hora_final as string) ?? null,
    toneladasTotal: (row.toneladas_total as number) ?? null,
    sacosTotal: (row.sacos_total as number) ?? null,
    toneladasReciclo: (row.toneladas_reciclo as number) ?? null,
    disponibilidade: (row.disponibilidade as number) ?? null,
    performance: (row.performance as number) ?? null,
    qualidade: (row.qualidade as number) ?? null,
    aproveitamento: (row.aproveitamento as number) ?? null,
    status: row.status as StatusTurno,
    createdAt: row.created_at as string,
  }
}

export interface ProducaoReferenciaFormula {
  id: string
  linhaId: string
  formula: string
  melhorTaxaTonHora: number
  turnoReferenciaId: string | null
  atualizadoEm: string
}

export function referenciaFormulaFromRow(row: Record<string, unknown>): ProducaoReferenciaFormula {
  return {
    id: row.id as string,
    linhaId: row.linha_id as string,
    formula: row.formula as string,
    melhorTaxaTonHora: row.melhor_taxa_ton_hora as number,
    turnoReferenciaId: (row.turno_referencia_id as string) ?? null,
    atualizadoEm: row.atualizado_em as string,
  }
}

export interface NovoTurnoInput {
  linhaId: string
  data: string
  formula: string
  responsavelNome: string
  horimetroInicio: string
  horaInicio: string
}

export function novoTurnoEmBranco(linhaId = ''): NovoTurnoInput {
  const hoje = new Date().toISOString().slice(0, 10)
  return { linhaId, data: hoje, formula: '', responsavelNome: '', horimetroInicio: '', horaInicio: '' }
}

export function novoTurnoToRow(input: NovoTurnoInput) {
  return {
    linha_id: input.linhaId,
    data_producao: input.data,
    formula: input.formula.trim() || null,
    responsavel_nome: input.responsavelNome.trim() || null,
    horimetro_inicio: numOrNull(input.horimetroInicio),
    hora_inicio: input.horaInicio || null,
    status: 'aberto',
  }
}

export interface FecharTurnoInput {
  horimetroFinal: string
  horaFinal: string
  toneladasTotal: string
  sacosTotal: string
  toneladasReciclo: string
}

export function fecharTurnoEmBranco(): FecharTurnoInput {
  return { horimetroFinal: '', horaFinal: '', toneladasTotal: '', sacosTotal: '', toneladasReciclo: '' }
}

export interface ProducaoParada {
  id: string
  turnoId: string
  categoria: CategoriaParada
  submotivo: string | null
  observacao: string | null
  inicio: string
  fim: string | null
}

export function paradaFromRow(row: Record<string, unknown>): ProducaoParada {
  return {
    id: row.id as string,
    turnoId: row.turno_id as string,
    categoria: row.categoria as CategoriaParada,
    submotivo: (row.submotivo as string) ?? null,
    observacao: (row.observacao as string) ?? null,
    inicio: row.inicio as string,
    fim: (row.fim as string) ?? null,
  }
}

export interface ParadaInput {
  categoria: CategoriaParada
  submotivo: string
  observacao: string
}

export function paradaEmBranco(): ParadaInput {
  return { categoria: 'mecanica_eletrica', submotivo: '', observacao: '' }
}

export function numOrNull(valor: string): number | null {
  if (!valor.trim()) return null
  const n = Number(valor.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
