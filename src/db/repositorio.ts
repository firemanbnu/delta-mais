import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { getDb } from "./index";
import { POSTOS_PADRAO, type Funcao, type NoiteDeServico } from "@/lib/dominio";
import type { TipoTarefa } from "@/lib/automacao";
import { chaveAnoMes, formatarDataBR, paraISO, rotuloMes, type AnoMes } from "@/lib/calendario";
import {
  avancarRodizio,
  sugerirParaPosto,
  validarComposicao,
  type EstadoPosts,
  type PessoaResumo,
  type Posto,
  type Problema,
} from "@/lib/rotacao";
import {
  OPERADORES_POR_ANEL,
  OPERADORES_RADIO_PADRAO,
  POSTO_COMUNICACAO,
  SLOTS_RODIZIO,
  TIME_RADIO,
  montarGradeDoMes,
  noitesDeRadioNoMes,
  validarAneis,
  validarConfigRadio,
  validarGradeRadio,
  type AneisRadio,
  type ConfigRadio,
  type NoiteDeRadio,
  type OperadorRadio,
} from "@/lib/radio";
import {
  absences,
  assignments,
  automacaoAgente,
  automacaoComando,
  automacaoPosicao,
  people,
  periods,
  posts,
  radioAnel,
  radioExcecao,
  settings,
  teams,
  type AutomacaoAgente,
  type AutomacaoComando,
  type AutomacaoPosicao,
} from "./schema";

export type PessoaComEquipe = {
  id: number;
  nome: string;
  funcao: Funcao;
  matricula: string | null;
  telefone: string | null;
  postoFixo: string | null;
  ativo: boolean;
  ordem: number;
  observacoes: string | null;
  equipeId: number;
};

export type PeriodoCompleto = {
  id: number;
  ano: number;
  mes: number;
  status: "RASCUNHO" | "PUBLICADO";
  observacoes: string | null;
  publicadoEm: Date | null;
};

export type EscalaDoMes = {
  periodo: PeriodoCompleto;
  postos: Posto[];
  estado: EstadoPosts;
  origens: Record<string, "AUTO" | "MANUAL">;
  pessoas: PessoaResumo[];
  ausentes: string[];
  problemas: Problema[];
  /** Quantas vagas automáticas foram regravadas (só em regerarAutomatico). */
  regravadas?: number;
};

function paraResumo(p: { id: number; nome: string; funcao: Funcao }) {
  return { id: String(p.id), nome: p.nome, funcao: p.funcao };
}

export async function listarTimes() {
  return getDb().select().from(teams).orderBy(asc(teams.nome));
}

export async function garantirTimePadrao(nome = "Equipe de Plantão") {
  const db = getDb();
  const [existente] = await db.select().from(teams).where(eq(teams.nome, nome)).limit(1);
  if (existente) return existente;
  const [criado] = await db
    .insert(teams)
    .values({ nome, descricao: "Equipe do plantão noturno 19h às 7h (12x36)" })
    .returning();
  return criado;
}

export async function listarPessoas(equipeId?: number): Promise<PessoaComEquipe[]> {
  const db = getDb();
  const consulta = db.select().from(people).orderBy(asc(people.ordem), asc(people.nome));
  const resultado = equipeId
    ? await consulta.where(eq(people.equipeId, equipeId))
    : await consulta;
  return resultado;
}

export async function listarPessoasAtivas(): Promise<PessoaResumo[]> {
  const db = getDb();
  const linhas = await db
    .select({
      id: people.id,
      nome: people.nome,
      funcao: people.funcao,
    })
    .from(people)
    .where(eq(people.ativo, true))
    .orderBy(asc(people.nome));

  return linhas.map(paraResumo);
}

export async function listarPostos(): Promise<Posto[]> {
  const db = getDb();
  const linhas = await db
    .select()
    .from(posts)
    .where(eq(posts.ativo, true))
    .orderBy(asc(posts.ordem));

  return linhas.map((p) => ({
    codigo: p.codigo,
    unidade: p.unidade,
    rotulo: p.rotulo,
    grupo: p.grupo,
    posicaoNoCiclo: p.posicaoNoCiclo,
    comunicacao: p.comunicacao,
    funcoes: p.funcoes,
  }));
}

