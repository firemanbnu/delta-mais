import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { absences, people } from "@/db/schema";
import {
  ausentesNoMes,
  buscarPeriodo,
  criarMesManual,
  definirOcupante,
  estatisticasQuadro,
  excluirPeriodo,
  garantirTimePadrao,
  gerarMesSeguinte,
  listarPessoasAtivas,
  lerConfiguracoes,
  listarPeriodos,
  listarPostos,
  listarTimes,
  montarEscala,
  periodoVigente,
  publicarPeriodo,
  regerarAutomatico,
  salvarConfiguracoes,
  restaurarAutomatico,
  semearPostos,
  sugestoesParaVaga,
  voltarParaRascunho,
} from "@/db/repositorio";
import { POSTOS_PADRAO } from "@/lib/dominio";
import { criarBancoDeTeste, preencherMes, semearQuadro, type BancoDeTeste } from "./helpers/banco";

const JANEIRO = { ano: 2026, mes: 1 };
const FEVEREIRO = { ano: 2026, mes: 2 };

let banco: BancoDeTeste;
let ids: Map<string, number>;

beforeEach(async () => {
  banco ??= await criarBancoDeTeste();
  await banco.limpar();
  ids = await semearQuadro(banco.db);
});

/** Falha alto quando o repositório devolveu `null` no lugar da escala. */
function exigir<T>(valor: T | null): T {
  if (valor === null) throw new Error("Escala não encontrada.");
  return valor;
}

afterAll(async () => {
  await banco.cliente.close();
});

describe("cadastros", () => {
  it("sem os 10 postos do plantão e não duplica", async () => {
    await semearPostos();
    await semearPostos();

    const postos = await listarPostos();
    expect(postos.map((p) => p.codigo)).toEqual(POSTOS_PADRAO.map((p) => p.codigo));
    expect(postos.find((p) => p.codigo === "F3-BA2")?.comunicacao).toBe(true);
  });

  it("cria o time padrão uma única vez", async () => {
    await garantirTimePadrao();
    await garantirTimePadrao();

    expect(await listarTimes()).toHaveLength(1);
  });

  it("só considera ativos na lista de quem pode ser escalado", async () => {
    const [carla] = await banco.db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.nome, "Carla Souza"));

    await banco.db.update(people).set({ ativo: false }).where(eq(people.id, carla.id));

    const ativos = await listarPessoasAtivas();
    expect(ativos).toHaveLength(9);
    expect(ativos.map((p) => p.nome)).not.toContain("Carla Souza");
  });

  it("conta o quadro ativo por função", async () => {
    expect(await estatisticasQuadro()).toMatchObject({ CE: 1, LR: 1, MC: 3 });
  });
});

describe("configurações", () => {
  it("começa com a âncora padrão no início da escala de rádio", async () => {
    const config = await lerConfiguracoes();

    expect(config.dataAncora).toBe("2026-10-02");
    expect(config.noiteDeServico).toBe("PAR");
    expect(config.radioAncora).toBe("2026-10-02");
  });

  it("guarda a troca de ímpar para par sem perder o resto", async () => {
    await salvarConfiguracoes({ turnoInicio: "20:00" });

    const config = await salvarConfiguracoes({ noiteDeServico: "PAR" });

    expect(config.noiteDeServico).toBe("PAR");
    expect(config.turnoInicio).toBe("20:00:00");
    expect(config.dataAncora).toBe("2026-10-02");
  });

  it("não perde a paridade quando outro campo é salvo", async () => {
    await salvarConfiguracoes({ noiteDeServico: "PAR" });

    const config = await salvarConfiguracoes({ turnoFim: "08:00" });

    expect(config.noiteDeServico).toBe("PAR");
    expect(config.turnoFim).toBe("08:00:00");
  });

  it("guarda o início da escala de rádio", async () => {
    await salvarConfiguracoes({ radioAncora: "2026-11-01" });

    const config = await salvarConfiguracoes({ turnoFim: "07:00" });

    expect(config.radioAncora).toBe("2026-11-01");
    expect(config.turnoFim).toBe("07:00:00");
  });
});

