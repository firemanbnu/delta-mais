CREATE TABLE "painel_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text,
	"de" text NOT NULL,
	"assunto" text NOT NULL,
	"trecho" text,
	"recebido_em" timestamp with time zone NOT NULL,
	"link" text,
	"nao_lido" boolean DEFAULT false NOT NULL,
	"importante" boolean DEFAULT false NOT NULL,
	"importado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "painel_sincronizacao" (
	"fonte" text PRIMARY KEY NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"detalhe" text
);
--> statement-breakpoint
CREATE TABLE "ptrba_programacao" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ptrba_programacao_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"data" date NOT NULL,
	"ordem" integer NOT NULL,
	"assunto" text NOT NULL,
	"instrutor" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trocas_servico" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trocas_servico_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"data" date NOT NULL,
	"sai" text NOT NULL,
	"entra" text NOT NULL,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "painel_emails_recebido_idx" ON "painel_emails" USING btree ("recebido_em");--> statement-breakpoint
CREATE UNIQUE INDEX "ptrba_programacao_data_ordem_idx" ON "ptrba_programacao" USING btree ("data","ordem");--> statement-breakpoint
CREATE INDEX "trocas_servico_data_idx" ON "trocas_servico" USING btree ("data");