import { describe, expect, it } from "vitest";

import {
  aplicarCoberturasNoRadio,
  coberturasDaViatura,
  coberturasDoRadio,
  type CoberturaFerias,
} from "@/lib/cobertura";
import { POSTOS_PADRAO } from "@/lib/dominio";
import type { NoiteDeRadio } from "@/lib/radio";
import type { EstadoPosts, PessoaResumo } from "@/lib/rotacao";

const PESSOAS: PessoaResumo[] = [
  { id: "1", nome: "Ana", funcao: "CE" },
  { id: "2", nome: "Bruno", funcao: "LR" },
  { id: "3", nome: "Carla", funcao: "MC" },
  { id: "4", nome: "Diego", funcao: "MC" },
  { id: "5", nome: "Elisa", funcao: "MC" },
  { id: "6", nome: "Fabio", funcao: "BA" },
  { id: "7", nome: "Gabi", funcao: "BA" },
  { id: "8", nome: "Hugo", funcao: "BA" },
  { id: "9", nome: "Isa", funcao: "RE" },
  { id: "10", nome: "Joel", funcao: "RE" },
  { id: "11", nome: "Kaio", funcao: "BA" },
];

const ESTADO: EstadoPosts = {
  "F2-CE": "1",
  "CRS-LR": "2",
  "F2-MC": "3",
  "F3-MC": "4",
  "CRS-MC": "5",
  "F2-BA": "6",
  "F3-BA1": "7",
  "F3-BA2": "8",
  "CRS-RE1": "9",
  "CRS-RE2": "10",
};

function ferias(pessoaId: string, ferista: string, cobreFuncaoId: string | null = null): CoberturaFerias {
  return { ausenciaId: pessoaId, pessoaId, ferista, cobreFuncaoId };
}

describe("cobertura de férias nas viaturas", () => {
  it("põe o ferista na vaga do ausente quando ele cobre a função", () => {
    const resultado = coberturasDaViatura(ESTADO, [ferias("6", "Pedro")], PESSOAS, POSTOS_PADRAO);

    expect(resultado.porVaga["F2-BA"]).toMatchObject({ nome: "Pedro", ferista: true });
    expect(Object.keys(resultado.porVaga)).toEqual(["F2-BA"]);
    expect(resultado.cobertos).toEqual(["6"]);
    expect(resultado.problemas).toEqual([]);
  });

  it("leva quem cobre a função para a vaga do ausente e o ferista para a vaga dele", () => {
    const resultado = coberturasDaViatura(
      ESTADO,
      [ferias("6", "Pedro", "7")],
      PESSOAS,
      POSTOS_PADRAO,
    );

    expect(resultado.porVaga["F2-BA"]).toMatchObject({ nome: "Gabi", pessoaId: "7", ferista: false });
    expect(resultado.porVaga["F3-BA1"]).toMatchObject({ nome: "Pedro", ferista: true });
    expect(resultado.problemas).toEqual([]);
  });

  it("não mexe no estado gravado: a vaga continua com o titular", () => {
    const estado = { ...ESTADO };
    coberturasDaViatura(estado, [ferias("6", "Pedro", "7")], PESSOAS, POSTOS_PADRAO);
    expect(estado).toEqual(ESTADO);
  });

  it("avisa quando quem cobre a função não está escalado em vaga nenhuma", () => {
    const resultado = coberturasDaViatura(
      ESTADO,
      [ferias("6", "Pedro", "11")],
      PESSOAS,
      POSTOS_PADRAO,
    );

    expect(resultado.porVaga["F2-BA"]).toMatchObject({ nome: "Kaio" });
    expect(resultado.problemas.map((p) => p.mensagem)).toEqual([
      expect.stringContaining("o ferista Pedro fica sem vaga de viatura"),
    ]);
  });

  it("avisa quando quem cobre a função não tem a qualificação da vaga", () => {
    const resultado = coberturasDaViatura(
      ESTADO,
      [ferias("6", "Pedro", "3")],
      PESSOAS,
      POSTOS_PADRAO,
    );

    expect(resultado.porVaga["F2-BA"]).toMatchObject({ nome: "Carla" });
    expect(resultado.porVaga["F2-MC"]).toMatchObject({ nome: "Pedro" });
    expect(resultado.problemas).toHaveLength(1);
    expect(resultado.problemas[0].mensagem).toContain("Carla é MC");
  });

  it("ignora férias sem ferista e de quem está fora da escala", () => {
    const resultado = coberturasDaViatura(
      ESTADO,
      [ferias("6", "  "), ferias("11", "Pedro")],
      PESSOAS,
      POSTOS_PADRAO,
    );

    expect(resultado.porVaga).toEqual({});
    expect(resultado.cobertos).toEqual([]);
  });
});

describe("cobertura de férias no rádio", () => {
  const operadores = [
    { id: "20", nome: "Vanzella" },
    { id: "21", nome: "Cátia" },
  ];

  it("liga o operador pelo mesmo nome, sem acento nem maiúscula", () => {
    const nomes = new Map([["6", "catia"]]);
    const mapa = coberturasDoRadio([ferias("6", "Pedro", "7")], nomes, operadores);

    expect([...mapa.keys()]).toEqual(["21"]);
    expect(mapa.get("21")?.nome).toBe("Pedro");
  });

  it("marca as faixas do operador sem mudar o rodízio", () => {
    const noite: NoiteDeRadio = {
      data: "2026-10-02",
      indice: 0,
      volta: 0,
      anelUmNoTurnoA: true,
      slots: {
        "20-21": { pessoaId: "21", origem: "AUTO" },
        "21-22": { pessoaId: "20", origem: "AUTO" },
      },
    };
    const mapa = coberturasDoRadio([ferias("21", "Pedro")], new Map(), operadores);
    const [coberta] = aplicarCoberturasNoRadio([noite], mapa);

    expect(coberta.slots["20-21"]).toMatchObject({ pessoaId: "21", cobertura: { nome: "Pedro" } });
    expect(coberta.slots["21-22"].cobertura).toBeUndefined();
    expect(noite.slots["20-21"].cobertura).toBeUndefined();
  });
});
