import type { Page } from "playwright-core";

import {
  encontrarNome,
  pontoDeSoltura,
  type CampoAutomacao,
  type PayloadDetectar,
  type ResultadoDetectar,
} from "../../src/lib/automacao";
import {
  dimensoesDasPaginas,
  estamosNoEditorDePosicionamento,
  lerCamadaDeTexto,
  listarSignatarios,
  seletorDaPagina,
} from "./autentique";
import { reconhecerPorOcr } from "./ocr";

/**
 * DETECTAR: lê os signatários da paleta do editor, acha cada nome no texto do
 * documento (camada de texto, ou OCR como fallback) e devolve os pontos para
 * assinatura e data de cada um.
 */
export async function executarDetectar(
  pagina: Page,
  payload: PayloadDetectar,
): Promise<ResultadoDetectar> {
  if (!(await estamosNoEditorDePosicionamento(pagina))) {
    throw new Error(
      "A aba aberta não parece ser o editor de posicionamento do Autentique. " +
        "Abra um documento e entre em 'Posicione as assinaturas' antes de detectar.",
    );
  }

  const paginaElemento = await seletorDaPagina(pagina);
  if (!paginaElemento) throw new Error("Não encontrei as páginas do documento na tela.");

  const dimensoes = await dimensoesDasPaginas(pagina, paginaElemento);
  if (dimensoes.length === 0) throw new Error("Não consegui medir as páginas do documento.");

  const avisos: string[] = [];
  let linhas = await lerCamadaDeTexto(pagina, paginaElemento);
  if (linhas.length === 0) {
    linhas = await reconhecerPorOcr(pagina, paginaElemento, dimensoes);
    avisos.push("Documento não expôs camada de texto; usei OCR.");
  }

  const signatarios = await listarSignatarios(pagina);
  const posicoes: ResultadoDetectar["posicoes"] = [];

  for (const nome of signatarios) {
    const achado = encontrarNome(linhas, nome);
    if (!achado) {
      avisos.push(`Não achei "${nome}" no texto do documento.`);
      continue;
    }
    const paginaNo = achado.linha.pagina;
    const dimensao = dimensoes[paginaNo - 1];
    if (!dimensao) {
      avisos.push(`"${nome}" caiu numa página fora do esperado.`);
      continue;
    }
    for (const campo of ["ASSINATURA", "DATA"] as CampoAutomacao[]) {
      const deslocamento = campo === "ASSINATURA" ? payload.assinatura : payload.data;
      const ponto = pontoDeSoltura(achado.linha, dimensao, campo, deslocamento);
      posicoes.push({
        nome,
        campo,
        pagina: ponto.pagina,
        xPct: ponto.xPct,
        yPct: ponto.yPct,
        fonte: "TEXTO",
        confianca: achado.confianca,
      });
    }
  }

  return { posicoes, signatarios, avisos };
}