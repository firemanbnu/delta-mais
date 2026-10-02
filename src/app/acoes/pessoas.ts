"use server";

import { revalidatePath } from "next/cache";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { garantirTimePadrao, listarPessoas } from "@/db/repositorio";
import { people } from "@/db/schema";
import { FUNCOES } from "@/lib/dominio";
import type { Resultado } from "./escala";

const pessoaSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(2, "Informe o nome completo."),
  matricula: z.string().trim().optional(),
  funcao: z.enum(FUNCOES),
  telefone: z.string().trim().optional(),
  postoFixo: z.string().trim().optional(),
  ordem: z.coerce.number().int().min(0).max(999).default(0),
  ativo: z.coerce.boolean().default(true),
  observacoes: z.string().trim().optional(),
});

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

export async function salvarPessoaAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  // O formulário não tem campo "ativo"; quando ele não vem, vale o padrão do schema.
  const ativo = dados.get("ativo");

  const entrada = pessoaSchema.safeParse({
    id: dados.get("id") || undefined,
    nome: dados.get("nome"),
    matricula: dados.get("matricula") ?? "",
    funcao: dados.get("funcao"),
    telefone: dados.get("telefone") ?? "",
    postoFixo: dados.get("postoFixo") ?? "",
    ordem: dados.get("ordem") || 0,
    ativo: ativo === null ? undefined : ativo === "on" || ativo === "true",
    observacoes: dados.get("observacoes") ?? "",
  });

  if (!entrada.success) {
    const primeiro = entrada.error.issues[0];
    return { ok: false, erro: primeiro?.message ?? "Dados inválidos." };
  }

  const db = getDb();

  try {
    const { id, ...campos } = entrada.data;
    const valores = {
      nome: campos.nome,
      matricula: campos.matricula || null,
      funcao: campos.funcao,
      telefone: campos.telefone || null,
      postoFixo: campos.postoFixo || null,
      ordem: campos.ordem,
      ativo: campos.ativo,
      observacoes: campos.observacoes || null,
    };

    if (id) {
      const [atual] = await db.select().from(people).where(eq(people.id, id)).limit(1);
      if (!atual) return { ok: false, erro: "Pessoa não encontrada." };

      // "ativo" não é campo do formulário: quem muda a situação é o botão da lista.
      await db
        .update(people)
        .set({ ...valores, ativo: atual.ativo })
        .where(eq(people.id, id));
      return ok(`${valores.nome} foi atualizado.`);
    }

    const equipe = await garantirTimePadrao();
    const total = (await listarPessoas(equipe.id)).length;
    await db
      .insert(people)
      .values({ ...valores, equipeId: equipe.id, ordem: valores.ordem || total + 1 });
    return ok(`${valores.nome} entrou no quadro.`);
  } catch (erro) {
    return falhar(erro);
  }
}

export async function alternarAtivoAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  const id = z.coerce.number().int().positive().safeParse(dados.get("id"));
  if (!id.success) return { ok: false, erro: "Pessoa inválida." };

  const db = getDb();
  try {
    const [pessoa] = await db.select().from(people).where(eq(people.id, id.data)).limit(1);
    if (!pessoa) return { ok: false, erro: "Pessoa não encontrada." };

    await db.update(people).set({ ativo: !pessoa.ativo }).where(eq(people.id, pessoa.id));
    revalidatePath("/", "layout");
    return { ok: true, mensagem: `${pessoa.nome} ${pessoa.ativo ? "desativado" : "reativado"}.` };
  } catch (erro) {
    return falhar(erro);
  }
}

export async function excluirPessoaAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  const id = z.coerce.number().int().positive().safeParse(dados.get("id"));
  if (!id.success) return { ok: false, erro: "Pessoa inválida." };

const db = getDb();
  try {
    const pessoa = await db.query.people.findFirst({
      where: and(eq(people.id, id.data)),
    });
    if (!pessoa) return { ok: false, erro: "Pessoa não encontrada." };

    await db.delete(people).where(eq(people.id, id.data));
    revalidatePath("/", "layout");
    return { ok: true, mensagem: `${pessoa.nome} saiu do quadro.` };
  } catch (erro) {
    return falhar(erro);
  }
}
