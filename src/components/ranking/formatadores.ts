export function fmtT(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + 't'
}

export function fmtPct(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

export function iniciais(nome: string): string {
  return nome.slice(0, 2).toUpperCase()
}
