/** Paleta e faixas de mundo compartilhadas por todas as camadas da cena. */
export const CORES = {
  granuloA: '#d9a066',
  granuloB: '#18a558',
  granuloC: '#f5d97a',
  solo: '#12241a',
  soloClaro: '#1c3327',
  pulso: '#18a558',
  raiz: '#3e6b4a',
  broto: '#5cc78a',
} as const

/** Faixa Y onde o "solo" vive — as partículas caem até essa linha e somem. */
export const LINHA_SOLO = -3.2
export const TOPO_QUEDA = 6.5
export const LARGURA_MUNDO = 11