describe("ciclo do mês", () => {
  it("abre o mês em branco com as 10 vagas", async () => {
    const escala = await criarMesManual(JANEIRO);

    expect(escala.periodo.status).toBe("RASCUNHO");
    expect(Object.keys(escala.estado)).toHaveLength(10);
    expect(Object.values(escala.estado).every((vaga) => vaga === null)).toBe(true);
    expect(escala.problemas.filter((p) => p.severidade === "erro")).toHaveLength(10);
  });

  it("não deixa a mesma pessoa em duas vagas no mesmo mês", async () => {
    await criarMesManual(JANEIRO);

    await definirOcupante(JANEIRO, "F2-MC", ids.get("Carla Souza")!, "MANUAL");

    await expect(
      definirOcupante(JANEIRO, "F3-MC", ids.get("Carla Souza")!, "MANUAL"),
    ).rejects.toThrow(/já está na vaga F2-MC/);
  });

  it("exige mês anterior para gerar pelo rodízio", async () => {
    await expect(gerarMesSeguinte(FEVEREIRO)).rejects.toThrow(/mês anterior/);
  });

  it("gera o mês seguinte girando os ciclos e mantendo os postos fixos", async () => {
    const janeiro = await preencherMes(JANEIRO, ids);
    const fevereiro = await gerarMesSeguinte(FEVEREIRO);

    expect(fevereiro.estado["F3-MC"]).toBe(janeiro.estado["F2-MC"]);
    expect(fevereiro.estado["CRS-MC"]).toBe(janeiro.estado["F3-MC"]);
    expect(fevereiro.estado["F2-MC"]).toBe(janeiro.estado["CRS-MC"]);
    expect(fevereiro.estado["F2-BA"]).toBe(janeiro.estado["CRS-RE2"]);
    expect(fevereiro.estado["F2-CE"]).toBe(janeiro.estado["F2-CE"]);
    expect(fevereiro.estado["CRS-LR"]).toBe(janeiro.estado["CRS-LR"]);
    expect(fevereiro.problemas.filter((p) => p.severidade === "erro")).toEqual([]);
    expect(Object.values(fevereiro.origens)).toEqual(Array(10).fill("AUTO"));
  });

  it("só regenera as vagas automáticas e preserva as manuais", async () => {
    await preencherMes(JANEIRO, ids);
    const automatico = await gerarMesSeguinte(FEVEREIRO);

    // Troca manual entre duas vagas do ciclo MC, que em fevereiro são de Elisa e Carla.
    await definirOcupante(FEVEREIRO, "F2-MC", null, "AUTO");
    await definirOcupante(FEVEREIRO, "F3-MC", null, "AUTO");
    const carla = ids.get("Carla Souza")!;
    const elisa = ids.get("Elisa Prado")!;
    await definirOcupante(FEVEREIRO, "F2-MC", carla, "MANUAL");
    await definirOcupante(FEVEREIRO, "F3-MC", elisa, "MANUAL");

    const regravado = await regerarAutomatico(FEVEREIRO);

    expect(regravado.estado["F2-MC"]).toBe(String(carla));
    expect(regravado.estado["F3-MC"]).toBe(String(elisa));
    expect(regravado.origens["F2-MC"]).toBe("MANUAL");
    expect(regravado.origens["F3-MC"]).toBe("MANUAL");
    expect(regravado.estado["CRS-MC"]).toBe(automatico.estado["CRS-MC"]);
    expect(regravado.regravadas).toBe(8);
  });

  it("devolve uma vaga manual ao valor do rodízio", async () => {
    await preencherMes(JANEIRO, ids);
    const automatico = await gerarMesSeguinte(FEVEREIRO);

    for (const vaga of ["F2-MC", "F3-MC", "CRS-MC"]) {
      await definirOcupante(FEVEREIRO, vaga, null, "AUTO");
    }
    await definirOcupante(FEVEREIRO, "F3-MC", ids.get("Elisa Prado")!, "MANUAL");

    const restaurado = exigir(await restaurarAutomatico(FEVEREIRO, "F3-MC"));

    expect(restaurado.estado["F3-MC"]).toBe(automatico.estado["F3-MC"]);
    expect(restaurado.origens["F3-MC"]).toBe("AUTO");
  });

  it("sugere só gente da função que ainda não está em vaga nem ausente", async () => {
    await preencherMes(JANEIRO, ids);
    await criarMesManual(FEVEREIRO);
    await banco.db.insert(absences).values({
      pessoaId: ids.get("Elisa Prado")!,
      inicio: "2026-02-03",
      fim: "2026-02-10",
      tipo: "FERIAS",
    });

    const nomes = (await sugestoesParaVaga(FEVEREIRO, "CRS-MC")).map((p) => p.nome);

    expect(nomes).toEqual(["Carla Souza", "Diego Ramos"]);
  });
});

