export interface VendedorRanqueado {
  codigo: number
  nome: string
  toneladas: number
  reais: number
  toneladasAnoAnterior: number
  reaisAnoAnterior: number
  /** Fatia sobre o total da empresa (inclui os agregados no denominador, mesmo que não apareçam na lista). */
  participacaoPct: number
}

export interface PracaResumo {
  chave: string
  toneladas: number
  reais: number
  vendedores: number
}