export async function semearPostos() {
  const db = getDb();
  const existentes = await db.select({ codigo: posts.codigo }).from(posts);
  const jaCadastrados = new Set<string>(existentes.map((p) => p.codigo));

  const faltantes = POSTOS_PADRAO.filter((p) => !jaCadastrados.has(p.codigo));
  if (faltantes.length === 0) return;

  await db
    .insert(posts)
    .values(
      faltantes.map((p) => ({
        codigo: p.codigo,
        unidade: p.unidade,
        rotulo: p.rotulo,
        grupo: p.grupo,
        posicaoNoCiclo: p.posicaoNoCiclo,
        ordem: p.ordem,
        comunicacao: p.comunicacao,
        funcoes: [...p.funcoes],
      })),
    )
    .onConflictDoNothing({ target: posts.codigo });
}

export async function lerConfiguracoes() {
  const db = getDb();
  const [linha] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (linha) return linha;

  const equipe = await garantirTimePadrao();
  const [criada] = await db
    .insert(settings)
    .values({ id: 1, equipeId: equipe.id })
    .returning();
  return criada;
}

export async function salvarConfiguracoes(
  dados: Partial<{
    turnoInicio: string;
    turnoFim: string;
    dataAncora: string;
    noiteDeServico: NoiteDeServico;
    radioAncora: string;
    equipeId: number | null;
    observacoes: string | null;
  }>,
) {
  const db = getDb();
  const atual = await lerConfiguracoes();
  await db
    .update(settings)
    .set({
      turnoInicio: dados.turnoInicio ?? atual.turnoInicio,
      turnoFim: dados.turnoFim ?? atual.turnoFim,
      dataAncora: dados.dataAncora ?? atual.dataAncora,
      noiteDeServico: dados.noiteDeServico ?? atual.noiteDeServico,
      radioAncora: dados.radioAncora ?? atual.radioAncora,
      equipeId: dados.equipeId === undefined ? atual.equipeId : dados.equipeId,
      observacoes: dados.observacoes === undefined ? atual.observacoes : dados.observacoes,
      atualizadoEm: new Date(),
    })
    .where(eq(settings.id, 1));
  return lerConfiguracoes();
}

export async function listarAusencias() {
  const db = getDb();
  return db
    .select()
    .from(absences)
    .orderBy(asc(absences.inicio), asc(absences.fim));
}

/** Ids das pessoas com falta/atestado/serviço que cobre o mês inteiro ou parte dele. */
export async function ausentesNoMes(anoMes: AnoMes): Promise<string[]> {
  const db = getDb();
  const { ano, mes } = anoMes;
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = paraISO(new Date(ano, mes, 0));

  const linhas = await db
    .select({ pessoaId: absences.pessoaId })
    .from(absences)
    .where(and(lte(absences.inicio, fim), gte(absences.fim, inicio)));

  return [...new Set(linhas.map((l) => String(l.pessoaId)))];
}

export async function listarPeriodos() {
  const db = getDb();
  return db.select().from(periods).orderBy(asc(periods.ano), asc(periods.mes));
}

export async function buscarPeriodo(anoMes: AnoMes): Promise<PeriodoCompleto | null> {
  const db = getDb();
  const [linha] = await db
    .select()
    .from(periods)
    .where(and(eq(periods.ano, anoMes.ano), eq(periods.mes, anoMes.mes)))
    .limit(1);
  return linha ?? null;
}

export async function PeriodoAnterior(anoMes: AnoMes): Promise<PeriodoCompleto | null> {
  const db = getDb();
  const [linha] = await db
    .select()
    .from(periods)
    .where(sql`(${periods.ano} * 12 + ${periods.mes}) < ${anoMes.ano * 12 + anoMes.mes}`)
    .orderBy(sql`(${periods.ano} * 12 + ${periods.mes}) desc`)
    .limit(1);
  return linha ?? null;
}

async function garantirPeriodo(anoMes: AnoMes): Promise<PeriodoCompleto> {
  const existente = await buscarPeriodo(anoMes);
  if (existente) return existente;
  const db = getDb();
  const [criado] = await db
    .insert(periods)
    .values({ ano: anoMes.ano, mes: anoMes.mes })
    .returning();
  return criado;
}

export async function estadoDoPeriodo(periodoId: number): Promise<EstadoPosts> {
  const db = getDb();
  const linhas = await db
    .select({
      codigo: posts.codigo,
      pessoaId: assignments.pessoaId,
    })
    .from(assignments)
    .innerJoin(posts, eq(assignments.postoId, posts.id))
    .where(eq(assignments.periodoId, periodoId));

  const estado: EstadoPosts = {};
  for (const linha of linhas) {
    estado[linha.codigo] = linha.pessoaId === null ? null : String(linha.pessoaId);
  }
  return estado;
}

