import { describe, expect, it } from "vitest";

import {
  avancarMeses,
  avancarRodizio,
  ordenarCiclo,
  sugerirParaPosto,
  validarComposicao,
  type EstadoPosts,
  type PessoaResumo,
  type Posto,
} from "../src/lib/rotacao";
import {
  FUNCOES,
  POSTOS_PADRAO,
  aceitoNoPosto,
  type Funcao,
} from "../src/lib/dominio";
import {
  ancoraDoCiclo,
  chaveAnoMes,
  diasDoMes,
  diffDias,
  ehNoiteDeServico,
  mesAnterior,
  mesSeguinte,
  noitesDeServicoNoMes,
  paraISO,
  somarMeses,
} from "../src/lib/calendario";

const PESSOAS: PessoaResumo[] = [
  { id: "p-ce", nome: "Ana", funcao: "CE" },
  { id: "p-lr", nome: "Bruno", funcao: "LR" },
  { id: "p-mc1", nome: "Carla", funcao: "MC" },
  { id: "p-mc2", nome: "Diego", funcao: "MC" },
  { id: "p-mc3", nome: "Elis", funcao: "MC" },
  { id: "p-ba1", nome: "Fabio", funcao: "BA" },
  { id: "p-ba2", nome: "Gabi", funcao: "BA" },
  { id: "p-ba3", nome: "Hugo", funcao: "BA" },
  { id: "p-re1", nome: "Isa", funcao: "RE" },
  { id: "p-re2", nome: "Joel", funcao: "RE" },
];

const porNome = (id: string | null): string => {
  if (!id) return "—";
  return PESSOAS.find((p) => p.id === id)?.nome ?? id;
};

function porPosto(estado: EstadoPosts) {
  return Object.fromEntries(
    Object.entries(estado).map(([posto, pessoa]) => [posto, porNome(pessoa)]),
  );
}

const ESTADO_INICIAL: EstadoPosts = {
  "F2-MC": "p-mc1",
  "F2-CE": "p-ce",
  "F2-BA": "p-ba1",
  "F3-MC": "p-mc2",
  "F3-BA1": "p-ba2",
  "F3-BA2": "p-ba3",
  "CRS-MC": "p-mc3",
  "CRS-LR": "p-lr",
  "CRS-RE1": "p-re1",
  "CRS-RE2": "p-re2",
};

describe("composição inicial", () => {
  it("tem 10 vagas e 10 pessoas distintas", () => {
    expect(POSTOS_PADRAO).toHaveLength(10);
    expect(new Set(Object.values(ESTADO_INICIAL)).size).toBe(10);
  });

  it("mantém F2 = 1 MC + 1 CE + 1 BA", () => {
    expect(porPosto(ESTADO_INICIAL)["F2-MC"]).toBe("Carla");
    expect(porPosto(ESTADO_INICIAL)["F2-CE"]).toBe("Ana");
    expect(porPosto(ESTADO_INICIAL)["F2-BA"]).toBe("Fabio");
  });

  it("mantém F3 = 1 MC + 2 BA", () => {
    expect(porPosto(ESTADO_INICIAL)["F3-MC"]).toBe("Diego");
    expect(porPosto(ESTADO_INICIAL)["F3-BA1"]).toBe("Gabi");
    expect(porPosto(ESTADO_INICIAL)["F3-BA2"]).toBe("Hugo");
  });

  it("mantém CRS = 1 MC + 1 LR + 2 RE", () => {
    expect(porPosto(ESTADO_INICIAL)["CRS-MC"]).toBe("Elis");
    expect(porPosto(ESTADO_INICIAL)["CRS-LR"]).toBe("Bruno");
    expect(porPosto(ESTADO_INICIAL)["CRS-RE1"]).toBe("Isa");
    expect(porPosto(ESTADO_INICIAL)["CRS-RE2"]).toBe("Joel");
  });

  it("não produz nenhum erro de validação", () => {
    expect(validarComposicao(ESTADO_INICIAL, PESSOAS)).toEqual([]);
  });
});

