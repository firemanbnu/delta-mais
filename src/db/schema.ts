import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { FUNCOES, NOITES_DE_SERVICO } from "../lib/dominio";
import {
  CAMPOS_AUTOMACAO,
  FONTES_AUTOMACAO,
  STATUS_TAREFA,
  TIPOS_TAREFA,
} from "../lib/automacao";

export const enumFuncao = pgEnum("funcao", FUNCOES);
export const enumUnidade = pgEnum("unidade", ["F2", "F3", "CRS"]);
export const enumGrupoPosto = pgEnum("grupo_posto", ["MC", "BA_RE", "FIXO"]);
export const enumStatusPeriodo = pgEnum("status_periodo", ["RASCUNHO", "PUBLICADO"]);
export const enumOrigem = pgEnum("origem", ["AUTO", "MANUAL"]);
export const enumTipoAusencia = pgEnum("tipo_ausencia", [
  "FERIAS",
  "ATESTADO",
  "DISPENSA",
]);
export const enumNoiteDeServico = pgEnum("noite_de_servico", NOITES_DE_SERVICO);
export const enumTipoTarefaAutomacao = pgEnum("tipo_tarefa_automacao", TIPOS_TAREFA);
export const enumStatusTarefaAutomacao = pgEnum("status_tarefa_automacao", STATUS_TAREFA);
export const enumCampoAutomacao = pgEnum("campo_automacao", CAMPOS_AUTOMACAO);
export const enumFonteAutomacao = pgEnum("fonte_automacao", FONTES_AUTOMACAO);

export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("teams_nome_idx").on(t.nome)]);