export async function origensDoPeriodo(
  periodoId: number,
): Promise<Record<string, "AUTO" | "MANUAL">> {
  const db = getDb();
  const linhas = await db
    .select({ codigo: posts.codigo, origem: assignments.origem })
    .from(assignments)
    .innerJoin(posts, eq(assignments.postoId, posts.id))
    .where(eq(assignments.periodoId, periodoId));

  return Object.fromEntries(linhas.map((l) => [l.codigo, l.origem]));
}

export async function montarEscala(anoMes: AnoMes): Promise<EscalaDoMes | null> {
  const periodo = await buscarPeriodo(anoMes);
  if (!periodo) return null;

  const [listaPostos, listaPessoas, ausentes, origens] = await Promise.all([
    listarPostos(),
    listarPessoasAtivas(),
    ausentesNoMes(anoMes),
    origensDoPeriodo(periodo.id),
  ]);

  const estado = await estadoDoPeriodo(periodo.id);
  const completo: EstadoPosts = {};
  for (const posto of listaPostos) {
    completo[posto.codigo] = estado[posto.codigo] ?? null;
  }

  return {
    periodo,
    postos: listaPostos,
    estado: completo,
    origens,
    pessoas: listaPessoas,
    ausentes,
    problemas: validarComposicao(completo, listaPessoas, listaPostos, ausentes),
  };
}

/** Cria o mês em branco para preenchimento manual (primeira vez). */
export async function criarMesManual(anoMes: AnoMes): Promise<EscalaDoMes> {
  const db = getDb();
  const periodo = await garantirPeriodo(anoMes);

  const linhas = await db.select({ id: posts.id, codigo: posts.codigo }).from(posts);
  const idPorCodigo = new Map(linhas.map((l) => [l.codigo, l.id]));

  const existentes = await db
    .select({ postoId: assignments.postoId })
    .from(assignments)
    .where(eq(assignments.periodoId, periodo.id));
  const jaCriados = new Set(existentes.map((a) => a.postoId));

  const listaPostos = await listarPostos();
  const faltantes = listaPostos.filter((p) => {
    const id = idPorCodigo.get(p.codigo);
    return id !== undefined && !jaCriados.has(id);
  });

  if (faltantes.length > 0) {
    await db.insert(assignments).values(
      faltantes.map((p) => ({
        periodoId: periodo.id,
        postoId: idPorCodigo.get(p.codigo)!,
        pessoaId: null,
        origem: "MANUAL" as const,
      })),
    );
  }

  const escala = await montarEscala(anoMes);
  if (!escala) throw new Error("Não foi possível montar a escala recém-criada.");
  return escala;
}

/** Gera o mês aplicando o rodízio sobre o estado do mês anterior. */
export async function gerarMesSeguinte(anoMes: AnoMes): Promise<EscalaDoMes> {
  const db = getDb();
  const anterior = await PeriodoAnterior(anoMes);
  if (!anterior) {
    throw new Error(
      "Não existe mês anterior para gerar o rodízio. Preencha o primeiro mês manualmente.",
    );
  }

  const listaPostos = await listarPostos();
  const estadoAnterior = await estadoDoPeriodo(anterior.id);
  const proximo = avancarRodizio(estadoAnterior, listaPostos);

  const periodo = await garantirPeriodo(anoMes);

  const linhas = await db.select({ id: posts.id, codigo: posts.codigo }).from(posts);
  const idPorCodigo = new Map(linhas.map((l) => [l.codigo, l.id]));

  await db.delete(assignments).where(eq(assignments.periodoId, periodo.id));
  await db.insert(assignments).values(
    listaPostos.map((posto) => ({
      periodoId: periodo.id,
      postoId: idPorCodigo.get(posto.codigo)!,
      pessoaId: proximo[posto.codigo] ? Number(proximo[posto.codigo]) : null,
      origem: "AUTO" as const,
    })),
  );

  const escala = await montarEscala(anoMes);
  if (!escala) throw new Error("Não foi possível montar a escala recém-gerada.");
  return escala;
}