describe("ciclo dos MC (3 meses)", () => {
  // Quem está no F2 avança para o F3, do F3 para o CRS e do CRS volta ao F2.
  const esperado = [
    { "F2-MC": "Elis", "F3-MC": "Carla", "CRS-MC": "Diego" },
    { "F2-MC": "Diego", "F3-MC": "Elis", "CRS-MC": "Carla" },
    { "F2-MC": "Carla", "F3-MC": "Diego", "CRS-MC": "Elis" },
  ];

  it("avança F2 -> F3 -> CRS -> F2", () => {
    let estado = ESTADO_INICIAL;
    for (const mes of esperado) {
      estado = avancarRodizio(estado);
      const atual = {
        "F2-MC": porNome(estado["F2-MC"]),
        "F3-MC": porNome(estado["F3-MC"]),
        "CRS-MC": porNome(estado["CRS-MC"]),
      };
      expect(atual).toEqual(mes);
    }
  });

  it("cada MC completa a volta em 3 meses", () => {
    const inicial = { ...ESTADO_INICIAL };
    const depois = avancarMeses(inicial, 3);
    for (const posto of ["F2-MC", "F3-MC", "CRS-MC"] as const) {
      expect(depois[posto]).toBe(inicial[posto]);
    }
  });
});

describe("ciclo de BA/RE (5 meses)", () => {
  const ciclo = ["F2-BA", "F3-BA1", "F3-BA2", "CRS-RE1", "CRS-RE2"];

  it("ordena o ciclo conforme a definição dos postos", () => {
    expect(ordenarCiclo(POSTOS_PADRAO, "BA_RE")).toEqual(ciclo);
  });

  it("anda uma posição por mês e fecha o ciclo de BA/RE em 5 meses", () => {
    let estado = ESTADO_INICIAL;
    const parteBARe = (e: EstadoPosts) =>
      ciclo.map((c) => porNome(e[c])).join(" | ");

    for (let i = 1; i <= 5; i++) {
      estado = avancarRodizio(estado);
      const presentes = ciclo.map((c) => porNome(estado[c]));
      expect(new Set(presentes).size).toBe(5);
      if (i < 5) expect(parteBARe(estado)).not.toBe(parteBARe(ESTADO_INICIAL));
    }
    expect(parteBARe(estado)).toBe(parteBARe(ESTADO_INICIAL));
  });

  it("move exatamente uma vaga por pessoa a cada virada de mês", () => {
    const proximo = avancarRodizio(ESTADO_INICIAL);
    const indiceDe = (estado: EstadoPosts, id: string) =>
      ciclo.findIndex((c) => estado[c] === id);

    for (const pessoa of ["p-ba1", "p-ba2", "p-ba3", "p-re1", "p-re2"] as const) {
      expect(indiceDe(proximo, pessoa)).toBe((indiceDe(ESTADO_INICIAL, pessoa) + 1) % 5);
    }
  });

  it("cumpre a tabela de 6 meses descrita no plano", () => {
    const tabela = [
      { mes: 1, F2: "Fabio", B1: "Gabi", B2: "Hugo", R1: "Isa", R2: "Joel" },
      { mes: 2, F2: "Joel", B1: "Fabio", B2: "Gabi", R1: "Hugo", R2: "Isa" },
      { mes: 3, F2: "Isa", B1: "Joel", B2: "Fabio", R1: "Gabi", R2: "Hugo" },
      { mes: 4, F2: "Hugo", B1: "Isa", B2: "Joel", R1: "Fabio", R2: "Gabi" },
      { mes: 5, F2: "Gabi", B1: "Hugo", B2: "Isa", R1: "Joel", R2: "Fabio" },
    ];

    let estado = ESTADO_INICIAL;
    for (const linha of tabela) {
      expect({
        mes: linha.mes,
        F2: porNome(estado["F2-BA"]),
        B1: porNome(estado["F3-BA1"]),
        B2: porNome(estado["F3-BA2"]),
        R1: porNome(estado["CRS-RE1"]),
        R2: porNome(estado["CRS-RE2"]),
      }).toEqual(linha);
      estado = avancarRodizio(estado);
    }
  });
});

describe("postos fixos", () => {
  it("CE fica sempre no F2 e LR sempre no CRS, em qualquer quantidade de meses", () => {
    const estado = avancarMeses(ESTADO_INICIAL, 37);
    expect(estado["F2-CE"]).toBe("p-ce");
    expect(estado["CRS-LR"]).toBe("p-lr");
  });
});

