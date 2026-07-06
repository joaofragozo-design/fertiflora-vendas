/**
 * Parser do relatório "RFT6 - Relatório de Faturamento por Cliente/Produto"
 * exportado do ERP da empresa (CSV separado por `;`, encoding Windows-1252).
 * Soma o peso líquido (Ps.Liq, em KG) de produtos faturados no ano corrente,
 * agrupado pelo código do Vendedor — a mesma base de "toneladas" usada no
 * Ranking Comercial. Não inclui produtos vendidos em LT/UN porque não têm
 * conversão direta para toneladas.
 */
export interface LinhaImportada {
  codigo: number
  nomeErp: string
  toneladas: number
}

function parseNumeroBr(valor: string | undefined): number {
  if (!valor) return 0
  const limpo = valor.trim().replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

/** "240 - FABIO BAZUCO" → { codigo: 240, nome: "FABIO BAZUCO" } */
function extrairCodigoNome(campo: string): { codigo: number; nome: string } | null {
  const match = campo.trim().match(/^(\d+)\s*-\s*(.+)$/)
  if (!match) return null
  return { codigo: Number(match[1]), nome: match[2].trim() }
}

export async function lerArquivoErp(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return new TextDecoder('windows-1252').decode(buffer)
}

/** Retorna o total de toneladas faturadas no `ano` informado, por código de vendedor. */
export function parseRelatorioErp(texto: string, ano: number): LinhaImportada[] {
  const linhas = texto.split(/\r?\n/)
  const indiceCabecalho = linhas.findIndex((l) => l.startsWith('Empresa;Vendedor;'))
  if (indiceCabecalho === -1) throw new Error('Arquivo não parece ser um relatório RFT6 válido — cabeçalho não encontrado.')

  const colunas = linhas[indiceCabecalho].split(';').map((c) => c.trim())
  const idxVendedor = colunas.indexOf('Vendedor')
  const idxEmissao = colunas.indexOf('Emissao')
  const idxPsLiq = colunas.indexOf('Ps.Liq')
  const idxUn = colunas.indexOf('UN')
  if (idxVendedor === -1 || idxEmissao === -1 || idxPsLiq === -1 || idxUn === -1) {
    throw new Error('Arquivo não tem as colunas esperadas (Vendedor, Emissao, Ps.Liq, UN).')
  }

  const sufixoAno = `/${ano}`
  const porCodigo = new Map<number, LinhaImportada>()

  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const campos = linhas[i].split(';')
    if (campos.length <= idxPsLiq) continue

    const emissao = campos[idxEmissao]?.trim()
    if (!emissao?.endsWith(sufixoAno)) continue
    if (campos[idxUn]?.trim() !== 'KG') continue

    const vendedor = extrairCodigoNome(campos[idxVendedor] ?? '')
    if (!vendedor) continue

    const toneladas = parseNumeroBr(campos[idxPsLiq]) / 1000
    const atual = porCodigo.get(vendedor.codigo)
    if (atual) atual.toneladas += toneladas
    else porCodigo.set(vendedor.codigo, { codigo: vendedor.codigo, nomeErp: vendedor.nome, toneladas })
  }

  return [...porCodigo.values()].sort((a, b) => b.toneladas - a.toneladas)
}
