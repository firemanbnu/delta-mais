import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  definirOperadorRadioNoite,
  listarOperadoresRadio,
  montarEscalaRadio,
  restaurarRadioAutomatico,
  semearOperadoresRadio,
} from "@/db/repositorio";
import { diffDias, formatarDataBR, noitesDeServicoNoMes, paraISO } from "@/lib/calendario";
import {
  OPERADORES_POR_ANEL,
  SLOTS_FIXOS,
  SLOTS_RADIO,
  SLOTS_RODIZIO,
  ancoraRadioAlinhada,
  indiceNoite,
  montarGradeDoMes,
  noitesDeRadioNoMes,
  validarAneis,
  validarConfigRadio,
  validarGradeRadio,
  type AneisRadio,
  type ConfigRadio,
  type OperadorRadio,
} from "@/lib/radio";
import {
  criarBancoDeTeste,
  preencherMes,
  semearQuadro,
  type BancoDeTeste,
} from "./helpers/banco";

/** Âncoras que o app entrega: outubro nos dias pares e o rádio começando junto. */
const CONFIG: ConfigRadio = {
  dataAncora: "2026-10-02",
  noiteDeServico: "PAR",
  radioAncora: "2026-10-02",
};

const OUTUBRO = { ano: 2026, mes: 10 };

const ANEL_1 = ["Vanzella", "Fernando", "Catia", "Serra"];
const ANEL_2 = ["Massen", "Douglas", "Ataide", "Montanaro"];

/** Ids fictícios na ordem dos anéis: 1..4 no anel 1, 5..8 no anel 2. */
const ANEIS: AneisRadio = { 1: ["1", "2", "3", "4"], 2: ["5", "6", "7", "8"] };
const NOMES: Record<string, string> = {
  "1": ANEL_1[0],
  "2": ANEL_1[1],
  "3": ANEL_1[2],
  "4": ANEL_1[3],
  "5": ANEL_2[0],
  "6": ANEL_2[1],
  "7": ANEL_2[2],
  "8": ANEL_2[3],
};
const MAPA_NOMES = new Map(Object.entries(NOMES));

const OPERADORES: OperadorRadio[] = [
  ...ANEIS[1].map((id, ordem) => ({
    id,
    nome: NOMES[id],
    anel: 1 as const,
    ordem,
    ativo: true,
  })),
  ...ANEIS[2].map((id, ordem) => ({
    id,
    nome: NOMES[id],
    anel: 2 as const,
    ordem,
    ativo: true,
  })),
];

/** Nomes das oito faixas que giram, na ordem em que aparecem na tela. */
function nomesDaNoite(noite: { slots: Record<string, { pessoaId: string }> }): string[] {
  return SLOTS_RODIZIO.map((slot) => {
    const celula = noite.slots[slot.id];
    return celula ? NOMES[celula.pessoaId] : "—";
  });
}

/** Avança o anel `volta` posições, mantendo a ordem do rodízio. */
function rotacionar(lista: readonly string[], volta: number): string[] {
  return [...lista.slice(volta), ...lista.slice(0, volta)];
}

/**
 * A série da escala de rádio de outubro/2026: a cada noite os anéis trocam de
 * turno e a cada duas noites avançam uma posição. 18/10 repete 02/10.
 */
const SERIE_OUTUBRO = [
  { noite: 0, a: rotacionar(ANEL_1, 0), b: rotacionar(ANEL_2, 0) },
  { noite: 1, a: rotacionar(ANEL_2, 0), b: rotacionar(ANEL_1, 0) },
  { noite: 2, a: rotacionar(ANEL_1, 1), b: rotacionar(ANEL_2, 1) },
  { noite: 3, a: rotacionar(ANEL_2, 1), b: rotacionar(ANEL_1, 1) },
  { noite: 4, a: rotacionar(ANEL_1, 2), b: rotacionar(ANEL_2, 2) },
  { noite: 5, a: rotacionar(ANEL_2, 2), b: rotacionar(ANEL_1, 2) },
  { noite: 6, a: rotacionar(ANEL_1, 3), b: rotacionar(ANEL_2, 3) },
  { noite: 7, a: rotacionar(ANEL_2, 3), b: rotacionar(ANEL_1, 3) },
  { noite: 8, a: rotacionar(ANEL_1, 0), b: rotacionar(ANEL_2, 0) },
];

