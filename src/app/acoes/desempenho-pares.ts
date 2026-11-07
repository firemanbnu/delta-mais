"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { avaliadosDoConvite, conviteDoToken, hashSegredo, novoToken } from "@/db/desempenho-pares";
import { avaliacoesParesConvites, avaliacoesParesNotas, avaliacoesParesRodadas, efetivo } from "@/db/schema";
import { exigirGestao } from "@/lib/acesso-gestao";
import { COMPETENCIAS, NOTA_MAX, NOTA_MIN, type Notas } from "@/lib/desempenho";
import type { Resultado } from "./escala";

function falha(erro: unknown): Resultado {
  return { ok: false, erro: erro instanceof Error ? erro.message : "Não foi possível concluir." };
}

/* ------------------------------------------------------------ Gestor */

const rodadaSchema = z.object({
  ciclo: z.number().int().min(2020).max(2100),
  avaliados: z.array(z.number().int().positive()).min(2, "Escolha pelo menos 2 pessoas para serem avaliadas."),
  respondentes: z.array(z.number().int().positive()).min(1, "Escolha quem vai receber o link."),
});

/**
 * Salva quem aparece no formulário e quem recebe link. Cria links para os
 * novos respondentes e cancela os de quem saiu da lista (se não responderam).
 */
export async function salvarRodadaAction(entrada: {
  ciclo: number;
  avaliados: number[];
  respondentes: number[];
}): Promise<Resultado> {
  await exigirGestao();
  const valido = rodadaSchema.safeParse(entrada);
  if (!valido.success) return { ok: false, erro: valido.error.issues[0]?.message ?? "Dados inválidos." };
  const { ciclo, avaliados, respondentes } = valido.data;
  const db = getDb();
  try {
    await db
      .insert(avaliacoesParesRodadas)
      .values({ ciclo, avaliados })
      .onConflictDoUpdate({ target: avaliacoesParesRodadas.ciclo, set: { avaliados } });

    const ativos = await db
      .select()
      .from(avaliacoesParesConvites)
      .where(and(eq(avaliacoesParesConvites.ciclo, ciclo), isNull(avaliacoesParesConvites.revogadoEm)));
    const comConvite = new Set(ativos.map((c) => c.efetivoId));

    const novos = respondentes.filter((id) => !comConvite.has(id));
    if (novos.length > 0) {
      await db
        .insert(avaliacoesParesConvites)
        .values(novos.map((efetivoId) => ({ ciclo, efetivoId, token: novoToken() })));
    }
    const remover = ativos.filter((c) => !respondentes.includes(c.efetivoId) && !c.respondidoEm).map((c) => c.id);
    if (remover.length > 0) {
      await db
        .update(avaliacoesParesConvites)
        .set({ revogadoEm: new Date() })
        .where(inArray(avaliacoesParesConvites.id, remover));
    }
    revalidatePath("/desempenho", "layout");
    return {
      ok: true,
      mensagem: novos.length ? `Rodada salva. ${novos.length} link(s) novo(s) gerado(s).` : "Rodada salva.",
    };
  } catch (erro) {
    return falha(erro);
  }
}

/** Cancela o link atual (se ainda não respondido) e gera outro para a mesma pessoa. */
export async function novoLinkAction(conviteId: number): Promise<Resultado> {
  await exigirGestao();
  const db = getDb();
  try {
    const [atual] = await db
      .select()
      .from(avaliacoesParesConvites)
      .where(eq(avaliacoesParesConvites.id, conviteId))
      .limit(1);
    if (!atual) return { ok: false, erro: "Link não encontrado." };
    if (atual.respondidoEm) return { ok: false, erro: "Essa pessoa já respondeu; não dá para gerar outro link." };
    await db.update(avaliacoesParesConvites).set({ revogadoEm: new Date() }).where(eq(avaliacoesParesConvites.id, atual.id));
    await db
      .insert(avaliacoesParesConvites)
      .values({ ciclo: atual.ciclo, efetivoId: atual.efetivoId, token: novoToken() });
    revalidatePath("/desempenho", "layout");
    return { ok: true, mensagem: "Novo link gerado. O anterior deixou de funcionar." };
  } catch (erro) {
    return falha(erro);
  }
}

export async function salvarTelefoneAction(efetivoId: number, telefone: string): Promise<Resultado> {
  await exigirGestao();
  const digitos = telefone.replace(/\D/g, "");
  if (digitos && (digitos.length < 10 || digitos.length > 13)) {
    return { ok: false, erro: "Telefone inválido. Use DDD + número, ex.: 47 99999-9999." };
  }
  try {
    await getDb()
      .update(efetivo)
      .set({ telefone: digitos || null })
      .where(eq(efetivo.id, efetivoId));
    revalidatePath("/desempenho/colegas");
    return { ok: true, mensagem: digitos ? "WhatsApp salvo." : "WhatsApp removido." };
  } catch (erro) {
    return falha(erro);
  }
}

