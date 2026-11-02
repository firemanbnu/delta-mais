CREATE TYPE "public"."equipe_efetivo" AS ENUM('ALFA', 'BRAVO', 'CHARLIE', 'DELTA', 'FERISTA', 'EMBAIXADOR');--> statement-breakpoint
CREATE TYPE "public"."forma_documento" AS ENUM('REALIZACAO', 'VENCIMENTO', 'ENTREGA');--> statement-breakpoint
CREATE TYPE "public"."funcao_efetivo" AS ENUM('BA-CE', 'BA-LR', 'BA-MC', 'BA-RE', 'BA-2', 'OC', 'GS');--> statement-breakpoint
CREATE TYPE "public"."grupo_documento" AS ENUM('TECNICA', 'CCR', 'MEDMAIS', 'RH');--> statement-breakpoint
CREATE TYPE "public"."situacao_documento" AS ENUM('ENTREGUE', 'FALTA', 'DESATUALIZADO', 'NAO_POSSUI', 'NAO_SE_APLICA', 'CONFERIR');--> statement-breakpoint
CREATE TYPE "public"."situacao_efetivo" AS ENUM('ATIVO', 'AFASTADO', 'DESLIGADO');--> statement-breakpoint
CREATE TABLE "documentos_pessoa" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documentos_pessoa_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"efetivo_id" integer NOT NULL,
	"tipo_id" integer NOT NULL,
	"data" date,
	"situacao" "situacao_documento" DEFAULT 'ENTREGUE' NOT NULL,
	"arquivo_url" text,
	"observacao" text,
	"origem" text DEFAULT 'MANUAL' NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "efetivo" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "efetivo_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"nome_guerra" text,
	"matricula" text,
	"funcao" "funcao_efetivo",
	"equipe" "equipe_efetivo",
	"situacao" "situacao_efetivo" DEFAULT 'ATIVO' NOT NULL,
	"pasta_drive" text,
	"observacoes" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_documento" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tipos_documento_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"grupo" "grupo_documento" NOT NULL,
	"forma" "forma_documento" DEFAULT 'REALIZACAO' NOT NULL,
	"validade_meses" integer,
	"funcoes_obrigatorias" "funcao_efetivo"[] DEFAULT '{}' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentos_pessoa" ADD CONSTRAINT "documentos_pessoa_efetivo_id_efetivo_id_fk" FOREIGN KEY ("efetivo_id") REFERENCES "public"."efetivo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_pessoa" ADD CONSTRAINT "documentos_pessoa_tipo_id_tipos_documento_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_documento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_pessoa_efetivo_tipo_idx" ON "documentos_pessoa" USING btree ("efetivo_id","tipo_id");--> statement-breakpoint
CREATE INDEX "documentos_pessoa_tipo_idx" ON "documentos_pessoa" USING btree ("tipo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "efetivo_nome_idx" ON "efetivo" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "efetivo_equipe_idx" ON "efetivo" USING btree ("equipe");--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_documento_codigo_idx" ON "tipos_documento" USING btree ("codigo");