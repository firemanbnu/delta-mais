CREATE TYPE "public"."noite_de_servico" AS ENUM('IMPAR', 'PAR');--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "noite_de_servico" "noite_de_servico" DEFAULT 'PAR' NOT NULL;--> statement-breakpoint
UPDATE "settings" SET "noite_de_servico" = CASE WHEN EXTRACT(DAY FROM "data_ancora") % 2 = 0 THEN 'PAR'::"noite_de_servico" ELSE 'IMPAR'::"noite_de_servico" END;
