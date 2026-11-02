import Link from "next/link";
import { BookCheck, ChevronRight, FileCheck2, LogOut, UsersRound } from "lucide-react";

import { sairGestaoAction } from "@/app/acoes/gestao";
import { Button } from "@/components/ui/button";
import { listarTiposDocumento, montarQuadroDocumentos } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestão" };

export default async function Gestao() {
  await exigirGestao();
  const quadro = await montarQuadroDocumentos();
  const tipos = await listarTiposDocumento();
  const semValidade = tipos.filter(
    (t) => t.ativo && t.forma === "REALIZACAO" && !t.validadeMeses,
  ).length;
  const ativos = quadro.linhas.length;
  const { contagem } = quadro;
  const urgentes = contagem.VENCIDO + contagem.FALTA + contagem.VENCE_30;

  const modulos = [
    {
      href: "/gestao/documentos",
      titulo: "Documentação",
      descricao: "Vencimento e entrega de cursos, NRs, CNH e documentos de RH.",
      detalhe:
        urgentes > 0
          ? `${urgentes} pendências urgentes (vencidos, faltando ou vencendo em 30 dias).`
          : "Nenhuma pendência urgente.",
      icone: FileCheck2,
    },
    {
      href: "/gestao/catalogo",
      titulo: "Catálogo de documentos",
      descricao: "Validade de cada documento e para quais funções ele é obrigatório.",
      detalhe:
        semValidade > 0
          ? `${semValidade} documentos ainda sem validade definida.`
          : "Todas as validades definidas.",
      icone: BookCheck,
    },
    {
      href: "/gestao/efetivo",
      titulo: "Efetivo",
      descricao: "Pessoas de todas as equipes, com função, equipe e situação.",
      detalhe: `${ativos} pessoas ativas.`,
      icone: UsersRound,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Todas as equipes</p>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão</h1>
        </div>
        <form action={sairGestaoAction}>
          <Button type="submit" size="sm" variant="ghost">
            <LogOut data-icon="inline-start" />
            Sair da Gestão
          </Button>
        </form>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map(({ href, titulo, descricao, detalhe, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-secondary/40"
          >
            <Icone className="size-6 text-sky-500" aria-hidden />
            <span className="mt-3 flex items-center gap-1 font-semibold">
              {titulo}
              <ChevronRight className="size-4" aria-hidden />
            </span>
            <span className="mt-1 text-sm text-muted-foreground">{descricao}</span>
            <span className="mt-3 text-xs">{detalhe}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