/** Regera só as vagas que ainda não foram alteradas manualmente. */
export async function regerarAutomatico(anoMes: AnoMes): Promise<EscalaDoMes> {
  const db = getDb();
  const periodo = await buscarPeriodo(anoMes);
  if (!periodo) throw new Error("Mês não encontrado.");
  const anterior = await PeriodoAnterior(anoMes);
  if (!anterior) throw new Error("Não existe mês anterior para regenerar.");

  const listaPostos = await listarPostos();
  const automatico = avancarRodizio(await estadoDoPeriodo(anterior.id), listaPostos);

  const codigoPorId = new Map(
    (await db.select({ id: posts.id, codigo: posts.codigo }).from(posts)).map((p) => [
      p.id,
      p.codigo,
    ]),
  );

  const linhas = await db
    .select({
      id: assignments.id,
      postoId: assignments.postoId,
      origem: assignments.origem,
    })
    .from(assignments)
    .where(eq(assignments.periodoId, periodo.id));

  const regravaveis = linhas.filter((linha) => {
    if (linha.origem !== "AUTO") return false;
    return codigoPorId.has(linha.postoId);
  });

  if (regravaveis.length === 0) {
    throw new Error(
      "Nenhuma vaga automática para regenerar: todas as vagas deste mês foram alteradas manualmente.",
    );
  }

  let regravadas = 0;
  for (const linha of regravaveis) {
    const codigo = codigoPorId.get(linha.postoId)!;
    const pessoaId = automatico[codigo];
    await db
      .update(assignments)
      .set({
        pessoaId: pessoaId ? Number(pessoaId) : null,
        origem: "AUTO",
        atualizadoEm: new Date(),
      })
      .where(eq(assignments.id, linha.id));
    regravadas += 1;
  }

  const escala = await montarEscala(anoMes);
  if (!escala) throw new Error("Não foi possível remontar a escala.");
  return { ...escala, regravadas };
}

export async function definirOcupante(
  anoMes: AnoMes,
  codigoPosto: string,
  pessoaId: number | null,
  origem: "AUTO" | "MANUAL",
) {
  const db = getDb();
  const periodo = await garantirPeriodo(anoMes);

  const [posto] = await db.select().from(posts).where(eq(posts.codigo, codigoPosto)).limit(1);
  if (!posto) throw new Error(`Posto ${codigoPosto} não encontrado.`);

  if (pessoaId === null) {
    await db
      .update(assignments)
      .set({ pessoaId: null, origem, atualizadoEm: new Date() })
      .where(
        and(
          eq(assignments.periodoId, periodo.id),
          eq(assignments.postoId, posto.id),
        ),
      );
    return montarEscala(anoMes);
  }

  const [duplicada] = await db
    .select({
      codigo: posts.codigo,
      postoId: assignments.postoId,
    })
    .from(assignments)
    .innerJoin(posts, eq(assignments.postoId, posts.id))
    .where(
      and(
        eq(assignments.periodoId, periodo.id),
        eq(assignments.pessoaId, pessoaId),
      ),
    );

  if (duplicada && duplicada.codigo !== codigoPosto) {
    throw new Error(
      `Esta pessoa já está na vaga ${duplicada.codigo}. Remova-a de lá antes de colocá-la em ${codigoPosto}.`,
    );
  }

  await db
    .update(assignments)
    .set({ pessoaId, origem, atualizadoEm: new Date() })
    .where(
      and(eq(assignments.periodoId, periodo.id), eq(assignments.postoId, posto.id)),
    );

  return montarEscala(anoMes);
}

export async function restaurarAutomatico(anoMes: AnoMes, codigoPosto: string) {
  const db = getDb();
  const periodo = await buscarPeriodo(anoMes);
  if (!periodo) throw new Error("Mês não encontrado.");
  const anterior = await PeriodoAnterior(anoMes);
  if (!anterior) throw new Error("Não existe mês anterior.");

  const listaPostos = await listarPostos();
  const estadoAnterior = await estadoDoPeriodo(anterior.id);
  const automatico = avancarRodizio(estadoAnterior, listaPostos);

  const [posto] = await db.select().from(posts).where(eq(posts.codigo, codigoPosto)).limit(1);
  if (!posto) throw new Error(`Posto ${codigoPosto} não encontrado.`);

  const pessoaId = automatico[codigoPosto];
  await db
    .update(assignments)
    .set({ pessoaId: pessoaId ? Number(pessoaId) : null, origem: "AUTO", atualizadoEm: new Date() })
    .where(and(eq(assignments.periodoId, periodo.id), eq(assignments.postoId, posto.id)));

  return montarEscala(anoMes);
}

