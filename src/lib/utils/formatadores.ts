/** Formata CPF (11 dígitos) ou CNPJ (14 dígitos) para exibição — números crus são difíceis de ler e conferir. */
export function formatarCpfCnpj(valor: string): string {
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return valor
}

/** Formata telefone BR (10 ou 11 dígitos, com DDD) para exibição. */
export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length === 11) {
    return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (digitos.length === 10) {
    return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return valor
}
