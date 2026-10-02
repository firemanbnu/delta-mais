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

export const enumFuncao = pgEnum("funcao", ["CE", "LR", "MC", "BA", "RE"]);
export const enumUnidade = pgEnum("unidade", ["F2", "F3", "CRS"]);
export const enumGrupoPosto = pgEnum("grupo_posto", ["MC", "BA_RE", "FIXO"]);
export const enumStatusPeriodo = pgEnum("status_periodo", ["RASCUNHO", "PUBLICADO"]);
export const enumOrigem = pgEnum("origem", ["AUTO", "MANUAL"]);
export const enumTipoAusencia = pgEnum("tipo_ausencia", [
  "FERIAS",
  "ATESTADO",
  "DISPENSA",
]);

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
  dataAncora: date("data_ancora").notNull().default("2026-01-02"),
  equipeId: integer("equipe_id").references(() => teams.id, { onDelete: "set null" }),
  observacoes: text("observacoes"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  people: many(people),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  equipe: one(teams, { fields: [people.equipeId], references: [teams.id] }),
  assignments: many(assignments),
  absences: many(absences),
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

export type Team = typeof teams.$inferSelect;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Absence = typeof absences.$inferSelect;
export type Settings = typeof settings.$inferSelect;

export const VERSAO_PADRAO = sql`1`;
