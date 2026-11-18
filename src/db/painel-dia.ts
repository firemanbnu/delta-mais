import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "@/db";
import {
  absences,
  painelEmails,
  painelSincronizacao,
  people,
  ptrbaProgramacao,
  trocasServico,
} from "@/db/schema";

export async function trocasEntre(inicio: string, fim: string) {
  return getDb()
    .select()
    .from(trocasServico)
    .where(and(gte(trocasServico.data, inicio), lte(trocasServico.data, fim)))
    .orderBy(asc(trocasServico.data), asc(trocasServico.id));
}

export async function ptrbaDasNoites(datas: string[]) {
  if (datas.length === 0) return [];
  return getDb()
    .select()
    .from(ptrbaProgramacao)
    .where(inArray(ptrbaProgramacao.data, datas))
    .orderBy(asc(ptrbaProgramacao.data), asc(ptrbaProgramacao.ordem));
}

/** Ausências (atestado, férias, dispensa) que tocam o intervalo, com o nome da pessoa. */
export async function ausenciasEntre(inicio: string, fim: string) {
  return getDb()
    .select({
      id: absences.id,
      inicio: absences.inicio,
      fim: absences.fim,
      tipo: absences.tipo,
      ferista: absences.ferista,
      observacoes: absences.observacoes,
      pessoaId: absences.pessoaId,
      nome: people.nome,
    })
    .from(absences)
    .innerJoin(people, eq(people.id, absences.pessoaId))
    .where(and(lte(absences.inicio, fim), gte(absences.fim, inicio)))
    .orderBy(asc(absences.inicio));
}

export async function emailsRecentes(limite = 15) {
  return getDb().select().from(painelEmails).orderBy(desc(painelEmails.recebidoEm)).limit(limite);
}

export async function sincronizacoes() {
  const linhas = await getDb().select().from(painelSincronizacao);
  return new Map(linhas.map((l) => [l.fonte, l]));
}

/** Nomes da equipe (quadro das escalas), sem repetir quem também é operador de rádio. */
export async function nomesDaEquipe(): Promise<string[]> {
  const linhas = await getDb().select({ nome: people.nome, ativo: people.ativo }).from(people);
  return [...new Set(linhas.filter((l) => l.ativo && l.nome !== "FERISTA").map((l) => l.nome))].sort();
}
