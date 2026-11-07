CREATE TABLE "avaliacoes_pares_convites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "avaliacoes_pares_convites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ciclo" integer NOT NULL,
	"efetivo_id" integer NOT NULL,
	"token" text NOT NULL,
	"aparelho_hash" text,
	"aberto_em" timestamp with time zone,
	"respondido_em" timestamp with time zone,
	"revogado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes_pares_notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ciclo" integer NOT NULL,
	"avaliado_id" integer NOT NULL,
	"notas" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes_pares_rodadas" (
	"ciclo" integer PRIMARY KEY NOT NULL,
	"avaliados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "efetivo" ADD COLUMN "telefone" text;--> statement-breakpoint
ALTER TABLE "avaliacoes_pares_convites" ADD CONSTRAINT "avaliacoes_pares_convites_efetivo_id_efetivo_id_fk" FOREIGN KEY ("efetivo_id") REFERENCES "public"."efetivo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_pares_notas" ADD CONSTRAINT "avaliacoes_pares_notas_avaliado_id_efetivo_id_fk" FOREIGN KEY ("avaliado_id") REFERENCES "public"."efetivo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avaliacoes_pares_convites_token_idx" ON "avaliacoes_pares_convites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "avaliacoes_pares_convites_ciclo_idx" ON "avaliacoes_pares_convites" USING btree ("ciclo");--> statement-breakpoint
CREATE INDEX "avaliacoes_pares_notas_ciclo_avaliado_idx" ON "avaliacoes_pares_notas" USING btree ("ciclo","avaliado_id");