export async function publicarPeriodo(anoMes: AnoMes) {
  const db = getDb();
  const escala = await montarEscala(anoMes);
  if (!escala) throw new Error("Mês não encontrado.");
  const erros = escala.problemas.filter((p) => p.severidade === "erro");
  if (erros.length > 0) {
    throw new Error(
      `Não é possível publicar: ${erros.length} erro(s) na escala. ${erros[0].mensagem}`,
    );
  }

  await db
    .update(periods)
    .set({ status: "PUBLICADO", publicadoEm: new Date() })
    .where(and(eq(periods.ano, anoMes.ano), eq(periods.mes, anoMes.mes)));

  return montarEscala(anoMes);
}

export async function voltarParaRascunho(anoMes: AnoMes) {
  const db = getDb();
  await db
    .update(periods)
    .set({ status: "RASCUNHO", publicadoEm: null })
    .where(and(eq(periods.ano, anoMes.ano), eq(periods.mes, anoMes.mes)));
  return montarEscala(anoMes);
}

export async function excluirPeriodo(anoMes: AnoMes) {
  const db = getDb();
  const periodo = await buscarPeriodo(anoMes);
  if (!periodo) return;
  await db.delete(assignments).where(eq(assignments.periodoId, periodo.id));
  await db.delete(periods).where(eq(periods.id, periodo.id));
}

export async function sugestoesParaVaga(
  anoMes: AnoMes,
  codigoPosto: string,
): Promise<PessoaResumo[]> {
  const escala = await montarEscala(anoMes);
  if (!escala) return [];
  const posto = escala.postos.find((p) => p.codigo === codigoPosto);
  if (!posto) return [];
  return sugerirParaPosto(posto, escala.estado, escala.pessoas, escala.ausentes);
}

export async function periodoVigente(referencia: Date): Promise<AnoMes | null> {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth() + 1;

  const periodo = await buscarPeriodo({ ano, mes });
  if (periodo) return { ano, mes };

  const linhas = await listarPeriodos();
  const alvo = ano * 12 + mes;
  const anteriores = linhas.filter((p) => p.ano * 12 + p.mes <= alvo);
  const ultimo = anteriores.at(-1);
  return ultimo ? { ano: ultimo.ano, mes: ultimo.mes } : null;
}

export async function estatisticasQuadro() {
  const db = getDb();
  const linhas = await db
    .select({ funcao: people.funcao, total: sql<number>`count(*)::int` })
    .from(people)
    .where(eq(people.ativo, true))
    .groupBy(people.funcao);

  const mapa: Record<string, number> = {};
  for (const linha of linhas) mapa[linha.funcao] = linha.total;
  return mapa;
}

export { chaveAnoMes };

/* ------------------------------------------------------------------ rádio */

export type EscalaRadio = {
  config: ConfigRadio;
  /** Noites do mês que já entraram na escala de rádio. */
  noites: NoiteDeRadio[];
  operadores: OperadorRadio[];
  aneis: AneisRadio;
  nomesPorId: Record<string, string>;
  ausentes: string[];
  problemas: Problema[];
  /** Id e nome do bombeiro do F3-BA2 do mês, das faixas fixas. */
  comunicacao: { pessoaId: string; nome: string } | null;
};

/** Cria a equipe de rádio e as posições dos dois anéis, uma vez só. */
export async function semearOperadoresRadio() {
  const db = getDb();
  const [contagem] = await db.select({ total: sql<number>`count(*)::int` }).from(radioAnel);
  if (Number(contagem?.total ?? 0) >= OPERADORES_POR_ANEL * 2) return;

  const equipe = await garantirTimePadrao(TIME_RADIO);
  const doTime = await db
    .select({ id: people.id, nome: people.nome })
    .from(people)
    .where(eq(people.equipeId, equipe.id));
  const idPorNome = new Map(doTime.map((p) => [p.nome.trim().toLowerCase(), p.id]));

  for (const operador of OPERADORES_RADIO_PADRAO) {
    const chave = operador.nome.trim().toLowerCase();
    let pessoaId = idPorNome.get(chave);

    if (pessoaId === undefined) {
      const [criada] = await db
        .insert(people)
        .values({
          equipeId: equipe.id,
          nome: operador.nome,
          funcao: "RADIO",
          ordem: operador.anel * 10 + operador.ordem,
        })
        .returning({ id: people.id });
      pessoaId = criada.id;
      idPorNome.set(chave, pessoaId);
    }

    await db
      .insert(radioAnel)
      .values({ pessoaId, anel: operador.anel, ordem: operador.ordem })
      .onConflictDoNothing({ target: radioAnel.pessoaId });
  }
}

