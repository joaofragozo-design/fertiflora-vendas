/**
 * Porta fiel da aba "CALCULO DE PRAZO MÉDIO" da planilha do vendedor.
 * Cada parcela contribui com (percentual × dias-até-a-data) e, como os
 * percentuais somam 100%, a soma dessas contribuições já É a média
 * ponderada de dias — sem precisar dividir por nada.
 */

export interface Parcela {
  percentual: number // 0..1
  data: string // YYYY-MM-DD
}

export interface PrazoMedioResultado {
  totalPercentual: number
  fechaEm100: boolean
  dataMedia: Date | null
}

function diffDias(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

export function calcularPrazoMedio(parcelas: Parcela[], hoje: Date): PrazoMedioResultado {
  const totalPercentual = parcelas.reduce((s, p) => s + (p.percentual || 0), 0)
  const fechaEm100 = Math.abs(totalPercentual - 1) < 0.0005

  if (!fechaEm100) return { totalPercentual, fechaEm100, dataMedia: null }

  const mediaDias = parcelas.reduce((s, p) => {
    if (!p.percentual || !p.data) return s
    const dias = diffDias(new Date(p.data + 'T00:00:00'), hoje)
    return s + p.percentual * dias
  }, 0)

  return { totalPercentual, fechaEm100, dataMedia: new Date(hoje.getTime() + mediaDias * 86400000) }
}
