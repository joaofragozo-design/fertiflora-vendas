export interface CnpjDados {
  nome: string
  nomeFantasia: string
  telefone: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

export function somenteDigitos(v: string) {
  return v.replace(/\D/g, '')
}

export async function buscarCnpj(cnpjBruto: string): Promise<CnpjDados> {
  const cnpj = somenteDigitos(cnpjBruto)
  if (cnpj.length !== 14) throw new Error('CNPJ precisa ter 14 dígitos.')

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
  if (!res.ok) throw new Error('CNPJ não encontrado.')
  const data = await res.json()

  return {
    nome: data.razao_social ?? '',
    nomeFantasia: data.nome_fantasia ?? '',
    telefone: data.ddd_telefone_1 ?? '',
    cep: data.cep ?? '',
    logradouro: data.logradouro ?? '',
    numero: data.numero ?? '',
    complemento: data.complemento ?? '',
    bairro: data.bairro ?? '',
    cidade: data.municipio ?? '',
    estado: data.uf ?? '',
  }
}
