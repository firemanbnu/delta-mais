import { describe, expect, it } from "vitest";

import { compararNomes, type StatusDocumento } from "@/lib/gestao";
import { montarPainel, percentualEmDia, type LinhaPainel } from "@/lib/gestao-painel";

function linha(
  id: number,
  nome: string,
  equipe: LinhaPainel["pessoa"]["equipe"],
  docs: [string, "TECNICA" | "CCR" | "MEDMAIS" | "RH", StatusDocumento, number?][],
): LinhaPainel {
  return {
    pessoa: { id, nome, nomeGuerra: null, equipe },
    celulas: docs.map(([doc, grupo, status, dias], i) => ({
      tipo: { id: i + 1, nome: doc, grupo },
      avaliacao: {
        status,
        dias: dias ?? null,
        vencimento: dias === undefined ? null : "2026-12-01",
      },
    })),
  };
}

describe("compararNomes", () => {
  it("ordena ignorando acentos e maiúsculas", () => {
    const nomes = ["ÁLVARO", "alan", "Bruno", "ATAÍDE", "Cátia"];
    expect([...nomes].sort(compararNomes)).toEqual(["alan", "ÁLVARO", "ATAÍDE", "Bruno", "Cátia"]);
  });
});

describe("montarPainel", () => {
  const linhas = [
    linha(1, "ANA", "DELTA", [
      ["NR 35", "MEDMAIS", "VENCIDO"],
      ["CNH", "TECNICA", "VENCE_30", 10],
      ["CTPS", "RH", "EM_DIA"],
      ["X6", "TECNICA", "NAO_SE_APLICA"],
    ]),
    linha(2, "BIA", "DELTA", [
      ["NR 35", "MEDMAIS", "FALTA"],
      ["CNH", "TECNICA", "VENCE_90", 60],
      ["CTPS", "RH", "EM_DIA"],
    ]),
    linha(3, "CAIO", "ALFA", [
      ["NR 35", "MEDMAIS", "EM_DIA"],
      ["CNH", "TECNICA", "EM_DIA"],
    ]),
  ];
  const painel = montarPainel(linhas);

  it("conta o geral sem os que não se aplicam", () => {
    expect(painel.pessoas).toBe(3);
    expect(painel.exigidos).toBe(8);
    expect(painel.geral.VENCIDO).toBe(1);
    expect(painel.geral.FALTA).toBe(1);
    // 6 de 8 valem hoje (vencido e falta não).
    expect(painel.conformidade).toBe(75);
  });

  it("separa por equipe na ordem das equipes", () => {
    expect(painel.porEquipe.map((e) => e.equipe)).toEqual(["ALFA", "DELTA"]);
    expect(painel.porEquipe[0].conformidade).toBe(100);
    expect(painel.porEquipe[1].pessoas).toBe(2);
  });

  it("lista quem precisa de atenção e os próximos vencimentos", () => {
    expect(painel.atencao.map((p) => p.nome)).toEqual(["ANA", "BIA"]);
    expect(painel.proximos.map((v) => v.dias)).toEqual([10, 60]);
    expect(painel.documentosCriticos[0]).toEqual({ nome: "NR 35", vencidos: 1, faltas: 1 });
  });

  it("percentual de distribuição vazia é zero", () => {
    expect(percentualEmDia(montarPainel([]).geral)).toBe(0);
  });
});
