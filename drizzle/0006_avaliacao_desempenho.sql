CREATE TABLE "avaliacoes_desempenho" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "avaliacoes_desempenho_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"efetivo_id" integer NOT NULL,
	"ciclo" integer NOT NULL,
	"notas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observacoes" text,
	"plano_acao" text,
	"data_avaliacao" date,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avaliacoes_desempenho" ADD CONSTRAINT "avaliacoes_desempenho_efetivo_id_efetivo_id_fk" FOREIGN KEY ("efetivo_id") REFERENCES "public"."efetivo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avaliacoes_desempenho_efetivo_ciclo_idx" ON "avaliacoes_desempenho" USING btree ("efetivo_id","ciclo");--> statement-breakpoint
CREATE INDEX "avaliacoes_desempenho_ciclo_idx" ON "avaliacoes_desempenho" USING btree ("ciclo");