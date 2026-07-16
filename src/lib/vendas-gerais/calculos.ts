import { anoDe, chaveDiaDoAno, corteDiaDoAno } from '@/lib/clientes-bi/calculos'
import type { NotaFiscalRow } from '@/lib/clientes-bi/types'
import type { RankingEntry } from '@/lib/ranking/types'
import type { PracaResumo, VendedorRanqueado } from './types'

/**
 * Comparativo entre vendedores (quem vende mais/cresceu) -- agrupa TODAS as notas por
 * `vendedorCodigo`, com o mesmo corte "até o mesmo dia do calendário nos dois anos" que
 * `calcularResumoVendedor`/`calcularKpis` já usam (evita reintroduzir o bug corrigido em
 * a34e3b5, onde o ano anterior fechado entrava inteiro contra o ano atual parcial).
 * `participacaoPct` é sobre o total da empresa INCLUINDO agregados no denominador -- só a
 * lista retornada exclui os códigos agregados (Fertiflora, Outros), que são catch-all e
 * não devem competir num ranking de "quem vende mais".
 */
export function calcularRankingVendedores(
  notas: NotaFiscalRow[],
  ano: number,
  codigosAgregados: Set<number> = new Set(),
  hoje: Date = new Date()
): VendedorRanqueado[] {
  const corte = corteDiaDoAno(hoje)
  const doAno = notas.filter((n) => anoDe(n.emissao) === ano && chaveDiaDoAno(n.emissao) <= corte)
  const doAnoAnterior = notas.filter((n) => anoDe(n.emissao) === ano - 1 && chaveDiaDoAno(n.emissao) <= corte)

  const porCodigo = new Map<number, { nome: string; toneladas: number; reais: number }>()
  for (const n of doAno) {
    const atual = porCodigo.get(n.vendedorCodigo) ?? { nome: n.vendedorNome, toneladas: 0, reais: 0 }
    if (n.un === 'KG') atual.toneladas += n.pesoLiquidoKg / 1000
    atual.reais += n.valorLiquido
    porCodigo.set(n.vendedorCodigo, atual)
  }

  const anteriorPorCodigo = new Map<number, { toneladas: number; reais: number }>()
  for (const n of doAnoAnterior) {
    const atual = anteriorPorCodigo.get(n.vendedorCodigo) ?? { toneladas: 0, reais: 0 }
    if (n.un === 'KG') atual.toneladas += n.pesoLiquidoKg / 1000
    atual.reais += n.valorLiquido
    anteriorPorCodigo.set(n.vendedorCodigo, atual)
  }

  const totalReaisEmpresa = doAno.reduce((s, n) => s + n.valorLiquido, 0)

  return [...porCodigo.entries()]
    .filter(([codigo]) => !codigosAgregados.has(codigo))
    .map(([codigo, c]) => {
      const anterior = anteriorPorCodigo.get(codigo) ?? { toneladas: 0, reais: 0 }
      return {
        codigo,
        nome: c.nome,
        toneladas: c.toneladas,
        reais: c.reais,
        toneladasAnoAnterior: anterior.toneladas,
        reaisAnoAnterior: anterior.reais,
        participacaoPct: totalReaisEmpresa > 0 ? (c.reais / totalReaisEmpresa) * 100 : 0,
      }
    })
    .sort((a, b) => b.reais - a.reais)
}

/** Deriva o mapa código→praça do próprio `listarRanking(ano)` que a tela já busca -- sem query nova. */
export function mapaPracaPorCodigo(ranking: RankingEntry[]): Map<number, string | null> {
  return new Map(ranking.map((r) => [r.codigo, r.localizacao]))
}

/** Códigos "catch-all" (Fertiflora, Outros) que não devem competir no comparativo entre vendedores. */
export function codigosAgregados(ranking: RankingEntry[]): Set<number> {
  return new Set(ranking.filter((r) => r.agregado).map((r) => r.codigo))
}

function agruparNotas(notas: NotaFiscalRow[], ano: number, chaveDe: (n: NotaFiscalRow) => string): PracaResumo[] {
  const doAno = notas.filter((n) => anoDe(n.emissao) === ano)
  const porChave = new Map<string, { toneladas: number; reais: number; vendedores: Set<number> }>()

  for (const n of doAno) {
    const chave = chaveDe(n)
    const atual = porChave.get(chave) ?? { toneladas: 0, reais: 0, vendedores: new Set<number>() }
    if (n.un === 'KG') atual.toneladas += n.pesoLiquidoKg / 1000
    atual.reais += n.valorLiquido
    atual.vendedores.add(n.vendedorCodigo)
    porChave.set(chave, atual)
  }

  return [...porChave.entries()]
    .map(([chave, v]) => ({ chave, toneladas: v.toneladas, reais: v.reais, vendedores: v.vendedores.size }))
    .sort((a, b) => b.reais - a.reais)
}

/**
 * Faturamento por praça/região -- a praça não está em `notas_fiscais_importadas`, então
 * usa o mapa código→praça (de `mapaPracaPorCodigo`). Códigos sem `vendedores_comerciais`
 * correspondente ou sem o campo preenchido caem em "Sem praça definida" (bucket explícito,
 * não escondido -- é texto livre auto-preenchido por cada vendedor no próprio perfil).
 */
export function calcularPorPraca(notas: NotaFiscalRow[], mapaCodigoPraca: Map<number, string | null>, ano: number): PracaResumo[] {
  return agruparNotas(notas, ano, (n) => mapaCodigoPraca.get(n.vendedorCodigo) || 'Sem praça definida')
}

/** Bônus: município já vem em 100% das notas fiscais, sem depender de vendedores_comerciais -- cobertura completa. */
export function calcularPorMunicipio(notas: NotaFiscalRow[], ano: number): PracaResumo[] {
  return agruparNotas(notas, ano, (n) => n.municipio || 'Sem município informado')
}