describe("calendário do rádio", () => {
  it("garante que outubro/2026 cai nos dias pares", () => {
    const dias = noitesDeServicoNoMes(2026, 10, CONFIG.dataAncora, CONFIG.noiteDeServico).map(
      (dia) => dia.getDate(),
    );

    expect(dias).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
  });

  it("mostra em outubro exatamente as 15 noites de plantão", () => {
    const doRadio = noitesDeRadioNoMes(2026, 10, CONFIG).map(paraISO);
    const doPlantao = noitesDeServicoNoMes(2026, 10, CONFIG.dataAncora, CONFIG.noiteDeServico).map(
      paraISO,
    );

    expect(doRadio).toEqual(doPlantao);
    expect(doRadio).toHaveLength(15);
  });

  it("nunca mostra uma noite em que não há plantão", () => {
    for (const [ano, mes] of [
      [2026, 10],
      [2026, 11],
      [2026, 12],
      [2027, 1],
    ] as const) {
      const doPlantao = noitesDeServicoNoMes(
        ano,
        mes,
        CONFIG.dataAncora,
        CONFIG.noiteDeServico,
      ).map(paraISO);

      for (const noite of noitesDeRadioNoMes(ano, mes, CONFIG)) {
        expect(doPlantao).toContain(paraISO(noite));
      }
    }
  });

  it("numera as noites a partir da âncora, atravessando a virada do mês", () => {
    expect(indiceNoite("2026-10-02", CONFIG)).toBe(0);
    expect(indiceNoite("2026-10-30", CONFIG)).toBe(14);
    expect(indiceNoite("2026-11-01", CONFIG)).toBe(15);
    expect(indiceNoite("2026-12-31", CONFIG)).toBe(45);
  });

  it("mantém o índice inteiro em todos os meses da escala", () => {
    for (const [ano, mes] of [
      [2026, 10],
      [2026, 11],
      [2027, 1],
    ] as const) {
      for (const noite of noitesDeRadioNoMes(ano, mes, CONFIG)) {
        expect(Number.isInteger(indiceNoite(noite, CONFIG))).toBe(true);
      }
    }
  });

  it("inverte a paridade nos meses seguintes e volta em janeiro", () => {
    const dias = (ano: number, mes: number) =>
      noitesDeRadioNoMes(ano, mes, CONFIG).map((dia) => dia.getDate());

    expect(dias(2026, 11)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
    expect(dias(2026, 12)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]);
    expect(dias(2027, 1)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
  });

  it("não monta meses anteriores ao início da escala", () => {
    expect(noitesDeRadioNoMes(2026, 9, CONFIG)).toHaveLength(0);
    expect(noitesDeRadioNoMes(2026, 1, CONFIG)).toHaveLength(0);
    expect(noitesDeRadioNoMes(2025, 12, CONFIG)).toHaveLength(0);
  });

  it("não deixa a escala voltar para antes da âncora", () => {
    expect(diffDias("2026-10-02", "2026-09-30")).toBe(2);
    expect(noitesDeRadioNoMes(2026, 9, CONFIG).map(paraISO)).not.toContain("2026-09-30");
  });
});

describe("rodízio dos anéis", () => {
  it("tem dez faixas, sendo duas fixas na central", () => {
    expect(SLOTS_RADIO).toHaveLength(10);
    expect(SLOTS_RODIZIO).toHaveLength(8);
    expect(SLOTS_FIXOS.map((slot) => slot.id)).toEqual(["19-20", "06-07"]);
  });

  it("segue a série de outubro, com 18/10 repetindo 02/10", () => {
    const noites = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS);

    expect(noites).toHaveLength(15);

    for (const [posicao, serie] of SERIE_OUTUBRO.entries()) {
      const noite = noites[posicao];
      expect(noite.indice).toBe(serie.noite);
      expect(nomesDaNoite(noite)).toEqual([...serie.a, ...serie.b]);
    }

    expect(nomesDaNoite(noites[0])).toEqual(nomesDaNoite(noites[8]));
  });

  it("começa com o anel 1 no primeiro turno e alterna a cada noite", () => {
    const noites = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS);

    expect(noites[0].anelUmNoTurnoA).toBe(true);
    expect(noites[1].anelUmNoTurnoA).toBe(false);
    expect(noites[0].slots["20-21"].pessoaId).toBe(ANEIS[1][0]);
    expect(noites[1].slots["20-21"].pessoaId).toBe(ANEIS[2][0]);
    expect(noites[1].slots["00-01:30"].pessoaId).toBe(ANEIS[1][0]);
  });

  it("avança os dois anéis uma posição a cada duas noites", () => {
    const noites = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS);

    expect(noites[0].volta).toBe(0);
    expect(noites[1].volta).toBe(0);
    expect(noites[2].volta).toBe(1);
    expect(noites[3].volta).toBe(1);
    expect(noites[4].volta).toBe(2);
  });

  it("fecha o ciclo em oito noites", () => {
    const primeira = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS)[0];
    const depois = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS)[8];

    expect(depois.indice).toBe(primeira.indice + 8);
    expect(nomesDaNoite(depois)).toEqual(nomesDaNoite(primeira));
  });

  it("não põe ninguém nas faixas fixas", () => {
    for (const noite of montarGradeDoMes({ ano: 2026, mes: 11 }, CONFIG, ANEIS)) {
      expect(noite.slots["19-20"]).toBeUndefined();
      expect(noite.slots["06-07"]).toBeUndefined();
    }
  });

  it("não estica a virada do mês com a noite de antes", () => {
    const novembro = montarGradeDoMes({ ano: 2026, mes: 11 }, CONFIG, ANEIS);

    expect(novembro[0].data).toBe("2026-11-01");
    expect(novembro.at(-1)?.data).toBe("2026-11-29");
  });
});

