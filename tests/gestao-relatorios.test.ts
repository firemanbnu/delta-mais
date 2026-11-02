import { describe, expect, it } from "vitest";

import type { StatusDocumento } from "@/lib/gestao";
import {
  lerFiltros,
  periodo,
  recortar,
  relatorioPendencias,
  relatorioPorDocumento,
  relatorioSituacao,
  relatorioVencimentos,
  somarDias,
  statusPadrao,
  type LinhaRelatorio,
} from "@/lib/gestao-relatorios";

const NR35 = { id: 1, nome: "NR 35", grupo: "MEDMAIS" as const };
const CNH = { id: 2, nome: "CNH", grupo: "TECNICA" as const };
const CTPS = { id: 3, nome: "CTPS", grupo: "RH" as const };

function cel(tipo: typeof NR35 | typeof CNH | typeof CTPS, status: StatusDocumento, vencimento: string | null = null, dias: number | null = null) {
  return { tipo, registro: null, avaliacao: { status, vencimento, dias } };
}

const LINHAS: LinhaRelatorio[] = [
  {
    pessoa: { id: 2, nome: "BRUNO", equipe: "DELTA", funcao: "BA-2" },
    celulas: [cel(NR35, "VENCIDO", "2026-10-01", -32), cel(CNH, "VENCE_30", "2026-11-20", 18), cel(CTPS, "EM_DIA")],
  },
  {
    pessoa: { id: 1, nome: "ÁLVARO", equipe: "ALFA", funcao: "BA-CE" },
    celulas: [cel(NR35, "EM_DIA", "2027-08-01", 272), cel(CNH, "FALTA"), cel(CTPS, "EM_DIA")],
  },
];

describe("lerFiltros", () => {
  it("aceita só valores válidos", () => {
    const f = lerFiltros({ modelo: "vencimentos", equipe: "DELTA", grupo: "XX", tipo: "3", status: ["VENCIDO", "nada"], de: "2026-11-02", ate: "ontem" });
    expect(f.modelo).toBe("vencimentos");
    expect(f.equipe).toBe("DELTA");
    expect(f.grupo).toBeNull();
    expect(f.tipoId).toBe(3);
    expect(f.status).toEqual(["VENCIDO"]);
    expect(f.de).toBe("2026-11-02");
    expect(f.ate).toBeNull();
  });

  it("modelo desconhecido vira pendências", () => {
    expect(lerFiltros({ modelo: "x" }).modelo).toBe("pendencias");
  });
});

describe("período", () => {
  it("padrão de hoje a 90 dias e inverte datas trocadas", () => {
    expect(somarDias("2026-11-02", 90)).toBe("2027-01-31");
    expect(periodo(lerFiltros({}), "2026-11-02")).toEqual({ de: "2026-11-02", ate: "2027-01-31" });
    expect(periodo(lerFiltros({ de: "2026-12-01", ate: "2026-11-01" }), "2026-11-02")).toEqual({
      de: "2026-11-01",
      ate: "2026-12-01",
    });
  });
});

describe("relatórios", () => {
  it("recorta por equipe e categoria e ordena por nome", () => {
    expect(recortar(LINHAS, lerFiltros({})).map((l) => l.pessoa.nome)).toEqual(["ÁLVARO", "BRUNO"]);
    const delta = recortar(LINHAS, lerFiltros({ equipe: "DELTA", grupo: "MEDMAIS" }));
    expect(delta).toHaveLength(1);
    expect(delta[0].celulas.map((c) => c.tipo.nome)).toEqual(["NR 35"]);
  });

  it("pendências só de quem tem, do mais grave ao mais leve", () => {
    const r = relatorioPendencias(recortar(LINHAS, lerFiltros({})), statusPadrao("pendencias"));
    expect(r.map((p) => p.pessoa.nome)).toEqual(["ÁLVARO", "BRUNO"]);
    expect(r[1].itens.map((c) => c.avaliacao.status)).toEqual(["VENCIDO", "VENCE_30"]);
  });

  it("vencimentos no período em ordem de data", () => {
    const r = relatorioVencimentos(LINHAS, statusPadrao("vencimentos"), "2026-09-01", "2026-12-31");
    expect(r.map((i) => i.celula.tipo.nome)).toEqual(["NR 35", "CNH"]);
  });

  it("por documento agrupa pela situação", () => {
    const r = relatorioPorDocumento(LINHAS, [CNH], statusPadrao("documento"));
    expect(r[0].grupos.map((g) => g.status)).toEqual(["FALTA", "VENCE_30"]);
  });

  it("grade filtra quem tem a situação escolhida", () => {
    expect(relatorioSituacao(LINHAS, ["FALTA"], false).map((l) => l.pessoa.nome)).toEqual(["ÁLVARO"]);
    expect(relatorioSituacao(LINHAS, ["FALTA"], true)).toHaveLength(2);
  });
});