export async function listarOperadoresRadio(): Promise<OperadorRadio[]> {
  const db = getDb();
  const linhas = await db
    .select({
      id: people.id,
      nome: people.nome,
      anel: radioAnel.anel,
      ordem: radioAnel.ordem,
      ativo: people.ativo,
    })
    .from(radioAnel)
    .innerJoin(people, eq(radioAnel.pessoaId, people.id))
    .orderBy(asc(radioAnel.anel), asc(radioAnel.ordem));

  return linhas.map((linha) => ({
    id: String(linha.id),
    nome: linha.nome,
    anel: linha.anel === 2 ? 2 : 1,
    ordem: linha.ordem,
    ativo: linha.ativo,
  }));
}

/**
 * Anéis na ordem do rodízio. Operador inativo sai da roda: a faixa dele fica
 * vazia e a validação aponta o problema, em vez de escalar alguém fora de serviço.
 */
export function aneisDe(operadores: readonly OperadorRadio[]): AneisRadio {
  const aneis: AneisRadio = { 1: [], 2: [] };
  for (const operador of operadores) {
    if (!operador.ativo) continue;
    aneis[operador.anel].push(operador.id);
  }
  return aneis;
}

async function excecoesDoPeriodo(
  periodoId: number,
): Promise<{ data: string; slot: string; pessoaId: string }[]> {
  const db = getDb();
  const linhas = await db
    .select({ data: radioExcecao.data, slot: radioExcecao.slot, pessoaId: radioExcecao.pessoaId })
    .from(radioExcecao)
    .where(eq(radioExcecao.periodoId, periodoId));

  return linhas.map((linha) => ({
    data: String(linha.data).slice(0, 10),
    slot: linha.slot,
    pessoaId: String(linha.pessoaId),
  }));
}

function configRadioDe(config: {
  dataAncora: string;
  noiteDeServico: NoiteDeServico;
  radioAncora: string;
}): ConfigRadio {
  return {
    dataAncora: String(config.dataAncora).slice(0, 10),
    noiteDeServico: config.noiteDeServico,
    radioAncora: String(config.radioAncora).slice(0, 10),
  };
}

/**
 * Escala de rádio do mês: as noites de serviço do plantão a partir da âncora do
 * rádio, já com o rodízio aplicado e as trocas manuais por cima.
 */
export async function montarEscalaRadio(
  anoMes: AnoMes,
  planta: EscalaDoMes | null = null,
): Promise<EscalaRadio | null> {
  const config = await lerConfiguracoes();
  const periodo = await buscarPeriodo(anoMes);
  if (!periodo) return null;

  const [operadores, ausentes, plantaDoMes, excecoes] = await Promise.all([
    listarOperadoresRadio(),
    ausentesNoMes(anoMes),
    planta ? Promise.resolve(planta) : montarEscala(anoMes),
    excecoesDoPeriodo(periodo.id),
  ]);

  const configRadio = configRadioDe(config);
  const aneis = aneisDe(operadores);
  const noites = montarGradeDoMes(anoMes, configRadio, aneis, excecoes);
  const nomesPorId = Object.fromEntries(operadores.map((o) => [o.id, o.nome]));

  const pessoaDaComunicacao = plantaDoMes?.estado[POSTO_COMUNICACAO] ?? null;
  const nomesDoPlantao = new Map((plantaDoMes?.pessoas ?? []).map((p) => [p.id, p.nome]));

  const problemas = [
    ...validarConfigRadio(configRadio),
    ...validarAneis(aneis, operadores),
    ...validarGradeRadio(noites, new Map(Object.entries(nomesPorId)), ausentes),
  ];

  return {
    config: configRadio,
    noites,
    operadores,
    aneis,
    nomesPorId,
    ausentes,
    problemas,
    comunicacao: pessoaDaComunicacao
      ? {
          pessoaId: pessoaDaComunicacao,
          nome: nomesDoPlantao.get(pessoaDaComunicacao) ?? nomesPorId[pessoaDaComunicacao] ?? "—",
        }
      : null,
  };
}

