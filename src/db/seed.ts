import { sql, eq } from "drizzle-orm";

import { getDb } from "./index";
import { garantirTimePadrao, semearPostos } from "./repositorio";
import { posts, settings } from "./schema";
import { POSTOS_PADRAO } from "@/lib/dominio";

async function main() {
  const db = getDb();

  console.log("→ Semeando equipe padrão");
  const equipe = await garantirTimePadrao();

  console.log("→ Semeando as 10 vagas do plantão");
  await semearPostos();

  await db
    .insert(settings)
    .values({ id: 1, equipeId: equipe.id })
    .onConflictDoNothing({ target: settings.id });

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(posts);
  const [config] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);

  console.log(`→ Vagas esperadas: ${POSTOS_PADRAO.length}, no banco: ${total}`);
  console.log(
    `→ Plantão ${config.turnoInicio} às ${config.turnoFim} · âncora do 12x36: ${config.dataAncora}`,
  );
  console.log("✓ Seed concluído");
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("✗ Falha no seed:", erro);
    process.exit(1);
  });