describe("invariantes da composição em 60 meses", () => {
  it("nunca deixa vaga vazia nem duplica pessoa", () => {
    let estado = ESTADO_INICIAL;
    for (let i = 0; i < 60; i++) {
      estado = avancarRodizio(estado);
      expect(new Set(Object.values(estado)).size).toBe(10);
      expect(Object.values(estado).every(Boolean)).toBe(true);
      expect(validarComposicao(estado, PESSOAS)).toEqual([]);
    }
  });

  it("respeita a contagem por função em todos os meses", () => {
    const contagem = (estado: EstadoPosts) => {
      const mapa: Partial<Record<string, number>> = {};
      for (const pessoaId of Object.values(estado)) {
        const pessoa = PESSOAS.find((p) => p.id === pessoaId);
        if (!pessoa) continue;
        mapa[pessoa.funcao] = (mapa[pessoa.funcao] ?? 0) + 1;
      }
      return mapa;
    };

    let estado = ESTADO_INICIAL;
    for (let i = 0; i < 60; i++) {
      estado = avancarRodizio(estado);
      expect(contagem(estado)).toEqual({ CE: 1, LR: 1, MC: 3, BA: 3, RE: 2 });
    }
  });

  it("mantém F2 = MC+CE+BA, F3 = MC+2 BA e CRS = MC+LR+2 RE em todos os meses", () => {
    const funcaoNo = (estado: EstadoPosts, posto: string) => {
      const pessoa = PESSOAS.find((p) => p.id === estado[posto]);
      return pessoa?.funcao;
    };
    // O rótulo da vaga é fixo; quem a ocupa pode ser BA ou RE, porque os dois
    // grupos rodam juntos. O que não pode mudar é o posto.
    const ehMc = (f?: string) => f === "MC";
    const ehCe = (f?: string) => f === "CE";
    const ehLr = (f?: string) => f === "LR";
    const ehBaRe = (f?: string) => f === "BA" || f === "RE";

    let estado = ESTADO_INICIAL;
    for (let i = 0; i < 60; i++) {
      estado = avancarRodizio(estado);
      expect([
        ehMc(funcaoNo(estado, "F2-MC")),
        ehCe(funcaoNo(estado, "F2-CE")),
        ehBaRe(funcaoNo(estado, "F2-BA")),
      ]).toEqual([true, true, true]);
      expect([
        ehMc(funcaoNo(estado, "F3-MC")),
        ehBaRe(funcaoNo(estado, "F3-BA1")),
        ehBaRe(funcaoNo(estado, "F3-BA2")),
      ]).toEqual([true, true, true]);
      expect([
        ehMc(funcaoNo(estado, "CRS-MC")),
        ehLr(funcaoNo(estado, "CRS-LR")),
        ehBaRe(funcaoNo(estado, "CRS-RE1")),
        ehBaRe(funcaoNo(estado, "CRS-RE2")),
      ]).toEqual([true, true, true, true]);
    }
  });

  it("leva BA para as vagas de RE e traz RE de volta para o BA", () => {
    const estado = avancarRodizio(ESTADO_INICIAL);
    expect(porNome(estado["F2-BA"])).toBe("Joel");
    expect(porNome(estado["F3-BA2"])).toBe("Gabi");
    expect(porNome(estado["CRS-RE1"])).toBe("Hugo");
  });

  it("ciclo completo se repete a cada 15 meses (mmc de 3 e 5)", () => {
    expect(avancarMeses(ESTADO_INICIAL, 15)).toEqual(ESTADO_INICIAL);
    expect(avancarMeses(ESTADO_INICIAL, 14)).not.toEqual(ESTADO_INICIAL);
  });
});

describe("vaga com alteração manual", () => {
  it("o rodízio do mês seguinte parte do estado manual, não do automático", () => {
    const manual: EstadoPosts = { ...ESTADO_INICIAL, "F2-MC": "p-mc3" };
    expect(avancarRodizio(manual)["F3-MC"]).toBe("p-mc3");
  });

  it("preserva a correção manual indefinidamente", () => {
    let estado: EstadoPosts = { ...ESTADO_INICIAL, "F2-MC": "p-mc3" };
    estado = avancarRodizio(estado);
    estado = avancarRodizio(estado);
    expect(estado["CRS-MC"]).toBe("p-mc3");
  });
});

describe("vaga vazia", () => {
  it("não quebra o rodízio: a vaga seguinte fica vazia e a anterior recebe alguém", () => {
    const estado: EstadoPosts = { ...ESTADO_INICIAL, "F2-BA": null };
    const proximo = avancarRodizio(estado);
    expect(proximo["F3-BA1"]).toBeNull();
    expect(proximo["F2-BA"]).toBe("p-re2");
  });

  it("é apontada como erro de validação", () => {
    const estado: EstadoPosts = { ...ESTADO_INICIAL, "F2-BA": null };
    const problemas = validarComposicao(estado, PESSOAS);
    expect(problemas.some((p) => p.severidade === "erro" && p.posto === "F2-BA")).toBe(true);
  });
});