export const people = pgTable(
  "people",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    equipeId: integer("equipe_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    matricula: text("matricula"),
    funcao: enumFuncao("funcao").notNull(),
    telefone: text("telefone"),
    postoFixo: text("posto_fixo"),
    ativo: boolean("ativo").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    observacoes: text("observacoes"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("people_equipe_idx").on(t.equipeId),
    index("people_funcao_idx").on(t.funcao),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    codigo: text("codigo").notNull(),
    unidade: enumUnidade("unidade").notNull(),
    rotulo: text("rotulo").notNull(),
    grupo: enumGrupoPosto("grupo").notNull(),
    posicaoNoCiclo: integer("posicao_no_ciclo"),
    ordem: integer("ordem").notNull(),
    comunicacao: boolean("comunicacao").notNull().default(false),
    funcoes: enumFuncao("funcoes").array().notNull(),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [
    uniqueIndex("posts_codigo_idx").on(t.codigo),
    uniqueIndex("posts_ordem_idx").on(t.ordem),
  ],
);

export const periods = pgTable(
  "periods",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ano: integer("ano").notNull(),
    mes: integer("mes").notNull(),
    status: enumStatusPeriodo("status").notNull().default("RASCUNHO"),
    observacoes: text("observacoes"),
    publicadoEm: timestamp("publicado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("periods_ano_mes_idx").on(t.ano, t.mes),
    index("periods_ano_idx").on(t.ano),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    periodoId: integer("periodo_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    postoId: integer("posto_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    pessoaId: integer("pessoa_id").references(() => people.id, { onDelete: "set null" }),
    origem: enumOrigem("origem").notNull().default("AUTO"),
    observacao: text("observacao"),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("assignments_periodo_posto_idx").on(t.periodoId, t.postoId),
    index("assignments_pessoa_idx").on(t.pessoaId),
  ],
);

export const absences = pgTable(
  "absences",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    pessoaId: integer("pessoa_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    inicio: date("inicio").notNull(),
    fim: date("fim").notNull(),
    tipo: enumTipoAusencia("tipo").notNull(),
    observacoes: text("observacoes"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("absences_pessoa_idx").on(t.pessoaId),
    index("absences_periodo_idx").on(t.inicio, t.fim),
  ],
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  turnoInicio: time("turno_inicio").notNull().default("19:00:00"),
  turnoFim: time("turno_fim").notNull().default("07:00:00"),
  dataAncora: date("data_ancora").notNull().default("2026-10-02"),
  noiteDeServico: enumNoiteDeServico("noite_de_servico").notNull().default("PAR"),
  radioAncora: date("radio_ancora").notNull().default("2026-10-02"),
  equipeId: integer("equipe_id").references(() => teams.id, { onDelete: "set null" }),
  observacoes: text("observacoes"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Posição de cada operador de rádio no seu anel.
 *
 * O anel é a ordem do rodízio (1 e 2) e `ordem` é a posição dentro dele, de 0
 * a 3. A escala em si não é guardada: ela é recalculada a partir daqui, e só
 * as trocas manuais ficam em `radio_excecao`.
 */
export const radioAnel = pgTable(
  "radio_anel",
  {
    pessoaId: integer("pessoa_id")
      .primaryKey()
      .references(() => people.id, { onDelete: "cascade" }),
    anel: integer("anel").notNull(),
    ordem: integer("ordem").notNull(),
  },
  (t) => [
    uniqueIndex("radio_anel_anel_ordem_idx").on(t.anel, t.ordem),
    index("radio_anel_anel_idx").on(t.anel),
  ],
);

/** Troca manual de operador numa faixa de uma noite específica. */
export const radioExcecao = pgTable(
  "radio_excecao",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    periodoId: integer("periodo_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    slot: text("slot").notNull(),
    pessoaId: integer("pessoa_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("radio_excecao_periodo_data_slot_idx").on(t.periodoId, t.data, t.slot),
    index("radio_excecao_periodo_idx").on(t.periodoId),
  ],
);

/**
 * Fila de comandos entre a página `/assinaturas` e o agente local.
 *
 * A página só grava a linha (PENDENTE); quem retoma é o agente, que faz o
 * UPDATE ... RETURNING num statement único — compatível com o driver HTTP do
 * Neon, que não tem transação. O resultado do trabalho volta em `resultado`.
 */
export const automacaoComando = pgTable(
  "automacao_comando",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tipo: enumTipoTarefaAutomacao("tipo").notNull(),
    status: enumStatusTarefaAutomacao("status").notNull().default("PENDENTE"),
    payload: text("payload"),
    resultado: text("resultado"),
    erro: text("erro"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("automacao_comando_status_idx").on(t.status),
    index("automacao_comando_criado_idx").on(t.criadoEm),
  ],
);

/**
 * Uma linha da tabela de revisão da UI: onde cai assinatura/data de cada nome.
 *
 * `xPct`/`yPct` são percentuais da página do documento (0–100), o mesmo
 * sistema de coordenadas que o Autentique usa internamente.
 */
export const automacaoPosicao = pgTable(
  "automacao_posicao",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    campo: enumCampoAutomacao("campo").notNull(),
    pagina: integer("pagina").notNull().default(1),
    xPct: text("x_pct").notNull(),
    yPct: text("y_pct").notNull(),
    fonte: enumFonteAutomacao("fonte").notNull().default("MANUAL"),
    confianca: text("confianca"),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [index("automacao_posicao_ordem_idx").on(t.ordem)],
);

/** Heartbeat do agente local: a UI lê isto para mostrar online/offline. */
export const automacaoAgente = pgTable("automacao_agente", {
  id: integer("id").primaryKey(),
  urlAtual: text("url_atual"),
  navegadorAberto: boolean("navegador_aberto").notNull().default(false),
  batidoEm: timestamp("batido_em", { withTimezone: true }).notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  people: many(people),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  equipe: one(teams, { fields: [people.equipeId], references: [teams.id] }),
  assignments: many(assignments),
  absences: many(absences),
  radioAnel: one(radioAnel),
  radioExcecoes: many(radioExcecao),
}));

export const postsRelations = relations(posts, ({ many }) => ({
  assignments: many(assignments),
}));

export const periodsRelations = relations(periods, ({ many }) => ({
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  periodo: one(periods, { fields: [assignments.periodoId], references: [periods.id] }),
  posto: one(posts, { fields: [assignments.postoId], references: [posts.id] }),
  pessoa: one(people, { fields: [assignments.pessoaId], references: [people.id] }),
}));

export const absencesRelations = relations(absences, ({ one }) => ({
  pessoa: one(people, { fields: [absences.pessoaId], references: [people.id] }),
}));

export const radioAnelRelations = relations(radioAnel, ({ one }) => ({
  pessoa: one(people, { fields: [radioAnel.pessoaId], references: [people.id] }),
}));

export const radioExcecaoRelations = relations(radioExcecao, ({ one }) => ({
  periodo: one(periods, { fields: [radioExcecao.periodoId], references: [periods.id] }),
  pessoa: one(people, { fields: [radioExcecao.pessoaId], references: [people.id] }),
}));

export type Team = typeof teams.$inferSelect;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Absence = typeof absences.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type RadioAnel = typeof radioAnel.$inferSelect;
export type RadioExcecao = typeof radioExcecao.$inferSelect;
export type AutomacaoComando = typeof automacaoComando.$inferSelect;
export type NewAutomacaoComando = typeof automacaoComando.$inferInsert;
export type AutomacaoPosicao = typeof automacaoPosicao.$inferSelect;
export type AutomacaoAgente = typeof automacaoAgente.$inferSelect;

export const VERSAO_PADRAO = sql`1`;
