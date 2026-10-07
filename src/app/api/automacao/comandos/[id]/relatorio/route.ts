import { z } from "zod";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { automacaoComando } from "@/db/schema";
import { concluirComando, falharComando, substituirPosicoes } from "@/db/repositorio";
import { resultadoDetectarSchema, resultadoPosicionarSchema } from "@/lib/automacao";
import { comTokenValido, parseJson, semToken } from "../../../autorizacao";

export const dynamic = "force-dynamic";

const relatorioSchema = z
  .object({
    status: z.enum(["CONCLUIDO", "FALHOU"]),
    erro: z.string().optional(),
    resultado: z.unknown().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "CONCLUIDO" && val.erro) {
      ctx.addIssue({ code: "custom", message: "Concluído não leva erro." });
    }
    if (val.status === "FALHOU" && !val.erro) {
      ctx.addIssue({ code: "custom", message: "Falhou sem informar erro." });
    }
  });

/**
 * O agente entrega o resultado de um comando. Se o DETECTAR concluiu, o
 * resultado vira a tabela de revisão da UI.
 */
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/automacao/comandos/[id]/relatorio">,
) {
  if (!comTokenValido(req)) return semToken();

  const { id } = await ctx.params;
  const corpo = relatorioSchema.safeParse(await req.json());
  if (!corpo.success) {
    return Response.json(
      { erro: corpo.error.issues[0]?.message ?? "Relatório inválido." },
      { status: 400 },
    );
  }

  const idComando = Number(id);
  if (!Number.isInteger(idComando)) {
    return Response.json({ erro: "Comando inválido." }, { status: 400 });
  }

  const db = getDb();
  const [comando] = await db
    .select()
    .from(automacaoComando)
    .where(eq(automacaoComando.id, idComando));
  if (!comando) return Response.json({ erro: "Comando não encontrado." }, { status: 404 });

  const relatorio = corpo.data;
  if (relatorio.status === "FALHOU") {
    await falharComando(idComando, relatorio.erro!);
    return Response.json({ ok: true });
  }

  const resultado = JSON.stringify(relatorio.resultado ?? null);
  let erro = "";
  if (comando.tipo === "DETECTAR") {
    const valido = resultadoDetectarSchema.safeParse(relatorio.resultado);
    if (!valido.success) {
      erro = valido.error.issues[0]?.message ?? "Detecção com formato inesperado.";
    } else {
      await substituirPosicoes(
        valido.data.posicoes.map((p, ordem) => ({
          nome: p.nome,
          campo: p.campo,
          pagina: p.pagina,
          xPct: String(p.xPct),
          yPct: String(p.yPct),
          fonte: p.fonte,
          confianca: p.confianca === null ? null : String(p.confianca),
          ordem,
        })),
      );
    }
  } else if (comando.tipo === "POSICIONAR") {
    const valido = resultadoPosicionarSchema.safeParse(relatorio.resultado);
    if (!valido.success) {
      erro = valido.error.issues[0]?.message ?? "Resultado de posicionamento com formato inesperado.";
    }
  }

  if (erro) {
    await falharComando(idComando, erro);
    return Response.json({ ok: false, erro }, { status: 422 });
  }

  await concluirComando(idComando, parseJson(resultado) ?? null);
  return Response.json({ ok: true });
}