describe("validação", () => {
  it("rejeita pessoa repetida em duas vagas", () => {
    const estado: EstadoPosts = { ...ESTADO_INICIAL, "CRS-MC": "p-mc1" };
    const problemas = validarComposicao(estado, PESSOAS);
    expect(
      problemas.some((p) => p.severidade === "erro" && p.mensagem.includes("mais de uma vaga")),
    ).toBe(true);
  });

  it("rejeita qualificação incompatível com a vaga", () => {
    const estado: EstadoPosts = { ...ESTADO_INICIAL, "F2-MC": "p-ba1" };
    const problemas = validarComposicao(estado, PESSOAS);
    expect(
      problemas.some((p) => p.severidade === "erro" && p.mensagem.includes("não pode ocupar")),
    ).toBe(true);
  });

  it("rejeita CE no lugar de MC", () => {
    const estado: EstadoPosts = { ...ESTADO_INICIAL, "F2-MC": "p-ce" };
    expect(validarComposicao(estado, PESSOAS).some((p) => p.severidade === "erro")).toBe(true);
  });

  it("avisa (sem bloquear) quando a pessoa está de férias", () => {
    const problemas = validarComposicao(ESTADO_INICIAL, PESSOAS, POSTOS_PADRAO, ["p-ba1"]);
    const aviso = problemas.find((p) => p.severidade === "aviso");
    expect(aviso?.mensagem).toContain("Fabio");
    expect(aviso?.posto).toBe("F2-BA");
  });
});

describe("sugestão de substituição", () => {
  const postoF2Ba = POSTOS_PADRAO.find((p) => p.codigo === "F2-BA") as Posto;
  const postoF2Mc = POSTOS_PADRAO.find((p) => p.codigo === "F2-MC") as Posto;

  it("oferece só quem tem a qualificação, está livre e não está escalado", () => {
    // Esvazia F2-BA, CRS-RE1 e CRS-RE2: sobram Fabio, Isa e Joel.
    const estado: EstadoPosts = {
      ...ESTADO_INICIAL,
      "F2-BA": null,
      "CRS-RE1": null,
      "CRS-RE2": null,
    };
    const sugestoes = sugerirParaPosto(postoF2Ba, estado, PESSOAS);
    expect(sugestoes.map((s) => s.nome)).toEqual(["Fabio", "Isa", "Joel"]);
  });

  it("não oferece quem está de férias, atestado ou dispensa", () => {
    const estado: EstadoPosts = {
      ...ESTADO_INICIAL,
      "F2-BA": null,
      "CRS-RE1": null,
      "CRS-RE2": null,
    };
    const sugestoes = sugerirParaPosto(postoF2Ba, estado, PESSOAS, ["p-ba1", "p-re1"]);
    expect(sugestoes.map((s) => s.nome)).toEqual(["Joel"]);
  });

  it("não oferece MC em vaga de BA/RE", () => {
    const estado: EstadoPosts = {
      ...ESTADO_INICIAL,
      "F2-BA": null,
      "CRS-RE1": null,
      "CRS-RE2": null,
    };
    expect(sugerirParaPosto(postoF2Ba, estado, PESSOAS).map((s) => s.funcao)).toEqual([
      "BA",
      "RE",
      "RE",
    ]);
  });

  it("devolve a única pessoa livre quando a vaga de MC esvazia", () => {
    const sugestoes = sugerirParaPosto(
      postoF2Mc,
      { ...ESTADO_INICIAL, "F2-MC": null },
      PESSOAS,
    );
    expect(sugestoes.map((s) => s.nome)).toEqual(["Carla"]);
  });

  it("não sugere ninguém quando não há MC livre no quadro", () => {
    const semMCLivre = PESSOAS.filter((p) => p.funcao !== "MC");
    expect(
      sugerirParaPosto(postoF2Mc, { ...ESTADO_INICIAL, "F2-MC": null }, semMCLivre),
    ).toEqual([]);
  });
});

