import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import { getDb } from "./index";
import { POSTOS_PADRAO } from "@/lib/dominio";
import { chaveAnoMes, paraISO, type AnoMes } from "@/lib/calendario";
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
  absences,
  assignments,
  people,
  periods,
  posts,
  settings,
  teams,
} from "./schema";

export type PessoaComEquipe = {
  id: number;
  nome: string;
  funcao: "CE" | "LR" | "MC" | "BA" | "RE";
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

function paraResumo(p: { id: number; nome: string; funcao: "CE" | "LR" | "MC" | "BA" | "RE" }) {
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
