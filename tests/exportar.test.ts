import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { definirOcupante } from "@/db/repositorio";
import { POSTOS_PADRAO } from "@/lib/dominio";
import { GET } from "../src/app/escala/[ano]/[mes]/exportar/route";
import { criarBancoDeTeste, preencherMes, semearQuadro, type BancoDeTeste } from "./helpers/banco";

let banco: BancoDeTeste;
let ids: Map<string, number>;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  ids = await semearQuadro(banco.db);
});

afterAll(async () => {
  await banco.cliente.close();
});

function baixar(ano: number, mes: number) {
  return GET(
    new Request(`http://localhost/escala/${ano}/${String(mes).padStart(2, "0")}/exportar`),
    {
      params: Promise.resolve({ ano: String(ano), mes: String(mes) }),
    } as unknown as RouteContext<"/escala/[ano]/[mes]/exportar">,
  );
}

async function csvDe(ano: number, mes: number) {
  const resposta = await baixar(ano, mes);
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  // `ignoreBOM: true` mantém o BOM no texto, senão o TextDecoder joga fora.
  const texto = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
  return {
    resposta,
    bytes,
    texto,
    linhas: texto.replace("\uFEFF", "").trim().split("\r\n"),
  };
}

describe("exportação da escala", () => {
  it("devolve o mês como CSV para baixar", async () => {
    await preencherMes({ ano: 2026, mes: 1 }, ids, "AUTO");

    const { resposta, bytes, texto, linhas } = await csvDe(2026, 1);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(resposta.headers.get("content-disposition")).toBe(
      'attachment; filename="escala-2026-01.csv"',
    );
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(texto.startsWith("\uFEFF")).toBe(true);
    expect(linhas[0]).toBe("Vaga;Unidade;Posto;Bombeiro;Função;Origem;Central de comunicação");
    expect(linhas).toHaveLength(POSTOS_PADRAO.length + 1);
    expect(linhas.every((linha) => linha.split(";").length === 7)).toBe(true);
  });

  it("lista as 10 vagas com nome, função e central de comunicação", async () => {
    const { linhas } = await csvDe(2026, 1);

    expect(linhas).toContain("F3-MC;Viatura F3;MC;Diego Ramos;MC;rodízio;não");
    expect(linhas).toContain("F3-BA2;Viatura F3;BA 2;Hugo Alves;BA;rodízio;sim");
    expect(linhas).toContain("CRS-MC;Viatura CRS;MC;Elisa Prado;MC;rodízio;não");
  });

  it("distingue a vaga preenchida à mão e a vaga vazia", async () => {
    const fev = { ano: 2026, mes: 2 };
    await preencherMes(fev, ids, "AUTO");
    await definirOcupante(fev, "F2-MC", null, "AUTO");
    await definirOcupante(fev, "CRS-MC", ids.get("Carla Souza")!, "MANUAL");

    const { linhas } = await csvDe(fev.ano, fev.mes);

    expect(linhas.filter((linha) => linha.includes(";manual;"))).toEqual([
      "CRS-MC;Viatura CRS;MC;Carla Souza;MC;manual;não",
    ]);
    expect(linhas).toContain("F2-MC;Viatura F2;MC;;;rodízio;não");
  });

  it("recusa mês que ainda não existe", async () => {
    await expect(baixar(2027, 7)).rejects.toThrow(/404/);
  });

  it("recusa mês fora do calendário", async () => {
    await expect(baixar(2026, 13)).rejects.toThrow(/404/);
  });
});
