"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { avaliacoesDesempenho, efetivo } from "@/db/schema";
import { exigirGestao } from "@/lib/acesso-gestao";
import { COMPETENCIAS, NOTA_MAX, NOTA_MIN, type Notas } from "@/lib/desempenho";
import type { Resultado } from "./escala";

const textoOpcional = z
  .string()
  .max(4000, "Texto muito longo (máx. 4000 caracteres).")
  .transform((v) => (v.trim() === "" ? null : v.trim()));

const avaliacaoSchema = z.object({
  efetivoId: z.coerce.number().int().positive(),
  ciclo: z.coerce.number().int().min(2020).max(2100),
  dataAvaliacao: z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable()),
  observacoes: textoOpcional,
  planoAcao: textoOpcional,
});

export async function salvarAvaliacaoAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  await exigirGestao();
  const entrada = avaliacaoSchema.safeParse({
    efetivoId: dados.get("efetivoId"),
    ciclo: dados.get("ciclo"),
    dataAvaliacao: String(dados.get("dataAvaliacao") ?? ""),
    observacoes: String(dados.get("observacoes") ?? ""),
    planoAcao: String(dados.get("planoAcao") ?? ""),
  });
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const notas: Notas = {};
  for (const c of COMPETENCIAS) {
    const bruto = String(dados.get(`nota_${c.numero}`) ?? "").trim();
    if (bruto === "") continue;
    const nota = Number(bruto);
    if (!Number.isInteger(nota) || nota < NOTA_MIN || nota > NOTA_MAX) {
      return { ok: false, erro: `Nota inválida no item ${c.numero} (${c.competencia}).` };
    }
    notas[String(c.numero)] = nota;
  }

  const { efetivoId, ciclo, ...campos } = entrada.data;
  const db = getDb();
  try {
    const [pessoa] = await db.select({ id: efetivo.id }).from(efetivo).where(eq(efetivo.id, efetivoId)).limit(1);
    if (!pessoa) return { ok: false, erro: "Pessoa não encontrada." };

    const valores = { notas, ...campos, atualizadoEm: new Date() };
    const [atual] = await db
      .select({ id: avaliacoesDesempenho.id })
      .from(avaliacoesDesempenho)
      .where(and(eq(avaliacoesDesempenho.efetivoId, efetivoId), eq(avaliacoesDesempenho.ciclo, ciclo)))
      .limit(1);
    if (atual) {
      await db.update(avaliacoesDesempenho).set(valores).where(eq(avaliacoesDesempenho.id, atual.id));
    } else {
      await db.insert(avaliacoesDesempenho).values({ efetivoId, ciclo, ...valores });
    }
    revalidatePath("/desempenho", "layout");
    const qtd = Object.keys(notas).length;
    return {
      ok: true,
      mensagem:
        qtd === COMPETENCIAS.length
          ? "Avaliação salva e completa."
          : `Avaliação salva (${qtd} de ${COMPETENCIAS.length} itens com nota).`,
    };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não foi possível salvar." };
  }
}

export async function excluirAvaliacaoAction(efetivoId: number, ciclo: number): Promise<Resultado> {
  await exigirGestao();
  try {
    await getDb()
      .delete(avaliacoesDesempenho)
      .where(and(eq(avaliacoesDesempenho.efetivoId, efetivoId), eq(avaliacoesDesempenho.ciclo, ciclo)));
    revalidatePath("/desempenho", "layout");
    return { ok: true, mensagem: "Avaliação apagada." };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não foi possível apagar." };
  }
}
