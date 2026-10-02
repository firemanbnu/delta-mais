"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { salvarConfiguracoes } from "@/db/repositorio";
import type { Resultado } from "./escala";

const horaSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use o formato HH:MM.");

const configSchema = z.object({
  turnoInicio: horaSchema,
  turnoFim: horaSchema,
  dataAncora: z.coerce.date("Informe a data de referência do 12x36."),
  equipeId: z.coerce.number().int().positive().optional(),
  observacoes: z.string().trim().optional(),
});

export async function salvarConfiguracoesAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const entrada = configSchema.safeParse({
    turnoInicio: dados.get("turnoInicio"),
    turnoFim: dados.get("turnoFim"),
    dataAncora: dados.get("dataAncora"),
    equipeId: dados.get("equipeId") || undefined,
    observacoes: dados.get("observacoes") ?? "",
  });

  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const { dataAncora, ...resto } = entrada.data;
    await salvarConfiguracoes({
      ...resto,
      dataAncora: dataAncora.toISOString().slice(0, 10),
    });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: "Configurações salvas." };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível salvar.",
    };
  }
}
