import type { Page } from "playwright-core";
import type { PayloadDetectar, PayloadPosicionar, ResultadoDetectar, ResultadoPosicionar } from "../../src/lib/automacao";
import { executarDetectar } from "./detectar";
import { abrirNavegador, fecharNavegador, navegadorAberto, paginaAtiva } from "./navegador";
import { executarPosicionar } from "./posicionar";

export type ResultadoComando =
  | { ok: true; resultado: ResultadoDetectar }
  | { ok: true; resultado: ResultadoPosicionar }
  | { ok: true; resultado: null }
  | { ok: false; erro: string };

/** Executa um comando da fila e devolve o que reportar à aplicação. */
export async function executarComando(
  tipo: string,
  payload: PayloadDetectar | PayloadPosicionar | null,
): Promise<ResultadoComando> {
  switch (tipo) {
    case "CONECTAR": {
      const pagina = await abrirNavegador();
      await pagina.bringToFront();
      return { ok: true, resultado: null };
    }
    case "DETECTAR": {
      const pagina = await paginaDoComando();
      const resultado = await executarDetectar(pagina, (payload ?? {}) as PayloadDetectar);
      return { ok: true, resultado };
    }
    case "POSICIONAR": {
      const pagina = await paginaDoComando();
      if (!payload || !("posicoes" in payload)) {
        return { ok: false, erro: "Payload de posicionamento ausente." };
      }
      const resultado = await executarPosicionar(pagina, payload as PayloadPosicionar);
      if (resultado.falhas.length > 0 && resultado.falhas.length === resultado.total) {
        return {
          ok: false,
          erro: resultado.falhas.map((f) => `${f.nome}/${f.campo}: ${f.erro}`).join("; "),
        };
      }
      return { ok: true, resultado };
    }
    case "FECHAR":
      await fecharNavegador();
      return { ok: true, resultado: null };
    default:
      return { ok: false, erro: `Tipo de comando desconhecido: ${tipo}` };
  }
}

async function paginaDoComando(): Promise<Page> {
  if (!navegadorAberto()) await abrirNavegador();
  const pagina = await paginaAtiva();
  if (!pagina) throw new Error("O Chrome abriu, mas não há nenhuma aba.");
  await pagina.bringToFront();
  return pagina;
}