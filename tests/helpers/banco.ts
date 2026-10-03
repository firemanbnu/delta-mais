import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import { usarBanco, type Database } from "@/db";
import * as schema from "@/db/schema";
import {
  criarMesManual,
  definirOcupante,
  garantirTimePadrao,
  montarEscala,
  semearPostos,
} from "@/db/repositorio";
import { people } from "@/db/schema";

const TABELAS = [
  "assignments",
  "absences",
  "periods",
  "posts",
  "people",
  "radio_anel",
  "radio_excecao",
  "settings",
  "teams",
];

export type BancoDeTeste = {
  db: Database;
  cliente: PGlite;
  limpar: () => Promise<void>;
};

/**
 * PGlite em memória com as migrações de `drizzle/` aplicadas. Não encosta no
 * banco de desenvolvimento e some quando o processo termina.
 */
export async function criarBancoDeTeste(): Promise<BancoDeTeste> {
  const cliente = new PGlite();
  const db = drizzle(cliente, { schema });
  await migrate(db, {
    migrationsFolder: path.join(import.meta.dirname, "..", "..", "drizzle"),
  });
  usarBanco(db, cliente);

  const limpar = async () => {
    await db.execute(
      `TRUNCATE ${TABELAS.join(", ")} RESTART IDENTITY CASCADE;`,
    );
  };

  return { db, cliente, limpar };
}

const QUADRO_PADRAO = [
  { nome: "Ana Oliveira", funcao: "CE", postoFixo: "F2-CE", ordem: 1 },
  { nome: "Bruno Lima", funcao: "LR", postoFixo: "CRS-LR", ordem: 2 },
  { nome: "Carla Souza", funcao: "MC", postoFixo: null, ordem: 3 },
  { nome: "Diego Ramos", funcao: "MC", postoFixo: null, ordem: 4 },
  { nome: "Elisa Prado", funcao: "MC", postoFixo: null, ordem: 5 },
  { nome: "Fabio Nunes", funcao: "BA", postoFixo: null, ordem: 6 },
  { nome: "Gabi Martins", funcao: "BA", postoFixo: null, ordem: 7 },
  { nome: "Hugo Alves", funcao: "BA", postoFixo: null, ordem: 8 },
  { nome: "Isa Castro", funcao: "RE", postoFixo: null, ordem: 9 },
  { nome: "Joel Bento", funcao: "RE", postoFixo: null, ordem: 10 },
] as const;

/** Equipe que fecha as 10 vagas: 3 MC, 3 BA, 2 RE, 1 CE e 1 LR. */
export async function semearQuadro(db: Database): Promise<Map<string, number>> {
  const equipe = await garantirTimePadrao();
  await semearPostos();

  const ids = new Map<string, number>();
  for (const pessoa of QUADRO_PADRAO) {
    const [inserida] = await db
      .insert(people)
      .values({ ...pessoa, equipeId: equipe.id })
      .returning({ id: people.id, nome: people.nome });
    ids.set(inserida.nome, inserida.id);
  }
  return ids;
}

/** Escala de referência que fecha as 10 vagas sem repetir ninguém. */
export const ESCALA_COMPLETA: Record<string, string> = {
  "F2-CE": "Ana Oliveira",
  "CRS-LR": "Bruno Lima",
  "F2-MC": "Carla Souza",
  "F3-MC": "Diego Ramos",
  "CRS-MC": "Elisa Prado",
  "F2-BA": "Fabio Nunes",
  "F3-BA1": "Gabi Martins",
  "F3-BA2": "Hugo Alves",
  "CRS-RE1": "Isa Castro",
  "CRS-RE2": "Joel Bento",
};

/** Preenche um mês inteiro a partir do quadro semeado e devolve a escala. */
export async function preencherMes(
  anoMes: { ano: number; mes: number },
  ids: Map<string, number>,
  origem: "AUTO" | "MANUAL" = "MANUAL",
) {
  await criarMesManual(anoMes);
  for (const [posto, nome] of Object.entries(ESCALA_COMPLETA)) {
    await definirOcupante(anoMes, posto, ids.get(nome) ?? null, origem);
  }
  const escala = await montarEscala(anoMes);
  if (!escala) throw new Error(`Escala de ${anoMes.ano}/${anoMes.mes} não foi montada.`);
  return escala;
}