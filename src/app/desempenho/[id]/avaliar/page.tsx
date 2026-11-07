import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { FormAvaliacao } from "@/components/desempenho/form-avaliacao";
import { historicoAvaliacoes, lerCiclo, obterPessoa } from "@/db/desempenho";
import { exigirGestao } from "@/lib/acesso-gestao";
import type { Notas } from "@/lib/desempenho";

export const dynamic = "force-dynamic";
export const metadata = { title: "Formulário de avaliação · Desempenho" };

export default async function Avaliar({ params, searchParams }: PageProps<"/desempenho/[id]/avaliar">) {
  const id = Number((await params).id);
  const ciclo = lerCiclo((await searchParams).ciclo);
  await exigirGestao(`/desempenho/${id}/avaliar?ciclo=${ciclo}`);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [pessoa, historico] = await Promise.all([obterPessoa(id), historicoAvaliacoes(id)]);
  if (!pessoa) notFound();
  const atual = historico.find((h) => h.ciclo === ciclo) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link
        href={`/desempenho/${id}?ciclo=${ciclo}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Painel de {pessoa.nomeGuerra ?? pessoa.nome}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Avaliação de desempenho · ciclo {ciclo}</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Mesmos itens e textos da planilha da empresa. Dá para salvar com parte das notas e terminar depois.
      </p>
      <FormAvaliacao
        efetivoId={id}
        nome={pessoa.nome}
        ciclo={ciclo}
        notasIniciais={(atual?.notas ?? {}) as Notas}
        dataAvaliacao={atual?.dataAvaliacao ?? null}
        observacoes={atual?.observacoes ?? null}
        planoAcao={atual?.planoAcao ?? null}
      />
    </div>
  );
}
