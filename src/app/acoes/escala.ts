"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import {
  criarMesManual,
  definirOcupante,
  excluirPeriodo,
  gerarMesSeguinte,
  publicarPeriodo,
  regerarAutomatico,
  restaurarAutomatico,
  voltarParaRascunho,
} from "@/db/repositorio";

export type Resultado = { ok: true; mensagem: string } | { ok: false; erro: string };

const periodoSchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

function caminhoEscala(ano: number, mes: number) {
  return `/escala/${ano}/${String(mes).padStart(2, "0")}`;
}

function ok(mensagem: string): Resultado {
  revalidatePath("/", "layout");
  return { ok: true, mensagem };
}

function falhar(erro: unknown): Resultado {
  const mensagem =
    erro instanceof Error ? erro.message : "Não foi possível concluir a operação.";
  return { ok: false, erro: mensagem };
}

export async function criarMesAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  const entrada = periodoSchema.safeParse({
    ano: dados.get("ano"),
    mes: dados.get("mes"),
  });
  if (!entrada.success) return { ok: false, erro: "Ano ou mês inválido." };

  try {
    const { ano, mes } = entrada.data;
    await criarMesManual({ ano, mes });
    revalidatePath(caminhoEscala(ano, mes));
    return ok("Mês criado. Preencha as vagas manualmente.");
  } catch (erro) {
    return falhar(erro);
  }
}

export async function gerarMesAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  const entrada = periodoSchema.safeParse({
    ano: dados.get("ano"),
    mes: dados.get("mes"),
  });
  if (!entrada.success) return { ok: false, erro: "Ano ou mês inválido." };

  try {
    const { ano, mes } = entrada.data;
    await gerarMesSeguinte({ ano, mes });
    revalidatePath(caminhoEscala(ano, mes));
    return ok("Escala gerada a partir do rodízio do mês anterior.");
  } catch (erro) {
    return falhar(erro);
  }
}

export async function regerarAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  const entrada = periodoSchema.safeParse({
    ano: dados.get("ano"),
    mes: dados.get("mes"),
  });
  if (!entrada.success) return { ok: false, erro: "Ano ou mês inválido." };

  try {
    const { ano, mes } = entrada.data;
    await regerarAutomatico({ ano, mes });
    revalidatePath(caminhoEscala(ano, mes));
    return ok("Vagas automáticas refeitas. Suas alterações manuais foram mantidas.");
  } catch (erro) {
    return falhar(erro);
  }
}

const ocupanteSchema = z.object({
  ano: z.coerce.number().int(),
  mes: z.coerce.number().int(),
  codigoPosto: z.string().min(1),
  pessoaId: z
    .string()
    .transform((v) => (v === "" || v === "vazio" ? null : Number(v)))
    .pipe(z.number().int().positive().nullable()),
});

export async function definirOcupanteAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const entrada = ocupanteSchema.safeParse({
    ano: dados.get("ano"),
    mes: dados.get("mes"),
    codigoPosto: dados.get("codigoPosto"),
    pessoaId: dados.get("pessoaId") ?? "",
  });
  if (!entrada.success) return { ok: false, erro: "Dados inválidos." };

  try {
    const { ano, mes, codigoPosto, pessoaId } = entrada.data;
    await definirOcupante({ ano, mes }, codigoPosto, pessoaId, "MANUAL");
    revalidatePath(caminhoEscala(ano, mes));
    return { ok: true, mensagem: `${codigoPosto} atualizada.` };
  } catch (erro) {
    return falhar(erro);
  }
}

export async function restaurarAutomaticoAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const entrada = ocupanteSchema.partial({ pessoaId: true }).safeParse({
    ano: dados.get("ano"),
    mes: dados.get("mes"),
    codigoPosto: dados.get("codigoPosto"),
  });
  if (!entrada.success) return { ok: false, erro: "Dados inválidos." };

  try {
    const { ano, mes, codigoPosto } = entrada.data;
    await restaurarAutomatico({ ano, mes }, codigoPosto);
    revalidatePath(caminhoEscala(ano, mes));
    return { ok: true, mensagem: `${codigoPosto} voltou para o rodízio automático.` };
  } catch (erro) {
    return falhar(erro);
  }
}

export async function publicarAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  const entrada = periodoSchema.safeParse({ ano: dados.get("ano"), mes: dados.get("mes") });
  if (!entrada.success) return { ok: false, erro: "Ano ou mês inválido." };

  try {
    const { ano, mes } = entrada.data;
    await publicarPeriodo({ ano, mes });
    revalidatePath(caminhoEscala(ano, mes));
    return ok("Escala publicada.");
  } catch (erro) {
    return falhar(erro);
  }
}

export async function voltarRascunhoAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  const entrada = periodoSchema.safeParse({ ano: dados.get("ano"), mes: dados.get("mes") });
  if (!entrada.success) return { ok: false, erro: "Ano ou mês inválido." };

  try {
    const { ano, mes } = entrada.data;
    await voltarParaRascunho({ ano, mes });
    revalidatePath(caminhoEscala(ano, mes));
    return ok("Escala voltou para rascunho.");
  } catch (erro) {
    return falhar(erro);
  }
}

export async function excluirMesAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  const entrada = periodoSchema.safeParse({ ano: dados.get("ano"), mes: dados.get("mes") });
  if (!entrada.success) return { ok: false, erro: "Ano ou mês inválido." };

  try {
    const { ano, mes } = entrada.data;
    await excluirPeriodo({ ano, mes });
    revalidatePath(caminhoEscala(ano, mes));
    return ok("Mês excluído.");
  } catch (erro) {
    return falhar(erro);
  }
}
