import { describe, expect, it } from "vitest";

import { agoraNoFuso, ausenteNaNoite, plantoesDoPainel, programaPtrba } from "@/lib/painel-dia";

const base = { ancora: "2026-10-02", noite: "PAR" as const, turnoInicio: "19:00:00", turnoFim: "07:00:00" };

describe("plantões do painel", () => {
  it("antes das 7h o plantão atual é o da noite anterior", () => {
    const p = plantoesDoPainel({ ...base, dataISO: "2026-11-18", minutos: 5 * 60 + 57 });
    expect(p.map((x) => x.data)).toEqual(["2026-11-17", "2026-11-19", "2026-11-21", "2026-11-23"]);
    expect(p[0].situacao).toBe("EM_ANDAMENTO");
    expect(p[1].situacao).toBe("PROXIMO");
  });

  it("de dia, em dia de serviço, o primeiro é o de hoje à noite", () => {
    const p = plantoesDoPainel({ ...base, dataISO: "2026-11-19", minutos: 10 * 60 });
    expect(p[0]).toEqual({ data: "2026-11-19", situacao: "HOJE" });
    const noite = plantoesDoPainel({ ...base, dataISO: "2026-11-19", minutos: 20 * 60 });
    expect(noite[0].situacao).toBe("EM_ANDAMENTO");
  });

  it("depois das 7h na folga, mostra o próximo", () => {
    const p = plantoesDoPainel({ ...base, dataISO: "2026-11-18", minutos: 8 * 60 });
    expect(p[0]).toEqual({ data: "2026-11-19", situacao: "PROXIMO" });
  });
});

describe("programa de PTR-BA", () => {
  it("põe a atividade física às 22h quando não há 3ª instrução", () => {
    const p = programaPtrba([
      { ordem: 2, assunto: "B", instrutor: "ADALTO" },
      { ordem: 1, assunto: "A", instrutor: "ALEXANDRE" },
      { ordem: 0, assunto: "CORRIDA", instrutor: null },
    ]);
    expect(p.instrucoes.map((x) => [x.horario, x.assunto])).toEqual([
      ["20h às 21h", "A"],
      ["21h às 22h", "B"],
      ["22h às 23h", "Atividade física: CORRIDA"],
    ]);
  });

  it("com 3 instruções não acrescenta atividade física", () => {
    const p = programaPtrba([1, 2, 3].map((o) => ({ ordem: o, assunto: `X${o}`, instrutor: null })));
    expect(p.instrucoes).toHaveLength(3);
  });
});

it("ausência inclui início e fim", () => {
  expect(ausenteNaNoite({ inicio: "2026-11-01", fim: "2026-11-30" }, "2026-11-30")).toBe(true);
  expect(ausenteNaNoite({ inicio: "2026-11-01", fim: "2026-11-30" }, "2026-12-01")).toBe(false);
});

it("data e hora no fuso de São Paulo", () => {
  const r = agoraNoFuso(new Date("2026-11-18T08:57:00Z"));
  expect(r).toEqual({ dataISO: "2026-11-18", minutos: 5 * 60 + 57 });
});
