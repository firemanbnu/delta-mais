import { describe, expect, it } from "vitest";

import { montarAbastecimento } from "@/lib/abastecimento";

function porLocal(anoMes: { ano: number; mes: number }) {
  return Object.fromEntries(
    montarAbastecimento(anoMes).map((c) => [c.local.id, c.cobertura?.nome ?? c.nome]),
  );
}

describe("escala de abastecimento", () => {
  it("começa em novembro de 2026 com Fernando no EPRA e Serra no RTI", () => {
    expect(porLocal({ ano: 2026, mes: 11 })).toEqual({ epra: "FERNANDO", rti: "SERRA" });
  });

  it("segue a ordem de cada lista, um nome por mês", () => {
    const meses = [
      { ano: 2026, mes: 11 },
      { ano: 2026, mes: 12 },
      { ano: 2027, mes: 1 },
      { ano: 2027, mes: 2 },
      { ano: 2027, mes: 3 },
    ];
    expect(meses.map((m) => porLocal(m).epra)).toEqual([
      "FERNANDO",
      "MASSEN",
      "MONTANARO",
      "SERRA",
      "CATIA",
    ]);
    expect(meses.map((m) => porLocal(m).rti)).toEqual([
      "SERRA",
      "MONTANARO",
      "MASSEN",
      "CATIA",
      "FERNANDO",
    ]);
  });

  it("repete o ciclo depois de cinco meses", () => {
    expect(porLocal({ ano: 2027, mes: 4 })).toEqual(porLocal({ ano: 2026, mes: 11 }));
  });

  it("não tem escala antes de novembro de 2026", () => {
    expect(montarAbastecimento({ ano: 2026, mes: 10 })).toEqual([]);
  });

  it("põe o ferista no lugar de quem está de férias", () => {
    const celulas = montarAbastecimento(
      { ano: 2026, mes: 11 },
      [{ ausenciaId: "1", pessoaId: "7", ferista: "Pedro", cobreFuncaoId: null }],
      new Map([["7", "FERNANDO"]]),
    );
    expect(celulas.find((c) => c.local.id === "epra")?.cobertura?.nome).toBe("Pedro");
    expect(celulas.find((c) => c.local.id === "rti")?.cobertura).toBeUndefined();
  });
});
