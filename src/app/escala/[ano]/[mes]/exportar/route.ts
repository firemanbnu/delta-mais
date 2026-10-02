import { notFound } from "next/navigation";

import { montarEscala, semearPostos } from "@/db/repositorio";
import { montarCsv } from "@/lib/csv";
import { ROTULO_UNIDADE } from "@/lib/dominio";

export const dynamic = "force-dynamic";

/** Baixa a escala do mês em CSV, para conference no Excel ou na planilha da unidade. */
export async function GET(_req: Request, ctx: RouteContext<"/escala/[ano]/[mes]/exportar">) {
  const { ano, mes } = await ctx.params;
  const anoNum = Number(ano);
  const mesNum = Number(mes);

  if (!Number.isInteger(anoNum) || !Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
    notFound();
  }

  await semearPostos();
  const escala = await montarEscala({ ano: anoNum, mes: mesNum });
  if (!escala) notFound();

  const pessoas = new Map(escala.pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const linhas = escala.postos.map((posto) => {
    const pessoaId = escala.estado[posto.codigo];
    const pessoa = pessoaId ? pessoas.get(pessoaId) : undefined;
    return [
      posto.codigo,
      ROTULO_UNIDADE[posto.unidade],
      posto.rotulo,
      pessoa?.nome ?? "",
      pessoa?.funcao ?? "",
      escala.origens[posto.codigo] === "MANUAL" ? "manual" : "rodízio",
      posto.comunicacao ? "sim" : "não",
    ];
  });

  const csv = montarCsv(
    ["Vaga", "Unidade", "Posto", "Bombeiro", "Função", "Origem", "Central de comunicação"],
    linhas,
  );

  const mesArquivo = `${anoNum}-${String(mesNum).padStart(2, "0")}`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="escala-${mesArquivo}.csv"`,
      "cache-control": "no-store",
    },
  });
}