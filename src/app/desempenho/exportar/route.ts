import { gestaoLiberada } from "@/lib/acesso-gestao";
import { lerCiclo, listarAvaliados } from "@/db/desempenho";
import { preenchidas } from "@/lib/desempenho";
import { BLOCOS_PLANILHA, gerarPlanilhaDesempenho } from "@/lib/planilha-desempenho";

export const dynamic = "force-dynamic";

/**
 * Baixa a planilha original da empresa preenchida com as avaliações da Delta
 * no ciclo (só quem tem nota), em ordem alfabética.
 */
export async function GET(req: Request) {
  if (!(await gestaoLiberada())) {
    return new Response("Entre na Gestão para baixar a planilha.", { status: 401 });
  }
  const ciclo = lerCiclo(new URL(req.url).searchParams.get("ciclo"));
  const membros = (await listarAvaliados(ciclo)).filter((m) => preenchidas(m.notas) > 0);

  let arquivo: Buffer;
  try {
    arquivo = gerarPlanilhaDesempenho(
      membros.slice(0, BLOCOS_PLANILHA).map((m) => ({ nome: m.pessoa.nome, notas: m.notas })),
    );
  } catch (erro) {
    return new Response(erro instanceof Error ? erro.message : "Falha ao gerar a planilha.", { status: 500 });
  }

  const nome = `Avaliação de Desempenho ${ciclo} - Equipe Delta.xlsx`;
  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Avaliacao de Desempenho ${ciclo} - Equipe Delta.xlsx"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "no-store",
    },
  });
}
