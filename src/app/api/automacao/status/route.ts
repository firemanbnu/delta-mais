import { lerAgente, sinalizarAgente } from "@/db/repositorio";
import { comTokenValido, semToken } from "../autorizacao";

export const dynamic = "force-dynamic";

/** Estado do agente para a UI de /assinaturas (polling). */
export async function GET() {
  const agente = await lerAgente();
  const online = agente ? Date.now() - new Date(agente.batidoEm).getTime() < 15_000 : false;
  return Response.json({ agente, online });
}

/** Heartbeat do agente local. */
export async function POST(req: Request) {
  if (!comTokenValido(req)) return semToken();

  const corpo = await req.json().catch(() => null);
  const urlAtual = typeof corpo?.urlAtual === "string" ? corpo.urlAtual : null;
  const navegadorAberto = Boolean(corpo?.navegadorAberto);
  await sinalizarAgente(urlAtual, navegadorAberto);
  return Response.json({ ok: true });
}