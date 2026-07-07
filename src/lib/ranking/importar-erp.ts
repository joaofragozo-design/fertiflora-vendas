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

/** dd/mm/yyyy → yyyy-mm-dd (formato aceito por colunas `date` do Postgres). */
function paraDataIso(dataBr: string): string | null {
  const match = dataBr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
}

interface CabecalhoErp {
  linhas: string[]
  indiceCabecalho: number
  idx: (nomeColuna: string) => number
}

function lerCabecalho(texto: string, prefixoCabecalho: string): CabecalhoErp {
  const linhas = texto.split(/\r?\n/)
  const indiceCabecalho = linhas.findIndex((l) => l.startsWith(prefixoCabecalho))
  if (indiceCabecalho === -1) throw new Error('Arquivo não parece ser um relatório do ERP válido — cabeçalho não encontrado.')
  const colunas = linhas[indiceCabecalho].split(';').map((c) => c.trim())
  return { linhas, indiceCabecalho, idx: (nome) => colunas.indexOf(nome) }
}

/** Retorna o total de toneladas faturadas no `ano` informado, por código de vendedor. */
export function parseRelatorioErp(texto: string, ano: number): LinhaImportada[] {
  const { linhas, indiceCabecalho, idx } = lerCabecalho(texto, 'Empresa;Vendedor;')
  const idxVendedor = idx('Vendedor')
  const idxEmissao = idx('Emissao')
  const idxPsLiq = idx('Ps.Liq')
  const idxUn = idx('UN')
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

export interface NotaFiscalLinha {
  vendedorCodigo: number
  vendedorNome: string
  clienteCodigo: number
  clienteNome: string
  nota: string
  emissao: string
  produto: string
  municipio: string
  un: string
  quantidade: number
  pesoLiquidoKg: number
  valorLiquido: number
}

/**
 * Extrai o detalhe linha-a-linha do relatório (todas as notas, todos os
 * anos) — base para o BI do Cliente. Diferente de `parseRelatorioErp`, não
 * agrega nada aqui; a agregação (por ano, por mês, por produto) acontece
 * depois, em cima do dado bruto já salvo no banco.
 */
export function parseNotasFiscais(texto: string): NotaFiscalLinha[] {
  const { linhas, indiceCabecalho, idx } = lerCabecalho(texto, 'Empresa;Vendedor;')
  const idxVendedor = idx('Vendedor')
  const idxClifor = idx('Clifor')
  const idxEmissao = idx('Emissao')
  const idxNota = idx('Nota')
  const idxDescricao = idx('Descricao')
  const idxMunicipio = idx('Municipio')
  const idxPsLiq = idx('Ps.Liq')
  const idxUn = idx('UN')
  const idxQtde = idx('Qtde')
  const idxVlLiq = idx('Vl.Liq.')

  const obrigatorias = { idxVendedor, idxClifor, idxEmissao, idxDescricao, idxPsLiq, idxUn, idxVlLiq }
  if (Object.values(obrigatorias).some((i) => i === -1)) {
    throw new Error('Arquivo não tem todas as colunas esperadas do relatório RFT6.')
  }

  const resultado: NotaFiscalLinha[] = []
  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const campos = linhas[i].split(';')
    if (campos.length <= idxVlLiq) continue

    const emissaoIso = paraDataIso(campos[idxEmissao] ?? '')
    if (!emissaoIso) continue

    const vendedor = extrairCodigoNome(campos[idxVendedor] ?? '')
    const cliente = extrairCodigoNome(campos[idxClifor] ?? '')
    if (!vendedor || !cliente) continue

    const produto = campos[idxDescricao]?.trim()
    if (!produto) continue

    resultado.push({
      vendedorCodigo: vendedor.codigo,
      vendedorNome: vendedor.nome,
      clienteCodigo: cliente.codigo,
      clienteNome: cliente.nome,
      nota: campos[idxNota]?.trim() ?? '',
      emissao: emissaoIso,
      produto,
      municipio: campos[idxMunicipio]?.trim() ?? '',
      un: campos[idxUn]?.trim() ?? '',
      quantidade: parseNumeroBr(campos[idxQtde]),
      pesoLiquidoKg: parseNumeroBr(campos[idxPsLiq]),
      valorLiquido: parseNumeroBr(campos[idxVlLiq]),
    })
  }

  return resultado
}

