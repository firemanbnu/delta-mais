"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { absences } from "@/db/schema";
import { ROTULOS_AUSENCIA, TIPOS_AUSENCIA } from "@/lib/dominio";
import type { Resultado } from "./escala";

function ok(mensagem: string): Resultado {
  revalidatePath("/", "layout");
  return { ok: true, mensagem };
}

function falhar(erro: unknown): Resultado {
  return {
    ok: false,
    erro: erro instanceof Error ? erro.message : "Não foi possível salvar.",
  };
}

const ausenciaSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    pessoaId: z.coerce.number().int().positive("Selecione a pessoa."),
    inicio: z.coerce.date("Informe a data de início."),
    fim: z.coerce.date("Informe a data de término."),
    tipo: z.enum(TIPOS_AUSENCIA),
    ferista: z.string().trim().max(80, "Nome do ferista muito longo.").optional(),
    cobreFuncaoId: z.coerce.number().int().positive().optional(),
    observacoes: z.string().trim().optional(),
  })
  .refine((dados) => dados.fim >= dados.inicio, {
    message: "A data de término não pode ser anterior à de início.",
    path: ["fim"],
  })
  .refine((dados) => dados.cobreFuncaoId !== dados.pessoaId, {
    message: "Quem cobre a função não pode ser o próprio bombeiro de férias.",
    path: ["cobreFuncaoId"],
  })
  .refine((dados) => dados.tipo !== "FERIAS" || !dados.cobreFuncaoId || Boolean(dados.ferista), {
    message: "Informe o ferista: ele fica com a vaga de quem cobre a função.",
    path: ["ferista"],
  });

/** Valor do seletor "quem cobre a função" quando é o próprio ferista. */
const COBRE_FERISTA = "ferista";

export async function salvarAusenciaAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const entrada = ausenciaSchema.safeParse({
    id: dados.get("id") || undefined,
    pessoaId: dados.get("pessoaId"),
    inicio: dados.get("inicio"),
    fim: dados.get("fim"),
    tipo: dados.get("tipo"),
    ferista: dados.get("ferista") ?? "",
    cobreFuncaoId:
      dados.get("cobreFuncaoId") && dados.get("cobreFuncaoId") !== COBRE_FERISTA
        ? dados.get("cobreFuncaoId")
        : undefined,
    observacoes: dados.get("observacoes") ?? "",
  });

  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const db = getDb();
  const { id, ...campos } = entrada.data;

  try {
    const valores = {
      pessoaId: campos.pessoaId,
      inicio: dados.get("inicio") as string,
      fim: dados.get("fim") as string,
      tipo: campos.tipo,
      // Só férias têm ferista; atestado e dispensa seguem só com o aviso.
      ferista: campos.tipo === "FERIAS" ? campos.ferista || null : null,
      cobreFuncaoId:
        campos.tipo === "FERIAS" && campos.ferista ? (campos.cobreFuncaoId ?? null) : null,
      observacoes: campos.observacoes || null,
    };

    if (id) {
      await db.update(absences).set(valores).where(eq(absences.id, id));
      return ok("Registro atualizado.");
    }
    await db.insert(absences).values(valores);
    return ok(`${ROTULOS_AUSENCIA[campos.tipo]} registrada.`);
  } catch (erro) {
    return falhar(erro);
  }
}

export async function excluirAusenciaAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const id = z.coerce.number().int().positive().safeParse(dados.get("id"));
  if (!id.success) return { ok: false, erro: "Registro inválido." };

  try {
    await getDb().delete(absences).where(eq(absences.id, id.data));
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Registro removido." };
  } catch (erro) {
    return falhar(erro);
  }
}
