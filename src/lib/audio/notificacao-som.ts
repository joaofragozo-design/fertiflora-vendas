/**
 * Som de notificação sintetizado via Web Audio API -- sem depender de um arquivo de
 * áudio externo. Dois tons curtos e ascendentes (acorde tipo "ding-ding").
 */

const CHAVE_PREFERENCIA_SOM = 'ff:notificacoes:som'

/** Preferência do usuário p/ som de notificação -- persistida no dispositivo, ligada por padrão. */
export function somNotificacaoAtivado(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(CHAVE_PREFERENCIA_SOM) !== 'off'
}

export function definirSomNotificacao(ativado: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CHAVE_PREFERENCIA_SOM, ativado ? 'on' : 'off')
}

let audioCtx: AudioContext | null = null

function obterAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  return audioCtx
}

/** Chama no primeiro toque/clique da sessão -- navegadores só liberam áudio depois de uma interação do usuário. */
export function destravarAudioNotificacao() {
  const ctx = obterAudioContext()
  if (ctx?.state === 'suspended') void ctx.resume()
}

function tocarTom(ctx: AudioContext, frequencia: number, inicioEm: number, duracao: number, volume: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequencia
  osc.connect(gain)
  gain.connect(ctx.destination)

  const t0 = ctx.currentTime + inicioEm
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao)

  osc.start(t0)
  osc.stop(t0 + duracao)
}

export function tocarSomNotificacao() {
  try {
    const ctx = obterAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    tocarTom(ctx, 880, 0, 0.15, 0.2)
    tocarTom(ctx, 1318.51, 0.1, 0.25, 0.2)
  } catch {
    // Web Audio indisponível/bloqueado -- não pode quebrar o resto da notificação (toast/tremor).
  }
}

/** Som distinto pra mensagem de chat (DM/aviso) -- dois toques graves e rápidos, contorno
 *  DESCENDENTE (D5 -> C5), o oposto do chime ascendente de recompensa acima (A5 -> E6), pra
 *  nunca confundir "alguém te mandou mensagem" com "você ganhou uma recompensa" de ouvido. */
export function tocarSomMensagem() {
  try {
    const ctx = obterAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    tocarTom(ctx, 587.33, 0, 0.09, 0.22)
    tocarTom(ctx, 523.25, 0.11, 0.12, 0.22)
  } catch {
    // Web Audio indisponível/bloqueado -- não pode quebrar o resto da notificação (toast).
  }
}
