/** Checagem de token compartilhada entre as rotas da automação. */
export function comTokenValido(req: Request): boolean {
  const esperado = process.env.AUTOMACAO_TOKEN;
  if (!esperado) return true;
  return req.headers.get("authorization") === `Bearer ${esperado}`;
}

export function semToken(): Response {
  return Response.json({ erro: "Token inválido." }, { status: 401 });
}

/** As colunas payload/resultado são texto com JSON guardado dentro. */
export function parseJson<T>(valor: string | null): T | null {
  if (!valor) return null;
  try {
    return JSON.parse(valor) as T;
  } catch {
    return null;
  }
}
