/**
 * Som de notificação sintetizado via Web Audio API -- sem depender de um arquivo de
 * áudio externo. Dois tons curtos e ascendentes (acorde tipo "ding-ding").
 */

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
