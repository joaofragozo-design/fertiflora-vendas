const TAMANHO_PAGINA = 1000

/**
 * O PostgREST corta em 1000 linhas por padrão — sem paginar, tabelas com
 * mais de 1000 linhas perdem dados silenciosamente (já causou um vendedor
 * inteiro sumir de uma lista). Busca todas as páginas até vir uma incompleta.
 */
export async function buscarTodasAsPaginas<T>(
  montarConsulta: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const todas: T[] = []
  for (let pagina = 0; ; pagina++) {
    const from = pagina * TAMANHO_PAGINA
    const { data, error } = await montarConsulta(from, from + TAMANHO_PAGINA - 1)
    if (error) throw new Error(error.message)
    todas.push(...(data ?? []))
    if (!data || data.length < TAMANHO_PAGINA) break
  }
  return todas
}
