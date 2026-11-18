"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { ptrbaProgramacao, trocasServico } from "@/db/schema";
import { exigirGestao } from "@/lib/acesso-gestao";
import type { Resultado } from "./escala";

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const nome = (rotulo: string) =>
  z
    .string()
    .trim()
    .min(1, `Informe quem ${rotulo}.`)
    .max(80)
    .transform((s) => s.toUpperCase());

const esquemaTroca = z.object({
  data: dataISO,
  sai: nome("sai"),
  entra: nome("entra"),
  observacao: z
    .string()
    .trim()
    .max(200)
    .transform((s) => (s === "" ? null : s)),
});

export async function adicionarTrocaAction(entrada: {
  data: string;
  sai: string;
  entra: string;
  observacao: string;
}): Promise<Resultado> {
  await exigirGestao("/dia");
  const r = esquemaTroca.safeParse(entrada);
  if (!r.success) return { ok: false, erro: r.error.issues[0]?.message ?? "Dados inválidos." };
  if (r.data.sai === r.data.entra) return { ok: false, erro: "Quem sai e quem entra são a mesma pessoa." };
  await getDb().insert(trocasServico).values(r.data);
  revalidatePath("/dia");
  return { ok: true, mensagem: `Troca registrada: ${r.data.sai} → ${r.data.entra}.` };
}

export async function removerTrocaAction(id: number): Promise<Resultado> {
  await exigirGestao("/dia");
  await getDb().delete(trocasServico).where(eq(trocasServico.id, id));
  revalidatePath("/dia");
  return { ok: true, mensagem: "Troca removida." };
}

const esquemaPtrba = z.object({
  data: dataISO,
  linhas: z
    .array(
      z.object({
        ordem: z.number().int().min(0).max(3),
        assunto: z.string().trim().max(200),
        instrutor: z.string().trim().max(60),
      }),
    )
    .max(4),
});

/** Grava a programação de PTR-BA de uma noite (linhas sem assunto são apagadas). */
export async function salvarPtrbaAction(entrada: z.input<typeof esquemaPtrba>): Promise<Resultado> {
  await exigirGestao("/dia");
  const r = esquemaPtrba.safeParse(entrada);
  if (!r.success) return { ok: false, erro: r.error.issues[0]?.message ?? "Dados inválidos." };
  const db = getDb();
  for (const l of r.data.linhas) {
    const onde = and(eq(ptrbaProgramacao.data, r.data.data), eq(ptrbaProgramacao.ordem, l.ordem));
    if (!l.assunto) {
      await db.delete(ptrbaProgramacao).where(onde);
      continue;
    }
    const instrutor = l.instrutor ? l.instrutor.toUpperCase() : null;
    await db
      .insert(ptrbaProgramacao)
      .values({ data: r.data.data, ordem: l.ordem, assunto: l.assunto, instrutor })
      .onConflictDoUpdate({
        target: [ptrbaProgramacao.data, ptrbaProgramacao.ordem],
        set: { assunto: l.assunto, instrutor, atualizadoEm: new Date() },
      });
  }
  revalidatePath("/dia");
  return { ok: true, mensagem: "Programação de PTR-BA salva." };
}
