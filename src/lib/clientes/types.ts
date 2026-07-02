export type TipoPessoa = 'pf' | 'pj'

export interface Cliente {
  id: string
  vendedorId: string
  tipoPessoa: TipoPessoa
  nome: string
  nomeFantasia: string | null
  cpfCnpj: string
  inscricaoEstadual: string | null
  telefone: string | null
  email: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  createdAt: string
}

export interface ClienteInput {
  tipoPessoa: TipoPessoa
  nome: string
  nomeFantasia: string
  cpfCnpj: string
  inscricaoEstadual: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

export function clienteEmBranco(): ClienteInput {
  return {
    tipoPessoa: 'pj', nome: '', nomeFantasia: '', cpfCnpj: '', inscricaoEstadual: '',
    telefone: '', email: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  }
}

export function clienteFromRow(row: Record<string, unknown>): Cliente {
  return {
    id: row.id as string,
    vendedorId: row.vendedor_id as string,
    tipoPessoa: row.tipo_pessoa as TipoPessoa,
    nome: row.nome as string,
    nomeFantasia: (row.nome_fantasia as string) ?? null,
    cpfCnpj: row.cpf_cnpj as string,
    inscricaoEstadual: (row.inscricao_estadual as string) ?? null,
    telefone: (row.telefone as string) ?? null,
    email: (row.email as string) ?? null,
    cep: (row.cep as string) ?? null,
    logradouro: (row.logradouro as string) ?? null,
    numero: (row.numero as string) ?? null,
    complemento: (row.complemento as string) ?? null,
    bairro: (row.bairro as string) ?? null,
    cidade: (row.cidade as string) ?? null,
    estado: (row.estado as string) ?? null,
    createdAt: row.created_at as string,
  }
}

export function clienteToRow(input: ClienteInput, vendedorId: string) {
  return {
    vendedor_id: vendedorId,
    tipo_pessoa: input.tipoPessoa,
    nome: input.nome.trim(),
    nome_fantasia: input.nomeFantasia.trim() || null,
    cpf_cnpj: input.cpfCnpj.trim(),
    inscricao_estadual: input.inscricaoEstadual.trim() || null,
    telefone: input.telefone.trim() || null,
    email: input.email.trim() || null,
    cep: input.cep.trim() || null,
    logradouro: input.logradouro.trim() || null,
    numero: input.numero.trim() || null,
    complemento: input.complemento.trim() || null,
    bairro: input.bairro.trim() || null,
    cidade: input.cidade.trim() || null,
    estado: input.estado.trim().toUpperCase() || null,
  }
}
