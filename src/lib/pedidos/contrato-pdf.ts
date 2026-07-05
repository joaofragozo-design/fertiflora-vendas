import { jsPDF } from 'jspdf'
import { infoEmbalagem, calcularPedido, type Pedido } from './types'

const EMPRESA = {
  nome: 'FERTIFLORA FERTILIZANTES LTDA',
  cnpj: '47.731.921/0001-98',
  endereco: 'ROD. PR 317 - KM 05, S/N JD. RECANTO - CEP: 85.902-600 - TOLEDO/PR',
  ie: '90.962.563-77',
  dadosBancarios: 'PIX = E-mail financeiro@fertiflora.com - FERTIFLORA FERTILIZANTES - CRÉDITO EM BANCO SICREDI - 748 - AG: 0704 - CC 07015-6',
}

/** Texto reproduzido fielmente do contrato-modelo fornecido pela empresa — não alterar sem instrução explícita. */
const CLAUSULAS = [
  'Se a qualquer tempo, o crédito do comprador for julgado pela vendedora insuficiente à cobertura do débito a ser contraído e não forem colocados os instrumentos usuais de garantia à disposição da vendedora, esta poderá a seu critério cancelar imediatamente o pedido ou entregar somente parte das mercadorias pela suficiência de crédito.',
  'Para os efeitos no disposto na legislação em vigor, declara o comprador que os produtos, constantes neste pedido destinam-se à aplicação exclusiva na atividade agropecuária.',
  'Será de responsabilidade do comprador qualquer modificação de incidência fiscal e/ou instituição de tributo que afete direta ou indiretamente a operação descrita no pedido.',
  'As mercadorias vendidas no sistema FOB que não forem retiradas dentro do prazo estabelecido poderão ser despachadas para o endereço do comprador, correndo por conta deste as respectivas despesas do despacho, transporte, bem como estarão condicionadas aos preços e condições do dia, ou, a critério da vendedora, poderá o pedido ser cancelado.',
  'O comprador poderá cancelar o pedido no prazo de 7 (sete) dias a contar da assinatura deste pedido. Após este prazo somente com concordância expressa da vendedora.',
  'Ocorrendo casos de força maior ou fortuitos, falta de matéria-prima, energia elétrica e combustível, paralisações portuárias, e nos demais sistemas de transportes, alterações governamentais, cambiais e salariais, alterações nos preços e demais condições ditadas pelo CIP, por outros órgãos ou pelos fornecedores de insumos, o presente pedido será, em consequência, renegociado em relação aos preços e demais condições.',
  'Se o comprador não retirar o produto até seis dias após a data do vencimento do pedido, ou da data prevista para retirada da mercadoria, a VENDEDORA poderá carregar ou cancelá-lo.',
  'A existência de financiamento bancário não exime o comprador da responsabilidade de pagamento do preço ajustado mediante recursos próprios, bem como de aceitar as duplicatas que se originarem deste pedido e de fornecer as garantias necessárias ao crédito, quando solicitadas pela vendedora. A vendedora reserva-se o direito de usar e entrega das mercadorias até a comprovação da liberação, a seu favor da verba do referido financiamento.',
  'As partes convencionam que o valor das duplicatas em virtude da presente venda, assim como das demais obrigações contraídas em consequência deste instrumento e não pagar, serão reajustadas de acordo com a variação do índice (INPC), ou outro índice que a este vier a substituir, desde a sua emissão e o efetivo pagamento, acrescido de juros de 1% ao mês ou pela avaliação da moeda pactuada, tomando por base o preço do dia de mercado, acrescida de multa de 10%.',
  'Caso não ocorra o pagamento do Título na data de vencimento, o valor será acrescido além da correção descrito no item 9, de honorários advocatícios, de 15% e despesas administrativas de 2% sobre o valor, sem prejuízo os juros de mora e correção monetária.',
  'O Representante de Vendas da FERTIFLORA FERTILIZANTES LTDA., não está autorizado a propor ou aceitar acordos verbais que contrariem as especificações ou as condições de venda expressas no anverso ou nas condições gerais, tais acordos somente serão válidos quando confirmados por escrito pela FERTIFLORA FERTILIZANTES LTDA.',
  'Fica proibido aos nossos funcionários, Gerentes, ou Representantes de Venda, receber em parte ou total os valores declarados neste instrumento, salvo se o pagamento for feito com cheque nominal e cruzado à FERTIFLORA FERTILIZANTES LTDA.',
  'Qualquer pagamento efetuado pelo comprador após expirar a validade do pedido, não implica na aceitação por parte da vendedora como quitação de pedido ou saldo do mesmo.',
  'Reclamações por diferença de peso, quantidade e integridade física das mercadorias, somente serão recebidas quando feitas pelo comprador ao transportador no ato de recebimento de mercadoria e devidamente registrada no conhecimento do frete e no canhoto da nota fiscal.',
  'Sem prejuízo do avençado na cláusula anterior, não serão aceitas reclamações sobre mercadorias vencidas após o prazo de 15 dias da entrega e em hipótese alguma devolução de mercadorias sem concordância expressa da vendedora.',
  'Em caso de existirem mais débitos entre o comprador para com a Vendedora, a inadimplência de qualquer título acarretará o vencimento antecipado e extraordinário dos títulos vincendos.',
  'Caberá a vendedora a imputação do pagamento como melhor lhe convier, em caso de existirem mais débitos em nome do comprador.',
  'Fica eleito o Fórum de Toledo, Paraná, para dirimir quaisquer dúvidas oriundas ou omissoras do presente instrumento.',
  'Em virtude de operação de crédito, de qualquer natureza, pleiteada junto à empresa FERTIFLORA FERTILIZANTES LTDA, autorizo a consultar, a qualquer tempo, débitos e responsabilidades decorrentes de operações com características de crédito e informações de títulos de minha emissão registrados, tal como, mas não se limitando a Cédulas de Produto Rural, e registros de medidas judiciais que em meu nome e de minhas empresas, constem ou venham a constar nos Sistemas de Informações de Crédito (SCR) e em Sistema de registro ou de depósito centralizado operado por entidade registradora ou depositária central autorizada. O(s) DEVEDOR(ES) e FIADOR(ES) se cientificam que as consultas ao SCR serão realizadas com base na presente autorização, prestada neste INSTRUMENTO, e que o SCR tem por finalidades prover informações ao Banco Central do Brasil, para fins de monitoramento e supervisão do crédito no sistema financeiro, conforme definido no § 1º do art. 1º da Lei Complementar nº 105, de 10 de janeiro de 2001, e que poderei ter acesso aos dados constantes em meu nome no SCR por meio do sistema "Registrado" do Banco Central do Brasil.',
]

