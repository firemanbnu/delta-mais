import { gestaoLiberada } from "@/lib/acesso-gestao";
import { lerCiclo, listarAvaliados } from "@/db/desempenho";
import { respostasColegas } from "@/db/desempenho-pares";
import { lerVisao, notasInteiras, notasNaVisao, preenchidas } from "@/lib/desempenho";
import { BLOCOS_PLANILHA, gerarPlanilhaDesempenho } from "@/lib/planilha-desempenho";

export const dynamic = "force-dynamic";

/**
 * Baixa a planilha original da empresa preenchida com as avaliações da Delta
 * no ciclo (só quem tem nota), em ordem alfabética. Por padrão vão as notas do
 * chefe de equipe; com ?visao=combinada ou colegas, a média arredondada.
 */
export async function GET(req: Request) {
  if (!(await gestaoLiberada())) {
    return new Response("Entre na Gestão para baixar a planilha.", { status: 401 });
  }
  const parametros = new URL(req.url).searchParams;
  const ciclo = lerCiclo(parametros.get("ciclo"));
  const visao = lerVisao(parametros.get("visao"));
  const respostas = visao === "minha" ? new Map() : await respostasColegas(ciclo);
  const membros = (await listarAvaliados(ciclo))
    .map((m) => ({
      nome: m.pessoa.nome,
      notas: notasInteiras(notasNaVisao(m.notas, respostas.get(m.pessoa.id) ?? [], visao)),
    }))
    .filter((m) => preenchidas(m.notas) > 0);

  let arquivo: Buffer;
  try {
    arquivo = gerarPlanilhaDesempenho(membros.slice(0, BLOCOS_PLANILHA));
  } catch (erro) {
    return new Response(erro instanceof Error ? erro.message : "Falha ao gerar a planilha.", { status: 500 });
  }

  const sufixo = visao === "minha" ? "" : visao === "colegas" ? " (média dos colegas)" : " (combinada)";
  const nome = `Avaliação de Desempenho ${ciclo} - Equipe Delta${sufixo}.xlsx`;
  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Avaliacao de Desempenho ${ciclo} - Equipe Delta.xlsx"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "no-store",
    },
  });
}