describe("qualificação por vaga", () => {
  it("cada vaga aceita apenas as funções esperadas", () => {
    const esperado: Record<string, Funcao[]> = {
      "F2-MC": ["MC"],
      "F2-CE": ["CE"],
      "F2-BA": ["BA", "RE"],
      "F3-MC": ["MC"],
      "F3-BA1": ["BA", "RE"],
      "F3-BA2": ["BA", "RE"],
      "CRS-MC": ["MC"],
      "CRS-LR": ["LR"],
      "CRS-RE1": ["BA", "RE"],
      "CRS-RE2": ["BA", "RE"],
    };

    for (const posto of POSTOS_PADRAO) {
      expect(FUNCOES.filter((f) => aceitoNoPosto(f, posto))).toEqual(esperado[posto.codigo]);
    }
  });

  it("CE não pode ocupar a vaga de LR e vice-versa", () => {
    const f2Ce = POSTOS_PADRAO.find((p) => p.codigo === "F2-CE")!;
    const crsLr = POSTOS_PADRAO.find((p) => p.codigo === "CRS-LR")!;
    expect(aceitoNoPosto("LR", f2Ce)).toBe(false);
    expect(aceitoNoPosto("CE", crsLr)).toBe(false);
  });
});

describe("calendário 12x36", () => {
  const ancora = new Date(2026, 0, 2, 12);

  it("trabalha a noite de 2 e folga a de 3, repetindo", () => {
    expect(ehNoiteDeServico(new Date(2026, 0, 2, 12), ancora, "PAR")).toBe(true);
    expect(ehNoiteDeServico(new Date(2026, 0, 3, 12), ancora, "PAR")).toBe(false);
    expect(ehNoiteDeServico(new Date(2026, 0, 4, 12), ancora, "PAR")).toBe(true);
    expect(ehNoiteDeServico(new Date(2026, 0, 8, 12), ancora, "PAR")).toBe(true);
  });

  it("funciona com datas anteriores à âncora (2 jan é serviço, 1 jan é folga)", () => {
    expect(ehNoiteDeServico(new Date(2026, 0, 2, 12), ancora, "PAR")).toBe(true);
    expect(ehNoiteDeServico(new Date(2026, 0, 1, 12), ancora, "PAR")).toBe(false);
    expect(ehNoiteDeServico(new Date(2025, 11, 31, 12), ancora, "PAR")).toBe(true);
    expect(ehNoiteDeServico(new Date(2025, 11, 30, 12), ancora, "PAR")).toBe(false);
  });

  it("mantém o padrão para trás e para frente da âncora", () => {
    for (const deslocamento of [-730, -60, -30, -10, -2, 0, 2, 10, 30, 60, 730]) {
      expect(ehNoiteDeServico(new Date(2026, 0, 2 + deslocamento, 12), ancora, "PAR")).toBe(true);
    }
  });

  it("dá 15 noites de serviço em um mês de 30 dias", () => {
    expect(noitesDeServicoNoMes(2026, 4, ancora, "PAR")).toHaveLength(15);
    expect(noitesDeServicoNoMes(2026, 0, ancora, "PAR")).toHaveLength(16);
  });

  it("mantém o padrão quando o mês vira (2, 4, 6, 8... sem pular noites)", () => {
    const SERVICES = new Set(
      [
        ...noitesDeServicoNoMes(2026, 3, ancora, "PAR"),
        ...noitesDeServicoNoMes(2026, 4, ancora, "PAR"),
      ].map(paraISO),
    );
    const abril = SERVICES;
    const todas = [
      ...noitesDeServicoNoMes(2026, 3, ancora, "PAR"),
      ...noitesDeServicoNoMes(2026, 4, ancora, "PAR"),
    ].map(paraISO);

    // Duas noites de serviço nunca podem ficar a mais de 2 dias de distância.
    for (let i = 1; i < todas.length; i++) {
      const gap = diffDias(todas[i], todas[i - 1]);
      expect(gap).toBe(2);
    }
    expect(abril.has("2026-04-02")).toBe(true);
    expect(abril.has("2026-04-04")).toBe(true);
  });
});