const TERMO_GARANTIA =
  'Termo de constituição de Garantia Fidejussória Solidária: declaro que sou responsável pelo pagamento da compra objeto deste pedido, cujas mercadorias são remetidas em vista desta garantia. Comprometo-me a fornecer carta de fiança e assiná-la como fiador, obtendo a respectiva outorga uxória. Na falta de minha assinatura na carta de fiança, autorizo e concordo que o presente COMPROMISSO seja anexado às duplicatas onde me obrigo solidariamente pelo pagamento da obrigação contraída.'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDataHoje() {
  return new Date().toLocaleDateString('pt-BR')
}
function fmtDataISO(iso: string | null) {
  if (!iso) return 'A combinar'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

const MARGEM = 15
const LARGURA_UTIL = 210 - MARGEM * 2

export function gerarContratoPdf(pedido: Pedido): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { dados } = pedido
  const calculo = calcularPedido(pedido.quantidadeToneladas, pedido.embalagem, dados.precoVendidoTon, dados.freteTon)
  const embalagem = infoEmbalagem(pedido.embalagem)

  let y = MARGEM

  function linha(y: number) {
    doc.setDrawColor(210)
    doc.line(MARGEM, y, MARGEM + LARGURA_UTIL, y)
  }

  function quebrarPagina(alturaNecessaria: number) {
    if (y + alturaNecessaria > 280) {
      doc.addPage()
      y = MARGEM
    }
  }

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('CONTRATO DE VENDA', MARGEM, y)
  doc.setFontSize(11)
  doc.text(pedido.numeroContrato ?? '', MARGEM + LARGURA_UTIL, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Emissão: ${fmtDataHoje()}`, MARGEM + LARGURA_UTIL, y, { align: 'right' })
  y += 6
  linha(y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Unidade:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(EMPRESA.nome, MARGEM + 18, y)
  doc.setFont('helvetica', 'bold')
  doc.text('CNPJ:', MARGEM + 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(EMPRESA.cnpj, MARGEM + 132, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Endereço:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(EMPRESA.endereco, MARGEM + 18, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Vendedor(a):', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.vendedorNome, MARGEM + 22, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Fone:', MARGEM + 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.vendedorTelefone ?? '—', MARGEM + 132, y)
  y += 8

  // Dados do cliente
  doc.setFillColor(24, 165, 88)
  doc.rect(MARGEM, y - 4, LARGURA_UTIL, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('DADOS DO CLIENTE', MARGEM + 2, y)
  doc.setTextColor(0, 0, 0)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.text('Nome:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.clienteNome, MARGEM + 14, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('CPF/CNPJ:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.clienteCpfCnpj, MARGEM + 20, y)
  doc.setFont('helvetica', 'bold')
  doc.text('I.E:', MARGEM + 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.clienteInscricaoEstadual ?? '—', MARGEM + 128, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Endereço:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.clienteEndereco || '—', MARGEM + 18, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Município/UF:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${dados.clienteCidade ?? '—'}/${dados.clienteEstado ?? '—'}`, MARGEM + 26, y)
  doc.setFont('helvetica', 'bold')
  doc.text('CEP:', MARGEM + 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.clienteCep ?? '—', MARGEM + 128, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('E-mail:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.clienteEmail ?? '—', MARGEM + 14, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Fone:', MARGEM + 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.clienteTelefone ?? '—', MARGEM + 128, y)
  y += 8

  doc.setFontSize(7.5)
  const declaracao = doc.splitTextToSize(
    'Declaro que desejo comprar o(s) produto(s) segundo a espécie, qualidade e quantidade abaixo identificadas nas condições constantes deste contrato de venda, conforme a tabela de preços vigente à data de aprovação do contrato de venda:',
    LARGURA_UTIL
  )
  doc.text(declaracao, MARGEM, y)
  y += declaracao.length * 3.2 + 4

  // Tabela de produto
  const colunas = [
    { titulo: 'Qtd (un)', largura: 16 },
    { titulo: 'Embalagem', largura: 22 },
    { titulo: 'Qtd (Ton)', largura: 18 },
    { titulo: 'Produto', largura: 44 },
    { titulo: 'Preço Unit.', largura: 24 },
    { titulo: 'Valor Total', largura: 26 },
    { titulo: 'Vencimento', largura: 30 },
  ]
  let x = MARGEM
  doc.setFillColor(24, 165, 88)
  doc.rect(MARGEM, y - 4, LARGURA_UTIL, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  for (const col of colunas) {
    doc.text(col.titulo, x + 1, y)
    x += col.largura
  }
  doc.setTextColor(0, 0, 0)
  y += 6

  const linhaProduto = [
    calculo.quantidadeUnidades.toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
    embalagem.rotulo,
    pedido.quantidadeToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
    dados.produto,
    fmtBRL(calculo.precoUnitario),
    fmtBRL(calculo.valorTotalProduto),
    fmtDataISO(dados.vencimento),
  ]
  x = MARGEM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  linhaProduto.forEach((valor, i) => {
    const linhas = doc.splitTextToSize(valor, colunas[i].largura - 2)
    doc.text(linhas, x + 1, y)
    x += colunas[i].largura
  })
  y += 8
  linha(y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Frete (R$/Ton):', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtBRL(dados.freteTon), MARGEM + 30, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Valor do frete:', MARGEM + 80, y)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtBRL(calculo.freteTotal), MARGEM + 108, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Valor total do pedido:', MARGEM, y)
  doc.text(fmtBRL(calculo.valorTotalPedido), MARGEM + 55, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Condições de pagamento:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtDataISO(dados.vencimento), MARGEM + 42, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Dados bancários:', MARGEM, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const banco = doc.splitTextToSize(EMPRESA.dadosBancarios, LARGURA_UTIL)
  doc.text(banco, MARGEM, y)
  y += banco.length * 3.2 + 4

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Local de entrega:', MARGEM, y)
  doc.setFont('helvetica', 'normal')
  doc.text('A combinar', MARGEM + 30, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Data de entrega:', MARGEM + 100, y)
  doc.setFont('helvetica', 'normal')
  doc.text('A combinar', MARGEM + 130, y)
  y += 10

  // Assinaturas
  quebrarPagina(20)
  linha(y)
  y += 10
  doc.text('_______________________________________', MARGEM, y)
  doc.text('_______________________________________', MARGEM + 100, y)
  y += 5
  doc.setFontSize(8)
  doc.text(EMPRESA.nome, MARGEM, y)
  doc.text(`${dados.clienteNome} (comprador)`, MARGEM + 100, y)
  y += 10

  // Condições de venda
  quebrarPagina(10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Condições de Venda', MARGEM, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  CLAUSULAS.forEach((clausula, i) => {
    const texto = doc.splitTextToSize(`${i + 1}) ${clausula}`, LARGURA_UTIL)
    quebrarPagina(texto.length * 3 + 2)
    doc.text(texto, MARGEM, y)
    y += texto.length * 3 + 2
  })

  quebrarPagina(20)
  y += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  const garantia = doc.splitTextToSize(TERMO_GARANTIA, LARGURA_UTIL)
  doc.text(garantia, MARGEM, y)

  return doc
}

export function baixarContratoPdf(pedido: Pedido) {
  const doc = gerarContratoPdf(pedido)
  doc.save(`contrato-venda-${pedido.dados.clienteNome.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
