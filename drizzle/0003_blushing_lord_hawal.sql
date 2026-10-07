CREATE TYPE "public"."campo_automacao" AS ENUM('ASSINATURA', 'DATA');--> statement-breakpoint
CREATE TYPE "public"."fonte_automacao" AS ENUM('TEXTO', 'OCR', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."status_tarefa_automacao" AS ENUM('PENDENTE', 'EXECUTANDO', 'CONCLUIDO', 'FALHOU');--> statement-breakpoint
CREATE TYPE "public"."tipo_tarefa_automacao" AS ENUM('CONECTAR', 'DETECTAR', 'POSICIONAR', 'FECHAR');--> statement-breakpoint
CREATE TABLE "automacao_agente" (
	"id" integer PRIMARY KEY NOT NULL,
	"url_atual" text,
	"navegador_aberto" boolean DEFAULT false NOT NULL,
	"batido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automacao_comando" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "automacao_comando_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tipo" "tipo_tarefa_automacao" NOT NULL,
	"status" "status_tarefa_automacao" DEFAULT 'PENDENTE' NOT NULL,
	"payload" text,
	"resultado" text,
	"erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automacao_posicao" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "automacao_posicao_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"campo" "campo_automacao" NOT NULL,
	"pagina" integer DEFAULT 1 NOT NULL,
	"x_pct" text NOT NULL,
	"y_pct" text NOT NULL,
	"fonte" "fonte_automacao" DEFAULT 'MANUAL' NOT NULL,
	"confianca" text,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "automacao_comando_status_idx" ON "automacao_comando" USING btree ("status");--> statement-breakpoint
CREATE INDEX "automacao_comando_criado_idx" ON "automacao_comando" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "automacao_posicao_ordem_idx" ON "automacao_posicao" USING btree ("ordem");