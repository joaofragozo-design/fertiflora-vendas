import type { CategoriaParada } from './types'

/**
 * "Aproveitamento" = Disponibilidade × Performance × Qualidade (OEE clássico do TPM).
 * Calculado uma vez, no fechamento do turno, e gravado em `producao_turnos` —
 * a tela de painel só lê o número pronto, não recalcula em cima de paradas soltas.
 *
 * Tempo rodando vem do HORÍMETRO (medição direta da máquina) sempre que disponível —
 * só cai para "janela do turno menos paradas" se o horímetro não foi informado.
 * Paradas "programada" (almoço, limpeza, manutenção preventiva) saem do tempo
 * planejado ANTES de calcular — não é perda, é tempo não-produtivo esperado.
 */

interface ParadaParaCalculo {
  categoria: CategoriaParada
  inicio: string
  fim: string | null
}

interface ParametrosOee {
  horaInicio: string | null
  horaFinal: string | null
  horimetroInicio: number | null
  horimetroFinal: number | null
  toneladasTotal: number | null
  toneladasReciclo: number | null
  /** Taxa de referência (ton/h) pra comparar o turno — o melhor turno já registrado pra essa fórmula+linha, não uma capacidade de fábrica fixa. */
  taxaReferenciaTonHora: number | null
  paradas: ParadaParaCalculo[]
}

export interface ResultadoOee {
  disponibilidade: number | null
  performance: number | null
  qualidade: number | null
  aproveitamento: number | null
  horasRodando: number | null
}

function minutosEntre(horaInicio: string, horaFinal: string): number | null {
  const [h1, m1] = horaInicio.split(':').map(Number)
  const [h2, m2] = horaFinal.split(':').map(Number)
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return null
  const minutos = h2 * 60 + m2 - (h1 * 60 + m1)
  return minutos > 0 ? minutos : null
}

function minutosParados(paradas: { inicio: string; fim: string | null }[]): number {
  return paradas.reduce((total, p) => {
    if (!p.fim) return total
    const ms = new Date(p.fim).getTime() - new Date(p.inicio).getTime()
    return total + Math.max(0, ms / 60000)
  }, 0)
}

function clamp01(valor: number): number {
  return Math.min(1, Math.max(0, valor))
}

export function calcularOee(params: ParametrosOee): ResultadoOee {
  const minutosTotais =
    params.horaInicio && params.horaFinal ? minutosEntre(params.horaInicio, params.horaFinal) : null

  const paradasProgramadas = params.paradas.filter((p) => p.categoria === 'programada')
  const paradasNaoProgramadas = params.paradas.filter((p) => p.categoria !== 'programada')
  const minutosAlmocoEtc = minutosParados(paradasProgramadas)

  // Tempo planejado de produção = janela do turno menos o que já era esperado não rodar (almoço etc).
  const minutosPlanejados = minutosTotais !== null ? Math.max(0, minutosTotais - minutosAlmocoEtc) : null

  const horasPorHorimetro =
    params.horimetroInicio !== null && params.horimetroFinal !== null && params.horimetroFinal > params.horimetroInicio
      ? params.horimetroFinal - params.horimetroInicio
      : null

  const minutosPerdidosNaoPlanejados = minutosParados(paradasNaoProgramadas)
  const horasPelaJanela =
    minutosPlanejados !== null ? Math.max(0, minutosPlanejados - minutosPerdidosNaoPlanejados) / 60 : null

  // Preferência: horímetro (dado da máquina) > cálculo pela janela menos paradas logadas.
  const horasRodando = horasPorHorimetro ?? horasPelaJanela

  const disponibilidade =
    minutosPlanejados && minutosPlanejados > 0 && horasRodando !== null
      ? clamp01((horasRodando * 60) / minutosPlanejados)
      : null

  const performance =
    params.taxaReferenciaTonHora && horasRodando && horasRodando > 0 && params.toneladasTotal !== null
      ? clamp01(params.toneladasTotal / (params.taxaReferenciaTonHora * horasRodando))
      : null

  const qualidade =
    params.toneladasTotal !== null && params.toneladasTotal > 0
      ? clamp01((params.toneladasTotal - (params.toneladasReciclo ?? 0)) / params.toneladasTotal)
      : null

  const aproveitamento =
    disponibilidade !== null && performance !== null && qualidade !== null
      ? disponibilidade * performance * qualidade
      : null

  return { disponibilidade, performance, qualidade, aproveitamento, horasRodando }
}

/** Taxa observada (ton/h) do turno — vira a nova referência se superar a melhor já registrada pra essa fórmula+linha. */
export function calcularTaxaObservada(toneladasTotal: number | null, horasRodando: number | null): number | null {
  if (toneladasTotal === null || !horasRodando || horasRodando <= 0) return null
  return toneladasTotal / horasRodando
}

export function corDoAproveitamento(aproveitamento: number | null): 'verde' | 'amarelo' | 'vermelho' | 'neutro' {
  if (aproveitamento === null) return 'neutro'
  if (aproveitamento >= 0.8) return 'verde'
  if (aproveitamento >= 0.6) return 'amarelo'
  return 'vermelho'
}