describe("trocas manuais", () => {
  it("aplica a exceção por cima do rodízio e marca como manual", () => {
    const comExcecao = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS, [
      { data: "2026-10-02", slot: "21-22", pessoaId: ANEIS[2][3] },
    ]);

    expect(comExcecao[0].slots["21-22"]).toEqual({
      pessoaId: ANEIS[2][3],
      origem: "MANUAL",
    });
    expect(comExcecao[0].slots["20-21"].origem).toBe("AUTO");
  });

  it("volta ao rodízio quando a exceção some", () => {
    const comExcecao = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS, [
      { data: "2026-10-02", slot: "21-22", pessoaId: ANEIS[2][3] },
    ]);
    const automatica = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS);

    expect(comExcecao[0].slots["21-22"].pessoaId).not.toBe(
      automatica[0].slots["21-22"].pessoaId,
    );
    expect(automatica[0].slots["21-22"].origem).toBe("AUTO");
  });

  it("ignora exceção que cairia numa faixa fixa", () => {
    const comExcecao = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS, [
      { data: "2026-10-02", slot: "19-20", pessoaId: ANEIS[1][0] },
    ]);

    expect(comExcecao[0].slots["19-20"]).toBeUndefined();
  });
});

describe("validação", () => {
  it("aceita a âncora padrão", () => {
    expect(validarConfigRadio(CONFIG)).toHaveLength(0);
    expect(ancoraRadioAlinhada(CONFIG)).toBe(true);
  });

  it("reprova âncora de rádio que não é noite de serviço", () => {
    const desalinhada: ConfigRadio = { ...CONFIG, radioAncora: "2026-10-03" };

    expect(ancoraRadioAlinhada(desalinhada)).toBe(false);
    expect(validarConfigRadio(desalinhada)).toHaveLength(1);
    expect(validarConfigRadio(desalinhada)[0]).toMatchObject({ severidade: "erro" });
    expect(validarConfigRadio(desalinhada)[0].mensagem).toContain("03/10/2026");
  });

  it("reprova anel com tamanho errado", () => {
    const problemas = validarAneis({ 1: ["1", "2", "3"], 2: ANEIS[2] }, OPERADORES);

    expect(problemas.some((p) => p.mensagem.includes("anel 1 tem 3"))).toBe(true);
  });

  it("reprova a mesma pessoa nos dois anéis", () => {
    const problemas = validarAneis({ 1: ["1", "2", "3", "4"], 2: ["4", "6", "7", "8"] }, OPERADORES);

    expect(problemas.some((p) => p.mensagem.includes("nos dois anéis"))).toBe(true);
  });

  it("aponta faixa vazia na noite", () => {
    const grade = montarGradeDoMes(OUTUBRO, CONFIG, { 1: [], 2: ANEIS[2] });
    const problemas = validarGradeRadio(grade, MAPA_NOMES);

    // Um anel vazio deixa de fora as quatro faixas que ele deveria cobrir.
    expect(problemas.filter((p) => p.mensagem.includes("sem operador"))).toHaveLength(
      15 * 4,
    );
  });

  it("aponta a mesma pessoa em duas faixas da mesma noite", () => {
    const grade = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS, [
      { data: "2026-10-02", slot: "21-22", pessoaId: ANEIS[1][0] },
    ]);
    const problemas = validarGradeRadio(grade, MAPA_NOMES);

    expect(problemas.some((p) => p.mensagem.includes("mais de uma faixa"))).toBe(true);
  });

  it("avisa, mas não bloqueia, quando o operador está ausente", () => {
    const grade = montarGradeDoMes(OUTUBRO, CONFIG, ANEIS);
    const problemas = validarGradeRadio(grade, MAPA_NOMES, [ANEIS[1][0]]);

    expect(
      problemas.some(
        (p) => p.severidade === "aviso" && p.mensagem.includes(`${ANEL_1[0]} consta como ausente`),
      ),
    ).toBe(true);
    expect(problemas.filter((p) => p.severidade === "erro")).toHaveLength(0);
  });

  it("aceita a grade completa de outubro sem nenhum erro", () => {
    expect(validarGradeRadio(montarGradeDoMes(OUTUBRO, CONFIG, ANEIS), MAPA_NOMES)).toHaveLength(0);
  });
});

