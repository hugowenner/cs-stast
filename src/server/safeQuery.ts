/**
 * Server Components chamam os Services diretamente (sem round-trip HTTP). Enquanto o
 * Postgres local não estiver disponível (Docker ainda não instalado — ver INSTALL.md),
 * qualquer query falha com erro de conexão; isso envolve essas chamadas para degradar
 * para um valor vazio em vez de derrubar a página inteira.
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(
      "[db] query falhou, usando fallback:",
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}