/**
 * Grava a troca de operador numa faixa de uma noite de rádio.
 *
 * Numa noite cheia os oito operadores já ocupam as oito faixas, então escolher
 * outra pessoa é uma troca de posições: quem sai da faixa pedida assume a faixa
 * de onde a pessoa escolhida veio, e a noite continua sem repetição nem buraco.
 * `pessoaId: null` devolve a faixa ao rodízio e desfaz a troca pareada.
 */
export async function definirOperadorRadioNoite(
  anoMes: AnoMes,
  data: string,
  slot: string,
  pessoaId: number | null,
) {
  const db = getDb();
  const periodo = await garantirPeriodo(anoMes);
  const config = configRadioDe(await lerConfiguracoes());

  const noite = noitesDeRadioNoMes(anoMes.ano, anoMes.mes, config).find(
    (dia) => paraISO(dia) === data,
  );
  if (!noite) {
    throw new Error(
      `${formatarDataBR(data)} não é noite de rádio em ${rotuloMes(anoMes.ano, anoMes.mes)}.`,
    );
  }

  const faixa = SLOTS_RODIZIO.find((item) => item.id === slot);
  if (!faixa) throw new Error(`A faixa ${slot} não gira entre os anéis.`);

  const alvo = and(
    eq(radioExcecao.periodoId, periodo.id),
    eq(radioExcecao.data, data),
    eq(radioExcecao.slot, slot),
  );

  if (pessoaId === null) {
    await db.delete(radioExcecao).where(alvo);
    await limparTrocasDuplicadas(periodo.id, anoMes, data);
    return;
  }

  const [operador] = await db
    .select({ nome: people.nome, anel: radioAnel.anel })
    .from(radioAnel)
    .innerJoin(people, eq(radioAnel.pessoaId, people.id))
    .where(eq(radioAnel.pessoaId, pessoaId))
    .limit(1);
  if (!operador) throw new Error("Esta pessoa não está em nenhum anel de rádio.");

  const operadores = await listarOperadoresRadio();
  const grade = montarGradeDoMes(
    anoMes,
    config,
    aneisDe(operadores),
    await excecoesDoPeriodo(periodo.id),
  );
  const celulas = grade.find((item) => item.data === data)?.slots ?? {};

  const escolhido = String(pessoaId);
  const occupant = celulas[slot];

  // Escolher quem já está na faixa é o mesmo que devolver ao rodízio.
  if (occupant?.pessoaId === escolhido) {
    await db.delete(radioExcecao).where(alvo);
    await limparTrocasDuplicadas(periodo.id, anoMes, data);
    return;
  }

  const de = Object.entries(celulas).find(
    ([slotId, celula]) => slotId !== slot && celula.pessoaId === escolhido,
  );

  await gravarExcecao(periodo.id, data, slot, pessoaId);

  if (de) {
    const [slotDe] = de;
    if (occupant) await gravarExcecao(periodo.id, data, slotDe, Number(occupant.pessoaId));
    else {
      await db
        .delete(radioExcecao)
        .where(
          and(
            eq(radioExcecao.periodoId, periodo.id),
            eq(radioExcecao.data, data),
            eq(radioExcecao.slot, slotDe),
          ),
        );
    }
  }

  await limparTrocasDuplicadas(periodo.id, anoMes, data);
}

async function gravarExcecao(
  periodoId: number,
  data: string,
  slot: string,
  pessoaId: number,
) {
  const db = getDb();
  await db
    .insert(radioExcecao)
    .values({ periodoId, data, slot, pessoaId })
    .onConflictDoUpdate({
      target: [radioExcecao.periodoId, radioExcecao.data, radioExcecao.slot],
      set: { pessoaId, atualizadoEm: new Date() },
    });
}

/**
 * Rede de segurança das trocas: se alguma ficou com a mesma pessoa em duas
 * faixas da noite, volta ao rodízio. Acontece ao desfazer só uma das duas
 * faixas de uma troca.
 */
async function limparTrocasDuplicadas(periodoId: number, anoMes: AnoMes, data: string) {
  const db = getDb();
  const config = configRadioDe(await lerConfiguracoes());
  const grade = montarGradeDoMes(
    anoMes,
    config,
    aneisDe(await listarOperadoresRadio()),
    await excecoesDoPeriodo(periodoId),
  );
  const noite = grade.find((item) => item.data === data);
  if (!noite) return;

  const porPessoa = new Map<string, string[]>();
  for (const [slotId, celula] of Object.entries(noite.slots)) {
    const lista = porPessoa.get(celula.pessoaId) ?? [];
    lista.push(slotId);
    porPessoa.set(celula.pessoaId, lista);
  }

  for (const slots of porPessoa.values()) {
    if (slots.length < 2) continue;
    for (const slotId of slots) {
      await db
        .delete(radioExcecao)
        .where(
          and(
            eq(radioExcecao.periodoId, periodoId),
            eq(radioExcecao.data, data),
            eq(radioExcecao.slot, slotId),
          ),
        );
    }
  }
}