describe("rótulos", () => {
  it("nomeia as faixas com início e fim", () => {
    expect(SLOTS_RADIO.map((slot) => `${slot.inicio}-${slot.fim}`)).toEqual([
      "19:00-20:00",
      "20:00-21:00",
      "21:00-22:00",
      "22:00-23:00",
      "23:00-00:00",
      "00:00-01:30",
      "01:30-03:00",
      "03:00-04:30",
      "04:30-06:00",
      "06:00-07:00",
    ]);
  });

  it("formata a data no padrão brasileiro", () => {
    expect(formatarDataBR("2026-10-02")).toBe("02/10/2026");
  });
});

describe("escala de rádio no banco", () => {
  let banco: BancoDeTeste;
  let ids: Map<string, number>;

  beforeEach(async () => {
    banco ??= await criarBancoDeTeste();
    await banco.limpar();
    ids = await semearQuadro(banco.db);
    await semearOperadoresRadio();
  });

  afterAll(async () => {
    await banco.cliente.close();
  });

  /** Falha alto quando o repositório devolveu `null` no lugar da escala. */
  function exigir(valor: Awaited<ReturnType<typeof montarEscalaRadio>>) {
    if (!valor) throw new Error("Escala de rádio não montada.");
    return valor;
  }

  it("semeia os dois anéis com quatro operadores cada", async () => {
    const operadores = await listarOperadoresRadio();

    expect(operadores).toHaveLength(OPERADORES_POR_ANEL * 2);
    expect(operadores.filter((o) => o.anel === 1).map((o) => o.nome)).toEqual(ANEL_1);
    expect(operadores.filter((o) => o.anel === 2).map((o) => o.nome)).toEqual(ANEL_2);
  });

  it("monta as 15 noites de outubro com o ocupante da comunicação do F3-BA2", async () => {
    await preencherMes(OUTUBRO, ids);

    const radio = exigir(await montarEscalaRadio(OUTUBRO));

    expect(radio.noites).toHaveLength(15);
    expect(radio.noites[0].data).toBe("2026-10-02");
    expect(radio.noites.at(-1)?.data).toBe("2026-10-30");
    expect(radio.problemas).toHaveLength(0);
    expect(radio.comunicacao?.nome).toBe("Hugo Alves");
  });

  it("troca as posições dos dois operadores da noite", async () => {
    await preencherMes(OUTUBRO, ids);
    const antes = exigir(await montarEscalaRadio(OUTUBRO));
    const alvo = (await listarOperadoresRadio()).find((o) => o.nome === "Massen")!;

    await definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "21-22", Number(alvo.id));
    const trocada = exigir(await montarEscalaRadio(OUTUBRO));

    expect(trocada.noites[0].slots["21-22"]).toEqual({
      pessoaId: String(alvo.id),
      origem: "MANUAL",
    });
    // A noite é cheia: quem saiu da faixa pedida assume a faixa de onde a pessoa escolhida veio.
    expect(trocada.noites[0].slots["00-01:30"]).toEqual({
      pessoaId: antes.noites[0].slots["21-22"].pessoaId,
      origem: "MANUAL",
    });
    expect(trocada.problemas.filter((p) => p.severidade === "erro")).toHaveLength(0);

    await definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "21-22", null);
    const restaurada = exigir(await montarEscalaRadio(OUTUBRO));

    expect(restaurada.noites[0].slots).toEqual(antes.noites[0].slots);
  });

  it("aceita trocas de pessoas diferentes na mesma noite", async () => {
    await preencherMes(OUTUBRO, ids);
    const operadores = await listarOperadoresRadio();
    const primeira = operadores.find((o) => o.nome === "Massen")!;
    const segunda = operadores.find((o) => o.nome === "Ataide")!;

    await definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "21-22", Number(primeira.id));
    await definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "23-00", Number(segunda.id));

    const radio = exigir(await montarEscalaRadio(OUTUBRO));

    expect(radio.noites[0].slots["21-22"].origem).toBe("MANUAL");
    expect(radio.noites[0].slots["23-00"].origem).toBe("MANUAL");
    expect(radio.noites[0].slots["21-22"].pessoaId).not.toBe(
      radio.noites[0].slots["23-00"].pessoaId,
    );
    expect(radio.problemas.filter((p) => p.severidade === "erro")).toHaveLength(0);
  });

  it("restaura o mês inteiro ao rodízio", async () => {
    await preencherMes(OUTUBRO, ids);
    const antes = exigir(await montarEscalaRadio(OUTUBRO));
    const alvo = (await listarOperadoresRadio()).find((o) => o.nome === "Massen")!;

    await definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "21-22", Number(alvo.id));
    await definirOperadorRadioNoite(OUTUBRO, "2026-10-04", "22-23", Number(alvo.id));
    await restaurarRadioAutomatico(OUTUBRO);

    const restaurada = exigir(await montarEscalaRadio(OUTUBRO));

    expect(restaurada.noites[0].slots["21-22"]).toEqual(antes.noites[0].slots["21-22"]);
    expect(restaurada.noites[1].slots["22-23"]).toEqual(antes.noites[1].slots["22-23"]);
  });

  it("recusa noite que não é de rádio", async () => {
    await preencherMes(OUTUBRO, ids);

    await expect(
      definirOperadorRadioNoite(OUTUBRO, "2026-10-03", "21-22", 1),
    ).rejects.toThrow(/não é noite de rádio/);
  });

  it("recusa faixa fixa", async () => {
    await preencherMes(OUTUBRO, ids);
    const alvo = (await listarOperadoresRadio())[0];

    await expect(
      definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "19-20", Number(alvo.id)),
    ).rejects.toThrow(/não gira entre os anéis/);
  });

  it("recusa pessoa que não está em anel", async () => {
    await preencherMes(OUTUBRO, ids);
    const fora = ids.get("Carla Souza")!;

    await expect(
      definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "21-22", fora),
    ).rejects.toThrow(/não está em nenhum anel/);
  });

  it("trata escolher quem já está na faixa como devolver ao rodízio", async () => {
    await preencherMes(OUTUBRO, ids);
    const alvo = (await listarOperadoresRadio()).find((o) => o.nome === "Fernando")!;
    const automatico = exigir(await montarEscalaRadio(OUTUBRO));

    await definirOperadorRadioNoite(OUTUBRO, "2026-10-02", "21-22", Number(alvo.id));

    const radio = exigir(await montarEscalaRadio(OUTUBRO));

    expect(radio.noites[0].slots["21-22"]).toEqual(automatico.noites[0].slots["21-22"]);
    expect(radio.noites[0].slots["21-22"].origem).toBe("AUTO");
  });

  it("não monta rádio em mês sem período", async () => {
    expect(await montarEscalaRadio({ ano: 2030, mes: 7 })).toBeNull();
  });
});
