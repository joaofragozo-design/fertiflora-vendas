export type TipoAnexo = 'imagem' | 'arquivo'

export interface Anexo {
  /** Path dentro do bucket privado `chat-anexos` -- nunca uma URL pública. */
  path: string
  tipo: TipoAnexo
  nomeOriginal: string
  tamanhoBytes: number | null
}

export interface Anuncio {
  id: string
  autorId: string
  corpo: string | null
  anexo: Anexo | null
  apagado: boolean
  editado: boolean
  createdAt: string
}

export interface MensagemDireta {
  id: string
  remetenteId: string
  destinatarioId: string
  corpo: string | null
  anexo: Anexo | null
  lida: boolean
  apagada: boolean
  editado: boolean
  createdAt: string
}

export interface ConversaResumo {
  outroProfileId: string
  outroNome: string
  outroAvatarUrl: string | null
  ultimaMensagemTexto: string | null
  ultimaMensagemTemAnexo: boolean
  ultimaMensagemEm: string
  naoLidas: number
}

/** Mesma audiência de "provocar" no Ranking -- vendedor vinculado ativo ou equipe de apoio. */
export interface ContatoChat {
  profileId: string
  nome: string
  avatarUrl: string | null
}

function tipoDoMime(mime: string | null): TipoAnexo {
  return mime?.startsWith('image/') ? 'imagem' : 'arquivo'
}

function anexoFromRow(row: Record<string, unknown>): Anexo | null {
  const path = row.anexo_url as string | null
  if (!path) return null
  return {
    path,
    tipo: tipoDoMime(row.anexo_tipo_mime as string | null),
    nomeOriginal: (row.anexo_nome_original as string) ?? 'Anexo',
    tamanhoBytes: row.anexo_tamanho_bytes != null ? Number(row.anexo_tamanho_bytes) : null,
  }
}

export function anuncioFromRow(row: Record<string, unknown>): Anuncio {
  const apagado = row.deletado_em != null
  return {
    id: row.id as string,
    autorId: row.autor_id as string,
    corpo: apagado ? null : (row.corpo as string | null),
    anexo: apagado ? null : anexoFromRow(row),
    apagado,
    editado: !apagado && row.editado_em != null,
    createdAt: row.criado_em as string,
  }
}

export function mensagemDiretaFromRow(row: Record<string, unknown>): MensagemDireta {
  const apagada = row.deletado_em != null
  return {
    id: row.id as string,
    remetenteId: row.remetente_id as string,
    destinatarioId: row.destinatario_id as string,
    corpo: apagada ? null : (row.corpo as string | null),
    anexo: apagada ? null : anexoFromRow(row),
    lida: row.lida_em != null,
    apagada,
    editado: !apagada && row.editado_em != null,
    createdAt: row.criado_em as string,
  }
}
