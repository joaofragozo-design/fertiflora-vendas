/**
 * Ciclo agrícola da Fertiflora: safra (30/05–30/10, carregamento) e safrinha (31/10–29/05,
 * incluindo a janela de definição de volume). Datas comparadas como string 'MM-DD'
 * (lexicograficamente equivalente à ordem do calendário dentro de um mesmo ano), mesmo padrão
 * de `corteDiaDoAno`/`chaveDiaDoAno` em `clientes-bi/calculos.ts` -- sem dependência nova.
 *
 * A janela de definição (30/04–30/05, quando o comitê decide o limite do próximo ciclo) é um
 * conceito de processo, avaliado à parte de `periodoDe` -- não faz sentido tentar encaixar os
 * dois numa partição única sem sobreposição: no dia 30/04 a empresa ainda está tecnicamente na
 * safrinha (que só "fecha os livros" em 29/05, ver abaixo) E já é o primeiro dia da janela.
 */

export type TipoPeriodo = 'safra' | 'safrinha'

export interface PeriodoSafra {
  tipo: TipoPeriodo
  /** Ano-safra: pra safra, é o próprio ano civil de 30/05; pra safrinha, é o ano civil em que ela
   *  começou (nov/dez) -- uma safrinha que atravessa jan-mai do ano seguinte continua com o
   *  mesmo `anoSafra` do novembro em que começou. Ex.: 15/01/2027 → `safrinha-2026`. */
  anoSafra: number
  chave: string // 'safra-2026' | 'safrinha-2026'
  inicio: string // yyyy-mm-dd
  fim: string // yyyy-mm-dd
}

const SAFRA_INICIO_MMDD = '05-30'
const SAFRA_FIM_MMDD = '10-30'
const JANELA_INICIO_MMDD = '04-30'
const JANELA_FIM_MMDD = '05-30'

function paraIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mmdd(dataIso: string): string {
  return dataIso.slice(5, 10)
}

/**
 * Classifica uma data (yyyy-mm-dd) em safra ou safrinha. Não há sobreposição nem lacuna: safra
 * cobre 30/05–30/10; safrinha cobre o resto do calendário (31/10 de um ano até 29/05 do ano
 * seguinte) -- a safrinha "engole" a janela de definição pra fins de classificação de período,
 * já que ela é a continuação natural do ciclo anterior até a nova safra começar.
 */
export function periodoDe(dataIso: string): PeriodoSafra {
  const md = mmdd(dataIso)
  const anoCalendario = Number(dataIso.slice(0, 4))

  if (md >= SAFRA_INICIO_MMDD && md <= SAFRA_FIM_MMDD) {
    return { tipo: 'safra', anoSafra: anoCalendario, chave: `safra-${anoCalendario}`, inicio: `${anoCalendario}-05-30`, fim: `${anoCalendario}-10-30` }
  }

  // nov-dez pertence à safrinha que COMEÇOU nesse mesmo ano civil; jan-mai pertence à safrinha
  // que começou no ano civil anterior (ex.: 15/01/2027 é ainda a "safrinha-2026").
  const anoSafra = md > SAFRA_FIM_MMDD ? anoCalendario : anoCalendario - 1
  return { tipo: 'safrinha', anoSafra, chave: `safrinha-${anoSafra}`, inicio: `${anoSafra}-10-31`, fim: `${anoSafra + 1}-05-29` }
}

export function chavePeriodoAtual(hoje: Date): string {
  return periodoDe(paraIso(hoje)).chave
}

/** Janela em que o comitê define o limite/reserva do próximo ciclo (30/04 a 30/05, inclusive). */
export function estaNaJanelaDeDefinicao(hoje: Date): boolean {
  const md = mmdd(paraIso(hoje))
  return md >= JANELA_INICIO_MMDD && md <= JANELA_FIM_MMDD
}

/** A janela sempre define o limite da PRÓXIMA safra (que começa 30/05 do mesmo ano civil da janela). */
export function periodoQueAJanelaDefine(hoje: Date): PeriodoSafra {
  const ano = hoje.getFullYear()
  return { tipo: 'safra', anoSafra: ano, chave: `safra-${ano}`, inicio: `${ano}-05-30`, fim: `${ano}-10-30` }
}