/* ------------------------------------------------------- Respondente (público) */

function nomeCookie(conviteId: number): string {
  return `dm_pares_${conviteId}`;
}

export type EstadoAbertura = { ok: true } | { ok: false; motivo: string };

/** Primeiro acesso: prende o link a este aparelho/navegador. */
export async function abrirConviteAction(token: string): Promise<EstadoAbertura> {
  const convite = await conviteDoToken(token);
  if (!convite || convite.revogadoEm) return { ok: false, motivo: "Este link não é mais válido." };
  if (convite.respondidoEm) return { ok: false, motivo: "Este formulário já foi respondido." };

  const loja = await cookies();
  const atual = loja.get(nomeCookie(convite.id))?.value;
  if (convite.aparelhoHash) {
    return atual && hashSegredo(atual) === convite.aparelhoHash
      ? { ok: true }
      : { ok: false, motivo: "Este link já foi aberto em outro aparelho ou navegador." };
  }

  const segredo = randomBytes(24).toString("base64url");
  const presos = await getDb()
    .update(avaliacoesParesConvites)
    .set({ aparelhoHash: hashSegredo(segredo), abertoEm: new Date() })
    .where(and(eq(avaliacoesParesConvites.id, convite.id), isNull(avaliacoesParesConvites.aparelhoHash)))
    .returning({ id: avaliacoesParesConvites.id });
  if (presos.length === 0) {
    return { ok: false, motivo: "Este link já foi aberto em outro aparelho ou navegador." };
  }
  loja.set(nomeCookie(convite.id), segredo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/avaliar",
    maxAge: 60 * 60 * 24 * 60,
  });
  return { ok: true };
}

/** Envio das notas: grava cada avaliado separado, sem nada que identifique o respondente. */
export async function enviarRespostasParesAction(
  token: string,
  respostas: Record<string, Notas>,
): Promise<Resultado> {
  const convite = await conviteDoToken(token);
  if (!convite || convite.revogadoEm) return { ok: false, erro: "Este link não é mais válido." };
  if (convite.respondidoEm) return { ok: false, erro: "Este formulário já foi respondido." };

  const loja = await cookies();
  const segredo = loja.get(nomeCookie(convite.id))?.value;
  if (!convite.aparelhoHash || !segredo || hashSegredo(segredo) !== convite.aparelhoHash) {
    return { ok: false, erro: "Este link só pode ser respondido no aparelho em que foi aberto." };
  }

  const permitidos = new Set((await avaliadosDoConvite(convite)).map((p) => p.id));
  const linhas: { ciclo: number; avaliadoId: number; notas: Notas }[] = [];
  for (const [chave, notasBrutas] of Object.entries(respostas ?? {})) {
    const avaliadoId = Number(chave);
    if (!permitidos.has(avaliadoId)) return { ok: false, erro: "Formulário desatualizado. Recarregue a página." };
    const notas: Notas = {};
    for (const c of COMPETENCIAS) {
      const v = notasBrutas?.[String(c.numero)];
      if (v === undefined || v === null) continue;
      if (!Number.isInteger(v) || v < NOTA_MIN || v > NOTA_MAX) return { ok: false, erro: "Nota inválida." };
      notas[String(c.numero)] = v;
    }
    if (Object.keys(notas).length > 0) linhas.push({ ciclo: convite.ciclo, avaliadoId, notas });
  }
  if (linhas.length === 0) return { ok: false, erro: "Dê pelo menos uma nota antes de enviar." };

  const db = getDb();
  // Marca como respondido primeiro: impede envio duplo.
  const marcados = await db
    .update(avaliacoesParesConvites)
    .set({ respondidoEm: new Date() })
    .where(
      and(
        eq(avaliacoesParesConvites.id, convite.id),
        isNull(avaliacoesParesConvites.respondidoEm),
        isNull(avaliacoesParesConvites.revogadoEm),
      ),
    )
    .returning({ id: avaliacoesParesConvites.id });
  if (marcados.length === 0) return { ok: false, erro: "Este formulário já foi respondido." };

  try {
    // Ordem embaralhada para não revelar a sequência do formulário.
    const embaralhadas = [...linhas].sort(() => Math.random() - 0.5);
    await db.insert(avaliacoesParesNotas).values(embaralhadas);
  } catch (erro) {
    await db
      .update(avaliacoesParesConvites)
      .set({ respondidoEm: null })
      .where(eq(avaliacoesParesConvites.id, convite.id));
    return falha(erro);
  }
  loja.delete({ name: nomeCookie(convite.id), path: "/avaliar" });
  revalidatePath("/desempenho", "layout");
  return { ok: true, mensagem: "Respostas enviadas. Obrigado!" };
}