describe("publicação", () => {
  it("recusa mês incompleto", async () => {
    await criarMesManual(JANEIRO);

    await expect(publicarPeriodo(JANEIRO)).rejects.toThrow(/Não é possível publicar/);
    expect((await buscarPeriodo(JANEIRO))?.status).toBe("RASCUNHO");
  });

  it("publica mês completo e volta para rascunho", async () => {
    await preencherMes(JANEIRO, ids);

    const publicado = exigir(await publicarPeriodo(JANEIRO));
    expect(publicado.periodo.status).toBe("PUBLICADO");
    expect(publicado.periodo.publicadoEm).toBeInstanceOf(Date);

    const rascunho = exigir(await voltarParaRascunho(JANEIRO));
    expect(rascunho.periodo.status).toBe("RASCUNHO");
    expect(rascunho.periodo.publicadoEm).toBeNull();
  });
});

describe("ausências", () => {
  it("acha ausência que cobre só parte do mês", async () => {
    await preencherMes(JANEIRO, ids);
    await banco.db.insert(absences).values({
      pessoaId: ids.get("Elisa Prado")!,
      inicio: "2026-01-20",
      fim: "2026-02-05",
      tipo: "ATESTADO",
    });

    expect(await ausentesNoMes(JANEIRO)).toEqual([String(ids.get("Elisa Prado"))]);
    expect(await ausentesNoMes(FEVEREIRO)).toEqual([String(ids.get("Elisa Prado"))]);
  });

  it("ignora ausência de outro mês", async () => {
    await preencherMes(JANEIRO, ids);
    await banco.db.insert(absences).values({
      pessoaId: ids.get("Elisa Prado")!,
      inicio: "2026-03-01",
      fim: "2026-03-10",
      tipo: "FERIAS",
    });

    expect(await ausentesNoMes(JANEIRO)).toEqual([]);
  });

  it("gera aviso, não erro, para quem está escalado e ausente", async () => {
    await preencherMes(JANEIRO, ids);
    await banco.db.insert(absences).values({
      pessoaId: ids.get("Elisa Prado")!,
      inicio: "2026-01-05",
      fim: "2026-01-09",
      tipo: "DISPENSA",
    });

    const escala = await montarEscala(JANEIRO);

    expect(escala?.problemas.filter((p) => p.severidade === "erro")).toEqual([]);
    expect(escala?.problemas.some((p) => p.mensagem.includes("Elisa Prado"))).toBe(true);
  });
});

describe("meses cadastrados", () => {
  it("exclui o mês junto com as vagas", async () => {
    await preencherMes(JANEIRO, ids);

    await excluirPeriodo(JANEIRO);

    expect(await buscarPeriodo(JANEIRO)).toBeNull();
    expect(await montarEscala(JANEIRO)).toBeNull();
    expect(await listarPeriodos()).toEqual([]);
  });

  it("usa o mês atual e, sem ele, o último anterior", async () => {
    expect(await periodoVigente(new Date(2026, 0, 15))).toBeNull();

    await criarMesManual(JANEIRO);

    expect(await periodoVigente(new Date(2026, 0, 15))).toEqual(JANEIRO);
    expect(await periodoVigente(new Date(2026, 2, 10))).toEqual(JANEIRO);
  });
});