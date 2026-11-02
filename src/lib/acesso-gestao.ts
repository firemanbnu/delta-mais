import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Senha da área de Gestão.
 *
 * As escalas continuam abertas; a Gestão guarda dados pessoais do efetivo e
 * pede a senha definida na variável de ambiente `GESTAO_SENHA` (na Vercel).
 * Sem a variável, a Gestão fica trancada para todos.
 */
export const COOKIE_GESTAO = "gestao_sessao";
const DURACAO_SEGUNDOS = 60 * 60 * 24 * 30;

function senhaConfigurada(): string | null {
  const senha = process.env.GESTAO_SENHA?.trim();
  return senha ? senha : null;
}

export function gestaoConfigurada(): boolean {
  return senhaConfigurada() !== null;
}

/** Valor do cookie: assinatura da senha. Trocar a senha derruba as sessões. */
function assinatura(senha: string): string {
  return createHmac("sha256", senha).update("delta-mais:gestao:v1").digest("hex");
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function senhaConfere(tentativa: string): boolean {
  const senha = senhaConfigurada();
  if (!senha) return false;
  return iguais(assinatura(tentativa), assinatura(senha));
}

export async function gestaoLiberada(): Promise<boolean> {
  const senha = senhaConfigurada();
  if (!senha) return false;
  const valor = (await cookies()).get(COOKIE_GESTAO)?.value;
  return Boolean(valor && iguais(valor, assinatura(senha)));
}

/** Usar no topo das páginas e ações da Gestão. */
export async function exigirGestao(): Promise<void> {
  if (!(await gestaoLiberada())) redirect("/gestao/entrar");
}

export async function abrirSessaoGestao(): Promise<void> {
  const senha = senhaConfigurada();
  if (!senha) return;
  (await cookies()).set(COOKIE_GESTAO, assinatura(senha), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function encerrarSessaoGestao(): Promise<void> {
  (await cookies()).delete(COOKIE_GESTAO);
}