export interface PedidoErpLinha {
  vendedorCodigo: number
  vendedorNome: string
  clienteCodigo: number
  clienteNome: string
  numeroPedido: string
  emissao: string
  entrega: string | null
  produto: string
  status: string
  un: string
  quantidadePedida: number
  quantidadeSaldo: number
  pesoPedidoKg: number
  pesoSaldoKg: number
  valorTotal: number
  valorSaldo: number
}

/**
 * Extrai o detalhe linha-a-linha do relatório "VPE — Pedidos de Vendas"
 * (pedidos ainda em aberto, um item por linha). Diferente do RFT6, os
 * códigos de vendedor/cliente vêm em colunas separadas do nome (não no
 * formato "codigo - nome"). PS PEDIDO/PS SALDO já vêm em KG independente
 * da unidade de venda (saco/bag/kg direto).
 */
export function parsePedidosErp(texto: string): PedidoErpLinha[] {
  const { linhas, indiceCabecalho, idx } = lerCabecalho(texto, 'EMPRESA;VENDEDOR;NOME VENDEDOR;')
  const idxVendedor = idx('VENDEDOR')
  const idxNomeVendedor = idx('NOME VENDEDOR')
  const idxPedido = idx('PEDIDO')
  const idxClifor = idx('CLIFOR')
  const idxRazaoSocial = idx('RAZÃO SOCIAL')
  const idxEmissao = idx('DATA DE EMISSÃO')
  const idxEntrega = idx('DATA DE ENTREGA')
  const idxDescricao = idx('DESCRIÇÃO')
  const idxQtPedida = idx('QT PEDIDA')
  const idxQtSaldo = idx('QT SALDO')
  const idxPsPedido = idx('PS PEDIDO')
  const idxPsSaldo = idx('PS SALDO')
  const idxVlTotal = idx('VL TOTAL')
  const idxVlSaldo = idx('VL SALDO')
  const idxStPedido = idx('ST PEDIDO')
  const idxUn = idx('UNIDADE DE MEDIDA')

  const obrigatorias = { idxVendedor, idxNomeVendedor, idxPedido, idxClifor, idxRazaoSocial, idxEmissao, idxDescricao, idxPsPedido, idxPsSaldo, idxVlTotal, idxVlSaldo, idxUn }
  if (Object.values(obrigatorias).some((i) => i === -1)) {
    throw new Error('Arquivo não tem todas as colunas esperadas do relatório de Pedidos de Vendas (VPE).')
  }

  const resultado: PedidoErpLinha[] = []
  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue
    const campos = linhas[i].split(';')
    if (campos.length <= idxVlSaldo) continue

    const emissaoIso = paraDataIso(campos[idxEmissao] ?? '')
    if (!emissaoIso) continue

    const vendedorCodigo = Number(campos[idxVendedor]?.trim())
    const clienteCodigo = Number(campos[idxClifor]?.trim())
    if (!Number.isFinite(vendedorCodigo) || !Number.isFinite(clienteCodigo)) continue

    const produto = campos[idxDescricao]?.trim()
    if (!produto) continue

    resultado.push({
      vendedorCodigo,
      vendedorNome: campos[idxNomeVendedor]?.trim() ?? '',
      clienteCodigo,
      clienteNome: campos[idxRazaoSocial]?.trim() ?? '',
      numeroPedido: campos[idxPedido]?.trim() ?? '',
      emissao: emissaoIso,
      entrega: paraDataIso(campos[idxEntrega] ?? ''),
      produto,
      status: campos[idxStPedido]?.trim() ?? '',
      un: campos[idxUn]?.trim() ?? '',
      quantidadePedida: parseNumeroBr(campos[idxQtPedida]),
      quantidadeSaldo: parseNumeroBr(campos[idxQtSaldo]),
      pesoPedidoKg: parseNumeroBr(campos[idxPsPedido]),
      pesoSaldoKg: parseNumeroBr(campos[idxPsSaldo]),
      valorTotal: parseNumeroBr(campos[idxVlTotal]),
      valorSaldo: parseNumeroBr(campos[idxVlSaldo]),
    })
  }

  return resultado
}
