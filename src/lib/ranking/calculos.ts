/** Conta dias úteis (seg–sex) entre duas datas, incluindo ambas as pontas. */
function contarDiasUteis(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0
  let dias = 0
  const cursor = new Date(inicio)
  cursor.setHours(0, 0, 0, 0)
  const limite = new Date(fim)
  limite.setHours(0, 0, 0, 0)
  while (cursor <= limite) {
    const diaSemana = cursor.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) dias++
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

/** Total de dias úteis no ano (1º de janeiro a 31 de dezembro). Não considera feriados. */
export function diasUteisNoAno(ano: number): number {
  return contarDiasUteis(new Date(ano, 0, 1), new Date(ano, 11, 31))
}

/** Dias úteis já decorridos no ano, de 1º de janeiro até hoje (inclusive). */
export function diasUteisDecorridos(ano: number, hoje: Date = new Date()): number {
  const fimAno = new Date(ano, 11, 31)
  const ateData = hoje < fimAno ? hoje : fimAno
  return contarDiasUteis(new Date(ano, 0, 1), ateData)
}

/** Dias úteis que ainda restam no ano, a partir de hoje. */
export function diasUteisRestantes(ano: number, hoje: Date = new Date()): number {
  return Math.max(0, diasUteisNoAno(ano) - diasUteisDecorridos(ano, hoje))
}

/** Projeção de fechamento do ano por ritmo (run-rate): mantendo a média diária atual até 31/dez. */
export function calcularProjecao(faturado: number, ano: number, hoje: Date = new Date()): number {
  const decorridos = diasUteisDecorridos(ano, hoje)
  if (decorridos <= 0) return faturado
  const total = diasUteisNoAno(ano)
  return (faturado / decorridos) * total
}

export function calcularPercentual(faturado: number, meta: number): number {
  if (meta <= 0) return faturado > 0 ? 100 : 0
  return (faturado / meta) * 100
}

export function calcularFalta(faturado: number, meta: number): number {
  return Math.max(0, meta - faturado)
}
