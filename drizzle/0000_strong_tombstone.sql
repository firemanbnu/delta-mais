CREATE TYPE "public"."funcao" AS ENUM('CE', 'LR', 'MC', 'BA', 'RE');--> statement-breakpoint
CREATE TYPE "public"."grupo_posto" AS ENUM('MC', 'BA_RE', 'FIXO');--> statement-breakpoint
CREATE TYPE "public"."origem" AS ENUM('AUTO', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."status_periodo" AS ENUM('RASCUNHO', 'PUBLICADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_ausencia" AS ENUM('FERIAS', 'ATESTADO', 'DISPENSA');--> statement-breakpoint
CREATE TYPE "public"."unidade" AS ENUM('F2', 'F3', 'CRS');--> statement-breakpoint
CREATE TABLE "absences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "absences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pessoa_id" integer NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"tipo" "tipo_ausencia" NOT NULL,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"periodo_id" integer NOT NULL,
	"posto_id" integer NOT NULL,
	"pessoa_id" integer,
	"origem" "origem" DEFAULT 'AUTO' NOT NULL,
	"observacao" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "people_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"equipe_id" integer NOT NULL,
	"nome" text NOT NULL,
	"matricula" text,
	"funcao" "funcao" NOT NULL,
	"telefone" text,
	"posto_fixo" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "periods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ano" integer NOT NULL,
	"mes" integer NOT NULL,
	"status" "status_periodo" DEFAULT 'RASCUNHO' NOT NULL,
	"observacoes" text,
	"publicado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo" text NOT NULL,
	"unidade" "unidade" NOT NULL,
	"rotulo" text NOT NULL,
	"grupo" "grupo_posto" NOT NULL,
	"posicao_no_ciclo" integer,
	"ordem" integer NOT NULL,
	"comunicacao" boolean DEFAULT false NOT NULL,
	"funcoes" "funcao"[] NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"turno_inicio" time DEFAULT '19:00:00' NOT NULL,
	"turno_fim" time DEFAULT '07:00:00' NOT NULL,
	"data_ancora" date DEFAULT '2026-01-02' NOT NULL,
	"equipe_id" integer,
	"observacoes" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_pessoa_id_people_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_periodo_id_periods_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_posto_id_posts_id_fk" FOREIGN KEY ("posto_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_pessoa_id_people_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_equipe_id_teams_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_equipe_id_teams_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absences_pessoa_idx" ON "absences" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX "absences_periodo_idx" ON "absences" USING btree ("inicio","fim");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_periodo_posto_idx" ON "assignments" USING btree ("periodo_id","posto_id");--> statement-breakpoint
CREATE INDEX "assignments_pessoa_idx" ON "assignments" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX "people_equipe_idx" ON "people" USING btree ("equipe_id");--> statement-breakpoint
CREATE INDEX "people_funcao_idx" ON "people" USING btree ("funcao");--> statement-breakpoint
CREATE UNIQUE INDEX "periods_ano_mes_idx" ON "periods" USING btree ("ano","mes");--> statement-breakpoint
CREATE INDEX "periods_ano_idx" ON "periods" USING btree ("ano");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_codigo_idx" ON "posts" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_ordem_idx" ON "posts" USING btree ("ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_nome_idx" ON "teams" USING btree ("nome");