interface FuncaoDebounced<Args extends unknown[]> {
  (...args: Args): void
  /** Cancela um disparo já agendado -- chamar no cleanup de quem assinou, senão o timer dispara depois do unmount. */
  cancel(): void
}

/** Espera `delayMs` sem nova chamada antes de executar `fn` -- cada chamada reinicia o timer. */
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number): FuncaoDebounced<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const disparar = (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delayMs)
  }
  disparar.cancel = () => {
    if (timer) clearTimeout(timer)
  }
  return disparar
}
