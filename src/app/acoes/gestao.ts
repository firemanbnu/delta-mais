"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { documentosPessoa, efetivo, tiposDocumento } from "@/db/schema";
import {
  abrirSessaoGestao,
  encerrarSessaoGestao,
  exigirGestao,
  gestaoConfigurada,
  senhaConfere,
} from "@/lib/acesso-gestao";
import { nomeEmMaiusculas } from "@/lib/dominio";
import {
  EQUIPES_EFETIVO,
  FORMAS_DOCUMENTO,
  FUNCOES_EFETIVO,
  SITUACOES_DOCUMENTO,
  SITUACOES_EFETIVO,
} from "@/lib/gestao";
import type { Resultado } from "./escala";

function ok(mensagem: string): Resultado {
  revalidatePath("/gestao", "layout");
  return { ok: true, mensagem };
}

function falhar(erro: unknown): Resultado {
  return {
    ok: false,
    erro: erro instanceof Error ? erro.message : "Não foi possível salvar.",
  };
}

function primeiroErro(erro: z.ZodError): Resultado {
  return { ok: false, erro: erro.issues[0]?.message ?? "Dados inválidos." };
}

const vazioParaNulo = (valor: FormDataEntryValue | null) => {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto === "" ? null : texto;
};

export async function entrarGestaoAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  if (!gestaoConfigurada()) {
    return { ok: false, erro: "A senha da Gestão ainda não foi definida na Vercel (GESTAO_SENHA)." };
  }
  const senha = String(dados.get("senha") ?? "");
  // Pequena espera para dificultar tentativas em sequência.
  await new Promise((r) => setTimeout(r, 400));
  if (!senhaConfere(senha)) return { ok: false, erro: "Senha incorreta." };
  await abrirSessaoGestao();
  redirect("/gestao");
}

export async function sairGestaoAction(): Promise<void> {
  await encerrarSessaoGestao();
  redirect("/");
}

const documentoSchema = z.object({
  efetivoId: z.coerce.number().int().positive(),
  tipoId: z.coerce.number().int().positive(),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .nullable(),
  situacao: z.enum(SITUACOES_DOCUMENTO),
  arquivoUrl: z.url("Link do arquivo inválido.").nullable(),
  observacao: z.string().max(500).nullable(),
});

export async function salvarDocumentoAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  await exigirGestao();
  const entrada = documentoSchema.safeParse({
    efetivoId: dados.get("efetivoId"),
    tipoId: dados.get("tipoId"),
    data: vazioParaNulo(dados.get("data")),
    situacao: dados.get("situacao"),
    arquivoUrl: vazioParaNulo(dados.get("arquivoUrl")),
    observacao: vazioParaNulo(dados.get("observacao")),
  });
  if (!entrada.success) return primeiroErro(entrada.error);

  const db = getDb();
  try {
    const { efetivoId, tipoId, ...campos } = entrada.data;
    const valores = { ...campos, origem: "MANUAL", atualizadoEm: new Date() };
    const [atual] = await db
      .select({ id: documentosPessoa.id })
      .from(documentosPessoa)
      .where(and(eq(documentosPessoa.efetivoId, efetivoId), eq(documentosPessoa.tipoId, tipoId)))
      .limit(1);
    if (atual) {
      await db.update(documentosPessoa).set(valores).where(eq(documentosPessoa.id, atual.id));
    } else {
      await db.insert(documentosPessoa).values({ efetivoId, tipoId, ...valores });
    }
    return ok("Documento atualizado.");
  } catch (erro) {
    return falhar(erro);
  }
}

const tipoSchema = z.object({
  id: z.coerce.number().int().positive(),
  nome: z.string().trim().min(2, "Informe o nome do documento."),
  forma: z.enum(FORMAS_DOCUMENTO),
  validadeMeses: z.coerce.number().int().min(1, "Validade mínima de 1 mês.").max(240).nullable(),
  funcoesObrigatorias: z.array(z.enum(FUNCOES_EFETIVO)),
  ativo: z.boolean(),
});

export async function salvarTipoDocumentoAction(
  _estado: unknown,
  dados: FormData,
): Promise<Resultado> {
  await exigirGestao();
  const validade = vazioParaNulo(dados.get("validadeMeses"));
  const entrada = tipoSchema.safeParse({
    id: dados.get("id"),
    nome: dados.get("nome"),
    forma: dados.get("forma"),
    validadeMeses: validade,
    funcoesObrigatorias: dados.getAll("funcoesObrigatorias"),
    ativo: dados.get("ativo") === "on",
  });
  if (!entrada.success) return primeiroErro(entrada.error);

  try {
    const { id, ...campos } = entrada.data;
    await getDb().update(tiposDocumento).set(campos).where(eq(tiposDocumento.id, id));
    return ok(`${campos.nome} atualizado.`);
  } catch (erro) {
    return falhar(erro);
  }
}

const efetivoSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(3, "Informe o nome completo.").transform(nomeEmMaiusculas),
  nomeGuerra: z.string().trim().nullable(),
  matricula: z.string().trim().nullable(),
  funcao: z.enum(FUNCOES_EFETIVO).nullable(),
  equipe: z.enum(EQUIPES_EFETIVO).nullable(),
  situacao: z.enum(SITUACOES_EFETIVO),
  pastaDrive: z.string().trim().nullable(),
  observacoes: z.string().trim().max(500).nullable(),
});

export async function salvarEfetivoAction(_estado: unknown, dados: FormData): Promise<Resultado> {
  await exigirGestao();
  const entrada = efetivoSchema.safeParse({
    id: vazioParaNulo(dados.get("id")) ?? undefined,
    nome: dados.get("nome"),
    nomeGuerra: vazioParaNulo(dados.get("nomeGuerra")),
    matricula: vazioParaNulo(dados.get("matricula")),
    funcao: vazioParaNulo(dados.get("funcao")),
    equipe: vazioParaNulo(dados.get("equipe")),
    situacao: dados.get("situacao") ?? "ATIVO",
    pastaDrive: vazioParaNulo(dados.get("pastaDrive")),
    observacoes: vazioParaNulo(dados.get("observacoes")),
  });
  if (!entrada.success) return primeiroErro(entrada.error);

  const db = getDb();
  try {
    const { id, ...campos } = entrada.data;
    const valores = {
      ...campos,
      nomeGuerra: campos.nomeGuerra ? nomeEmMaiusculas(campos.nomeGuerra) : null,
      atualizadoEm: new Date(),
    };
    if (id) {
      await db.update(efetivo).set(valores).where(eq(efetivo.id, id));
      return ok(`${valores.nome} atualizado.`);
    }
    await db.insert(efetivo).values(valores);
    return ok(`${valores.nome} entrou no efetivo.`);
  } catch (erro) {
    const texto = erro instanceof Error ? erro.message : "";
    if (texto.includes("efetivo_nome_idx")) {
      return { ok: false, erro: "Já existe alguém com esse nome no efetivo." };
    }
    return falhar(erro);
  }
}
