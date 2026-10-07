import type { Page } from "playwright-core";

import type { PayloadPosicionar, ResultadoPosicionar } from "../../src/lib/automacao";
import {
  arrastarCampo,
  centroDoCampo,
  estamosNoEditorDePosicionamento,
  localizarCampoDaPaleta,
  pontoNaPagina,
  seletorDaPagina,
} from "./autentique";

/**
 * POSICIONAR: para cada posição da lista, pega o campo correspondente na
 * paleta do Autentique e o arrasta até o ponto indicado na página.
 */
export async function executarPosicionar(
  pagina: Page,
  payload: PayloadPosicionar,
): Promise<ResultadoPosicionar> {
  if (!(await estamosNoEditorDePosicionamento(pagina))) {
    throw new Error("A aba aberta não é o editor de posicionamento do Autentique.");
  }

  const paginaElemento = await seletorDaPagina(pagina);
  if (!paginaElemento) throw new Error("Não encontrei as páginas do documento na tela.");

  const falhas: ResultadoPosicionar["falhas"] = [];
  let feitos = 0;

  for (const posicao of payload.posicoes) {
    try {
      const campo = await localizarCampoDaPaleta(pagina, posicao.nome);
      if (!campo) {
        falhas.push({
          nome: posicao.nome,
          campo: posicao.campo,
          erro: "Não achei o campo na paleta lateral.",
        });
        continue;
      }

      const origem = await centroDoCampo(pagina, campo);
      const alvo = await pontoNaPagina(
        pagina,
        paginaElemento,
        posicao.pagina - 1,
        posicao.xPct,
        posicao.yPct,
      );
      await arrastarCampo(pagina, origem, alvo);
      feitos++;
    } catch (erro) {
      falhas.push({
        nome: posicao.nome,
        campo: posicao.campo,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  return { total: payload.posicoes.length, feitos, falhas };
}