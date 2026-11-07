import { and, asc, eq, inArray, or } from "drizzle-orm";

import { compararNomes } from "../lib/gestao";
import type { Notas } from "../lib/desempenho";
import { getDb } from "./index";
import { avaliacoesDesempenho, efetivo, type AvaliacaoDesempenho, type Efetivo } from "./schema";

/** A avaliação é só da Equipe Delta. */
export const EQUIPE_AVALIADA = "DELTA" as const;

export type MembroAvaliado = {
  pessoa: Efetivo;
  avaliacao: AvaliacaoDesempenho | null;
  notas: Notas;
};

export function cicloAtual(): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date()),
  );
}

export function lerCiclo(valor: unknown): number {
  const n = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isInteger(n) && n >= 2020 && n <= 2100 ? n : cicloAtual();
}

/**
 * Integrantes ativos da Delta e quem já tem avaliação no ciclo (mesmo que
 * tenha mudado de equipe depois), em ordem alfabética.
 */
export async function listarAvaliados(ciclo: number): Promise<MembroAvaliado[]> {
  const db = getDb();
  const avaliacoes = await db
    .select()
    .from(avaliacoesDesempenho)
    .where(eq(avaliacoesDesempenho.ciclo, ciclo));
  const idsAvaliados = avaliacoes.map((a) => a.efetivoId);

  const pessoas = await db
    .select()
    .from(efetivo)
    .where(
      idsAvaliados.length > 0
        ? or(
            and(eq(efetivo.equipe, EQUIPE_AVALIADA), eq(efetivo.situacao, "ATIVO")),
            inArray(efetivo.id, idsAvaliados),
          )
        : and(eq(efetivo.equipe, EQUIPE_AVALIADA), eq(efetivo.situacao, "ATIVO")),
    );

  const porPessoa = new Map(avaliacoes.map((a) => [a.efetivoId, a]));
  return pessoas
    .sort((a, b) => compararNomes(a.nome, b.nome))
    .map((pessoa) => {
      const avaliacao = porPessoa.get(pessoa.id) ?? null;
      return { pessoa, avaliacao, notas: (avaliacao?.notas ?? {}) as Notas };
    });
}

export async function obterPessoa(id: number): Promise<Efetivo | null> {
  const [pessoa] = await getDb().select().from(efetivo).where(eq(efetivo.id, id)).limit(1);
  return pessoa ?? null;
}

/** Todas as avaliações da pessoa, do ciclo mais antigo ao mais recente. */
export async function historicoAvaliacoes(efetivoId: number): Promise<AvaliacaoDesempenho[]> {
  return getDb()
    .select()
    .from(avaliacoesDesempenho)
    .where(eq(avaliacoesDesempenho.efetivoId, efetivoId))
    .orderBy(asc(avaliacoesDesempenho.ciclo));
}

export async function ciclosComAvaliacao(): Promise<number[]> {
  const linhas = await getDb()
    .selectDistinct({ ciclo: avaliacoesDesempenho.ciclo })
    .from(avaliacoesDesempenho);
  return linhas.map((l) => l.ciclo).sort((a, b) => b - a);
}
