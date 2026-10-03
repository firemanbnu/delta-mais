"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import {
  definirOperadorRadioNoite,
  restaurarRadioAutomatico,
} from "@/db/repositorio";
import type { Resultado } from "./escala";

const operacaoSchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data da noite inválida."),
  slot: z.string().min(1),
  pessoaId: z
    .string()
    .transform((valor) => (valor === "" || valor === "vazio" ? null : Number(valor)))
    .pipe(z.number().int().positive().nullable()),
});

function caminhoEscala(ano: number, mes: number) {
  return `/escala/${ano}/${String(mes).padStart(2, "0")}`;
}

/**
 * Troca o operador de uma faixa numa noite. Numa noite cheia escolher outra
 * pessoa faz as duas trocarem de posição. `pessoaId` vazio devolve a faixa ao
 * rodízio, que é o mesmo caminho do botão "devolver ao automático".
 */
export async function definirOperadorRadioAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const entrada = operacaoSchema.safeParse({
    ano: dados.get("ano"),
    mes: dados.get("mes"),
    data: dados.get("data"),
    slot: dados.get("slot"),
    pessoaId: dados.get("pessoaId") ?? "",
  });
  if (!entrada.success) return { ok: false, erro: "Dados inválidos." };

  const { ano, mes, data, slot, pessoaId } = entrada.data;

  try {
    await definirOperadorRadioNoite({ ano, mes }, data, slot, pessoaId);
    revalidatePath(caminhoEscala(ano, mes));
    revalidatePath(`${caminhoEscala(ano, mes)}/imprimir`);
    return {
      ok: true,
      mensagem:
        pessoaId === null ? "Faixa devolvida ao rodízio." : "Operadores trocados de faixa.",
    };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível trocar o operador.",
    };
  }
}

/** Limpa todas as trocas manuais do mês e refaz a escala pelo rodízio. */
export async function restaurarRadioAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const periodoSchema = z.object({
    ano: z.coerce.number().int().min(2000).max(2100),
    mes: z.coerce.number().int().min(1).max(12),
  });
  const entrada = periodoSchema.safeParse({ ano: dados.get("ano"), mes: dados.get("mes") });
  if (!entrada.success) return { ok: false, erro: "Ano ou mês inválido." };

  const { ano, mes } = entrada.data;

  try {
    await restaurarRadioAutomatico({ ano, mes });
    revalidatePath(caminhoEscala(ano, mes));
    revalidatePath(`${caminhoEscala(ano, mes)}/imprimir`);
    return { ok: true, mensagem: "Escala de rádio refeita pelo rodízio." };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível refazer a escala.",
    };
  }
}
