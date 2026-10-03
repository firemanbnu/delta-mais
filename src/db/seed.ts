import { sql, eq } from "drizzle-orm";

import { getDb } from "./index";
import { garantirTimePadrao, semearOperadoresRadio, semearPostos } from "./repositorio";
import { posts, radioAnel, settings } from "./schema";
import { POSTOS_PADRAO, ROTULO_NOITE_DE_SERVICO } from "@/lib/dominio";
import { formatarDataBR } from "@/lib/calendario";
import { OPERADORES_POR_ANEL, validarConfigRadio, type ConfigRadio } from "@/lib/radio";

async function main() {
  const db = getDb();

  console.log("→ Semeando equipe padrão");
  const equipe = await garantirTimePadrao();

  console.log("→ Semeando as 10 vagas do plantão");
  await semearPostos();

  console.log("→ Semeando a equipe de rádio (2 anéis)");
  await semearOperadoresRadio();

  await db
    .insert(settings)
    .values({ id: 1, equipeId: equipe.id })
    .onConflictDoNothing({ target: settings.id });

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(posts);
  const [{ total: operadoresRadio }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(radioAnel);
  const [config] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);

  console.log(`→ Vagas esperadas: ${POSTOS_PADRAO.length}, no banco: ${total}`);
  console.log(
    `→ Plantão ${config.turnoInicio} às ${config.turnoFim} · âncora do 12x36: ${config.dataAncora}`,
  );
  console.log(`→ Noites de serviço: ${ROTULO_NOITE_DE_SERVICO[config.noiteDeServico]}`);
  console.log(
    `→ Escala de rádio desde ${config.radioAncora} · operadores nos anéis: ${operadoresRadio} ` +
      `(esperado ${OPERADORES_POR_ANEL * 2})`,
  );

  const configRadio: ConfigRadio = {
    dataAncora: String(config.dataAncora).slice(0, 10),
    noiteDeServico: config.noiteDeServico,
    radioAncora: String(config.radioAncora).slice(0, 10),
  };
  for (const problema of validarConfigRadio(configRadio)) {
    console.warn(`⚠ ${formatarDataBR(configRadio.radioAncora)}: ${problema.mensagem}`);
  }

  console.log("✓ Seed concluído");
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("✗ Falha no seed:", erro);
    process.exit(1);
  });
