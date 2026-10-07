import type { ComandoRetomado } from "./tipos";

const URL_BASE = process.env.DELTA_URL ?? "http://localhost:3000";
const TOKEN = process.env.AUTOMACAO_TOKEN ?? null;

function cabecalhos(): HeadersInit {
  const base: HeadersInit = { "content-type": "application/json" };
  if (TOKEN) base.authorization = `Bearer ${TOKEN}`;
  return base;
}

async function jsonOrThrow(resposta: Response): Promise<unknown> {
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`HTTP ${resposta.status} ${corpo.slice(0, 300)}`);
  }
  return resposta.json();
}

export async function retirarComando(): Promise<ComandoRetomado | null> {
  const resposta = await fetch(`${URL_BASE}/api/automacao/comandos/retirar`, {
    method: "POST",
    headers: cabecalhos(),
  });
  const corpo = (await jsonOrThrow(resposta)) as { comando: ComandoRetomado | null };
  return corpo.comando;
}

export async function reportarComando(
  id: number,
  relatorio: { status: "CONCLUIDO" | "FALHOU"; erro?: string; resultado?: unknown },
): Promise<void> {
  await fetch(`${URL_BASE}/api/automacao/comandos/${id}/relatorio`, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify(relatorio),
  });
}

export async function baterAgente(urlAtual: string | null, navegadorAberto: boolean): Promise<void> {
  try {
    await fetch(`${URL_BASE}/api/automacao/status`, {
      method: "POST",
      headers: cabecalhos(),
      body: JSON.stringify({ urlAtual, navegadorAberto }),
    });
  } catch {
    // Heartbeat não pode derrubar o loop do agente.
  }
}