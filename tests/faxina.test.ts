import { describe, expect, it } from "vitest";

import { mesmoNome } from "@/lib/cobertura";
import { montarFaxina } from "@/lib/faxina";

function porLocal(celulas: ReturnType<typeof montarFaxina>) {
  return Object.fromEntries(celulas.map((c) => [c.local.id, c.cobertura?.nome ?? c.nome]));
}

describe("escala de faxina", () => {
  it("reproduz a escala de outubro de 2026", () => {
    expect(porLocal(montarFaxina({ ano: 2026, mes: 10 }))).toEqual({
      cozinha: "ATAIDE",
      comunicacao: "CATIA",
      vestiario: "MASSEN",
      corredores: "SERRA",
      garagem: "FERNANDO",
      auditorio: "DOUGLAS",
      alojamento: "MONTANARO",
      "wc-terreo": "VANZELLA",
      lideranca: "ALEXANDRE",
      lixo: "ADALTO",
    });
  });

  it("gira uma posição por mês e mantém os fixos", () => {
    const novembro = porLocal(montarFaxina({ ano: 2026, mes: 11 }));
    expect(novembro.corredores).toBe("MASSEN");
    expect(novembro.garagem).toBe("SERRA");
    expect(novembro.vestiario).toBe("VANZELLA");
    expect(novembro.cozinha).toBe("ATAIDE");
    expect(novembro.lixo).toBe("ADALTO");
  });

  it("volta à posição de partida depois de seis meses, também para trás", () => {
    expect(porLocal(montarFaxina({ ano: 2027, mes: 4 }))).toEqual(
      porLocal(montarFaxina({ ano: 2026, mes: 10 })),
    );
    expect(porLocal(montarFaxina({ ano: 2026, mes: 9 })).vestiario).toBe("SERRA");
  });

  it("põe o ferista no lugar de quem está de férias", () => {
    const celulas = montarFaxina(
      { ano: 2026, mes: 10 },
      [{ ausenciaId: "1", pessoaId: "7", ferista: "Pedro", cobreFuncaoId: "8" }],
      new Map([["7", "Marcos Vanzella"]]),
    );
    const terreo = celulas.find((c) => c.local.id === "wc-terreo");

    expect(terreo?.nome).toBe("VANZELLA");
    expect(terreo?.cobertura?.nome).toBe("Pedro");
    expect(celulas.filter((c) => c.cobertura)).toHaveLength(1);
  });
});

describe("comparação de nomes", () => {
  it("ignora acento e maiúscula e aceita o nome curto dentro do completo", () => {
    expect(mesmoNome("Catia", "CÁTIA")).toBe(true);
    expect(mesmoNome("Vanzella", "Marcos Vanzella")).toBe(true);
    expect(mesmoNome("Serra", "Serrano")).toBe(false);
  });
});
