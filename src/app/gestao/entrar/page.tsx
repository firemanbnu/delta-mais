import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { FormEntrar } from "@/components/gestao/form-entrar";
import { destinoSeguro, gestaoConfigurada, gestaoLiberada } from "@/lib/acesso-gestao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar na Gestão" };

export default async function EntrarGestao({ searchParams }: PageProps<"/gestao/entrar">) {
  const volta = destinoSeguro((await searchParams).volta);
  if (await gestaoLiberada()) redirect(volta ?? "/gestao");
  const configurada = gestaoConfigurada();

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <span className="flex size-11 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
        <ClipboardList className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Gestão do efetivo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Esta área guarda dados pessoais do efetivo e pede senha.
      </p>
      <div className="mt-6">
        {configurada ? (
          <FormEntrar volta={volta} />
        ) : (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            A senha ainda não foi definida. Na Vercel, em Settings → Environment Variables, crie a
            variável <code className="font-mono">GESTAO_SENHA</code> e faça um novo deploy.
          </p>
        )}
      </div>
    </div>
  );
}
