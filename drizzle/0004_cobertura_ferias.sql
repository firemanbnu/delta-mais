ALTER TABLE "absences" ADD COLUMN "ferista" text;--> statement-breakpoint
ALTER TABLE "absences" ADD COLUMN "cobre_funcao_id" integer;--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_cobre_funcao_id_people_id_fk" FOREIGN KEY ("cobre_funcao_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