/** Apaga todas as trocas manuais do mês e devolve o mês ao rodízio. */
export async function restaurarRadioAutomatico(anoMes: AnoMes) {
  const db = getDb();
  const periodo = await buscarPeriodo(anoMes);
  if (!periodo) throw new Error("Mês não encontrado.");
  await db.delete(radioExcecao).where(eq(radioExcecao.periodoId, periodo.id));
}

/* -------------------------------------------------------------------------
 * Automação (fila de comandos para o agente local)
 * ---------------------------------------------------------------------- */

/** Enfileira um comando para o agente local executar. */
export async function criarComando(
  tipo: TipoTarefa,
  payload?: unknown,
): Promise<AutomacaoComando> {
  const db = getDb();
  const [comando] = await db
    .insert(automacaoComando)
    .values({ tipo, payload: payload ? JSON.stringify(payload) : null })
    .returning();
  return comando;
}

/**
 * Retoma o comando pendente mais antigo e o marca como EXECUTANDO num único
 * statement (`UPDATE ... WHERE id IN (SELECT ...) RETURNING`), que é atômico
 * até no driver HTTP do Neon, sem transação.
 */
export async function retirarProximoComando(): Promise<AutomacaoComando | null> {
  const db = getDb();
  const pendente = db
    .select({ id: automacaoComando.id })
    .from(automacaoComando)
    .where(eq(automacaoComando.status, "PENDENTE"))
    .orderBy(automacaoComando.criadoEm)
    .limit(1);

  const [comando] = await db
    .update(automacaoComando)
    .set({ status: "EXECUTANDO", atualizadoEm: new Date() })
    .where(inArray(automacaoComando.id, pendente))
    .returning();
  return comando ?? null;
}

export async function concluirComando(id: number, resultado?: unknown) {
  const db = getDb();
  await db
    .update(automacaoComando)
    .set({
      status: "CONCLUIDO",
      resultado: resultado === undefined ? null : JSON.stringify(resultado),
      erro: null,
      atualizadoEm: new Date(),
    })
    .where(eq(automacaoComando.id, id));
}

export async function falharComando(id: number, erro: string) {
  const db = getDb();
  await db
    .update(automacaoComando)
    .set({ status: "FALHOU", erro, atualizadoEm: new Date() })
    .where(eq(automacaoComando.id, id));
}

export async function listarComandosRecentes(limite = 10): Promise<AutomacaoComando[]> {
  const db = getDb();
  return db
    .select()
    .from(automacaoComando)
    .orderBy(desc(automacaoComando.criadoEm))
    .limit(limite);
}

/* ---------------------------------------------------------------------- */

/** Tabela de revisão: substitui as linhas pelas detectadas/editadas. */
export async function substituirPosicoes(
  posicoes: Omit<AutomacaoPosicao, "id">[],
): Promise<void> {
  const db = getDb();
  await db.delete(automacaoPosicao);
  if (posicoes.length === 0) return;
  await db.insert(automacaoPosicao).values(posicoes);
}

export async function listarPosicoes(): Promise<AutomacaoPosicao[]> {
  const db = getDb();
  return db.select().from(automacaoPosicao).orderBy(automacaoPosicao.ordem);
}

/** Sobe o heartbeat do agente local (upsert no registro único). */
export async function sinalizarAgente(urlAtual: string | null, navegadorAberto: boolean) {
  const db = getDb();
  await db
    .insert(automacaoAgente)
    .values({ id: 1, urlAtual, navegadorAberto, batidoEm: new Date() })
    .onConflictDoUpdate({
      target: automacaoAgente.id,
      set: { urlAtual, navegadorAberto, batidoEm: new Date() },
    });
}

export async function lerAgente(): Promise<AutomacaoAgente | null> {
  const db = getDb();
  const [agente] = await db.select().from(automacaoAgente).where(eq(automacaoAgente.id, 1));
  return agente ?? null;
}
