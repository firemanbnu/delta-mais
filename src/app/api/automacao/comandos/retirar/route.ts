import { retirarProximoComando } from "@/db/repositorio";
import { comTokenValido, parseJson, semToken } from "../../autorizacao";
import type { AutomacaoComando } from "@/db/schema";

export const dynamic = "force-dynamic";

type ComandoRetornado = Pick<AutomacaoComando, "id" | "tipo" | "status"> & {
  payload: unknown;
};

/** O agente retoma o próximo comando pendente (marca como EXECUTANDO). */
export async function POST(req: Request) {
  if (!comTokenValido(req)) return semToken();

  const comando = await retirarProximoComando();
  if (!comando) return Response.json({ comando: null });

  const retornado: ComandoRetornado = {
    id: comando.id,
    tipo: comando.tipo,
    status: comando.status,
    payload: parseJson(comando.payload),
  };
  return Response.json({ comando: retornado });
}