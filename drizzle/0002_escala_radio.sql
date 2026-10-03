ALTER TYPE "public"."funcao" ADD VALUE 'RADIO';--> statement-breakpoint
CREATE TABLE "radio_anel" (
	"pessoa_id" integer PRIMARY KEY NOT NULL,
	"anel" integer NOT NULL,
	"ordem" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "radio_excecao" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "radio_excecao_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"periodo_id" integer NOT NULL,
	"data" date NOT NULL,
	"slot" text NOT NULL,
	"pessoa_id" integer NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "data_ancora" SET DEFAULT '2026-10-02';--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "radio_ancora" date DEFAULT '2026-10-02' NOT NULL;--> statement-breakpoint
ALTER TABLE "radio_anel" ADD CONSTRAINT "radio_anel_pessoa_id_people_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radio_excecao" ADD CONSTRAINT "radio_excecao_periodo_id_periods_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radio_excecao" ADD CONSTRAINT "radio_excecao_pessoa_id_people_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "radio_anel_anel_ordem_idx" ON "radio_anel" USING btree ("anel","ordem");--> statement-breakpoint
CREATE INDEX "radio_anel_anel_idx" ON "radio_anel" USING btree ("anel");--> statement-breakpoint
CREATE UNIQUE INDEX "radio_excecao_periodo_data_slot_idx" ON "radio_excecao" USING btree ("periodo_id","data","slot");--> statement-breakpoint
CREATE INDEX "radio_excecao_periodo_idx" ON "radio_excecao" USING btree ("periodo_id");--> statement-breakpoint
-- A âncora do 12x36 vai para 02/10/2026 para que outubro caia nos dias pares,
-- que são as noites da primeira escala de rádio. O ciclo continua de 48h: só a
-- marcação de serviço muda, nenhuma escala já montada perde gente.
UPDATE "settings" SET "data_ancora" = '2026-10-02' WHERE "id" = 1;