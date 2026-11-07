import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { compararNomes } from "../lib/gestao";
import type { Notas } from "../lib/desempenho";
import { getDb } from "./index";
import {
  avaliacoesParesConvites,
  avaliacoesParesNotas,
  avaliacoesParesRodadas,
  efetivo,
  type ConvitePares,
  type Efetivo,
} from "./schema";

export function novoToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashSegredo(segredo: string): string {
  return createHash("sha256").update(segredo).digest("hex");
}

export async function obterRodada(ciclo: number) {
  const [rodada] = await getDb()
    .select()
    .from(avaliacoesParesRodadas)
    .where(eq(avaliacoesParesRodadas.ciclo, ciclo))
    .limit(1);
  return rodada ?? null;
}

export type ConviteComPessoa = { convite: ConvitePares; pessoa: Efetivo };

export async function listarConvites(ciclo: number): Promise<ConviteComPessoa[]> {
  const linhas = await getDb()
    .select({ convite: avaliacoesParesConvites, pessoa: efetivo })
    .from(avaliacoesParesConvites)
    .innerJoin(efetivo, eq(efetivo.id, avaliacoesParesConvites.efetivoId))
    .where(and(eq(avaliacoesParesConvites.ciclo, ciclo), isNull(avaliacoesParesConvites.revogadoEm)))
    .orderBy(asc(avaliacoesParesConvites.id));
  return linhas.sort((a, b) => compararNomes(a.pessoa.nome, b.pessoa.nome));
}

/** Respostas dos colegas no ciclo, agrupadas por avaliado. */
export async function respostasColegas(ciclo: number): Promise<Map<number, Notas[]>> {
  const linhas = await getDb()
    .select({ avaliadoId: avaliacoesParesNotas.avaliadoId, notas: avaliacoesParesNotas.notas })
    .from(avaliacoesParesNotas)
    .where(eq(avaliacoesParesNotas.ciclo, ciclo));
  const mapa = new Map<number, Notas[]>();
  for (const l of linhas) {
    const lista = mapa.get(l.avaliadoId) ?? [];
    lista.push(l.notas as Notas);
    mapa.set(l.avaliadoId, lista);
  }
  return mapa;
}

export async function conviteDoToken(token: string): Promise<ConvitePares | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [convite] = await getDb()
    .select()
    .from(avaliacoesParesConvites)
    .where(eq(avaliacoesParesConvites.token, token))
    .limit(1);
  return convite ?? null;
}

/** Pessoas que o respondente vai avaliar: as da rodada, menos ele mesmo. */
export async function avaliadosDoConvite(convite: ConvitePares): Promise<Efetivo[]> {
  const rodada = await obterRodada(convite.ciclo);
  const ids = (rodada?.avaliados ?? []).filter((id) => id !== convite.efetivoId);
  if (ids.length === 0) return [];
  const pessoas = await getDb().select().from(efetivo).where(inArray(efetivo.id, ids));
  return pessoas.sort((a, b) => compararNomes(a.nome, b.nome));
}