describe("paridade ímpar/par das noites de serviço", () => {
  const ancoraPar = new Date(2026, 0, 2, 12);
  const ancoraImpar = new Date(2026, 0, 3, 12);

  it("desloca a âncora em um dia quando a paridade pedida não bate com a dela", () => {
    expect(paraISO(ancoraDoCiclo(ancoraPar, "PAR"))).toBe("2026-01-02");
    expect(paraISO(ancoraDoCiclo(ancoraPar, "IMPAR"))).toBe("2026-01-03");
    expect(paraISO(ancoraDoCiclo(ancoraImpar, "IMPAR"))).toBe("2026-01-03");
    expect(paraISO(ancoraDoCiclo(ancoraImpar, "PAR"))).toBe("2026-01-04");
  });

  it("cobra os dias ímpares do mês", () => {
    const noites = noitesDeServicoNoMes(2026, 5, ancoraPar, "IMPAR").map(paraISO);
    expect(noites).toEqual([
      "2026-05-01",
      "2026-05-03",
      "2026-05-05",
      "2026-05-07",
      "2026-05-09",
      "2026-05-11",
      "2026-05-13",
      "2026-05-15",
      "2026-05-17",
      "2026-05-19",
      "2026-05-21",
      "2026-05-23",
      "2026-05-25",
      "2026-05-27",
      "2026-05-29",
      "2026-05-31",
    ]);
  });

  it("cobra os dias pares do mês", () => {
    const noites = noitesDeServicoNoMes(2026, 5, ancoraImpar, "PAR").map(paraISO);
    expect(noites).toHaveLength(15);
    expect(noites[0]).toBe("2026-05-02");
    expect(noites.at(-1)).toBe("2026-05-30");
    expect(noites.every((iso) => Number(iso.slice(8)) % 2 === 0)).toBe(true);
  });

  it("mantém a mesma âncora com paridades diferentes, invertendo as noites", () => {
    const impar = noitesDeServicoNoMes(2026, 1, ancoraPar, "IMPAR").map(paraISO);
    const par = noitesDeServicoNoMes(2026, 1, ancoraPar, "PAR").map(paraISO);
    expect(impar.every((iso) => Number(iso.slice(8)) % 2 === 1)).toBe(true);
    expect(par.every((iso) => Number(iso.slice(8)) % 2 === 0)).toBe(true);
    expect(impar.some((iso) => par.includes(iso))).toBe(false);
    // Janeiro tem 31 dias: 16 ímpares contra 15 pares.
    expect(impar).toHaveLength(16);
    expect(par).toHaveLength(15);
  });

  it("nunca gera duas noites seguidas, em nenhum dos meses, nas duas paridades", () => {
    for (const paridade of ["IMPAR", "PAR"] as const) {
      for (const ancora of [ancoraPar, ancoraImpar]) {
        const todas = [
          ...noitesDeServicoNoMes(2026, 1, ancora, paridade),
          ...noitesDeServicoNoMes(2026, 2, ancora, paridade),
          ...noitesDeServicoNoMes(2026, 3, ancora, paridade),
        ].map(paraISO);

        for (let i = 1; i < todas.length; i++) {
          expect(diffDias(todas[i], todas[i - 1])).toBe(2);
        }
      }
    }
  });

  it("faz a virada de mês de 31 dias sem noite dupla nem noite perdida", () => {
    const paridade = "PAR" as const;
    const janeiro = noitesDeServicoNoMes(2026, 1, ancoraImpar, paridade).map(paraISO);
    const fevereiro = noitesDeServicoNoMes(2026, 2, ancoraImpar, paridade).map(paraISO);

    // Janeiro de 31 dias: o dia 31 é ímpar, então a última noite é dia 30.
    expect(janeiro.at(-1)).toBe("2026-01-30");
    expect(fevereiro[0]).toBe("2026-02-01");
    expect(diffDias(fevereiro[0], janeiro.at(-1)!)).toBe(2);
  });
});

describe("navegação entre meses", () => {
  it("vira o ano corretamente", () => {
    expect(mesSeguinte({ ano: 2026, mes: 12 })).toEqual({ ano: 2027, mes: 1 });
    expect(mesAnterior({ ano: 2027, mes: 1 })).toEqual({ ano: 2026, mes: 12 });
  });

  it("soma meses em qualquer direção", () => {
    expect(somarMeses({ ano: 2026, mes: 11 }, 3)).toEqual({ ano: 2027, mes: 2 });
    expect(somarMeses({ ano: 2026, mes: 2 }, -3)).toEqual({ ano: 2025, mes: 11 });
  });

  it("gera a chave AAAA-MM e volta", () => {
    expect(chaveAnoMes({ ano: 2026, mes: 3 })).toBe("2026-03");
    expect(diasDoMes(2026, 2)).toHaveLength(28);
    expect(diasDoMes(2024, 2)).toHaveLength(29);
  });
});
