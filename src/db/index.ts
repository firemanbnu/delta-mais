import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PgliteQueryResultHKT } from "drizzle-orm/pglite/session";
import path from "node:path";

import * as schema from "./schema";

/**
 * Em desenvolvimento usamos PGlite (Postgres embarcado, sem servidor) para
 * não depender de credenciais. Em produção o `DATABASE_URL` aponta para o Neon
 * e passamos a usar o driver HTTP do Neon.
 *
 * O tipo é o mesmo nos dois casos: só muda o HKT da sessão, e as queries de
 * select/insert/update/delete são idênticas.
 */
export type Database = PgDatabase<PgliteQueryResultHKT, typeof schema>;

export const ehProducao = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");

export const caminhoPglite = path.join(process.cwd(), ".data", "escala");

type CacheGlobal = {
  __escalaDb?: Database;
  __escalaPglite?: PGlite;
};

function criarPglite(): Database {
  const global = globalThis as CacheGlobal;
  if (!global.__escalaPglite) {
    global.__escalaPglite = new PGlite(caminhoPglite);
  }
  return drizzlePglite(global.__escalaPglite, { schema });
}

function criarNeon(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não definida. Configure a variável de ambiente na Vercel ou crie um .env.local.",
    );
  }
  return drizzleNeon(neon(url), { schema }) as unknown as Database;
}

export function getDb(): Database {
  const global = globalThis as CacheGlobal;
  if (global.__escalaDb) return global.__escalaDb;

  const usarNeon = Boolean(process.env.DATABASE_URL);
  if (!usarNeon && process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL não definida na Vercel. Crie um projeto Neon e cadastre a variável.",
    );
  }

  global.__escalaDb = usarNeon ? criarNeon() : criarPglite();
  return global.__escalaDb;
}

/**
 * Entrega um banco já pronto para o resto do app. Usado nos testes, que sobem
 * um PGlite em memória com as migrações já aplicadas.
 */
export function usarBanco(db: Database, cliente?: PGlite): void {
  const global = globalThis as CacheGlobal;
  global.__escalaDb = db;
  if (cliente) global.__escalaPglite = cliente;
}

export { schema };
