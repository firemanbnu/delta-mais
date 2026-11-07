import Link from "next/link";
import { CalendarRange, ChartNoAxesCombined, ChevronRight, ClipboardList, Lock } from "lucide-react";

import { lerConfiguracoes } from "@/db/repositorio";
import {
  ehNoiteDeServico,
  formatarDataBR,
  proximaNoiteDeServico,
  somarDias,
} from "@/lib/calendario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delta Mais" };

/** Entrada do app: o usuário escolhe se vai trabalhar nas escalas ou na gestão. */
export default async function Entrada() {
  const config = await lerConfiguracoes();
  const hoje = new Date();
  const emServico = ehNoiteDeServico(hoje, config.dataAncora, config.noiteDeServico);
  const proxima = proximaNoiteDeServico(
    emServico ? somarDias(hoje, 1) : hoje,
    config.dataAncora,
    config.noiteDeServico,
  );

  const areas = [
    {
      href: "/plantao",
      titulo: "Escalas",
      descricao:
        "Escala mensal das viaturas, rádio, faxina e abastecimento; férias, atestados e impressão.",
      detalhe: emServico
        ? "A Delta está de plantão hoje."
        : `Próxima noite de serviço: ${formatarDataBR(proxima)}.`,
      icone: CalendarRange,
      cor: "text-orange-500 bg-orange-500/10",
    },
    {
      href: "/gestao",
      titulo: "Gestão",
      descricao:
        "Efetivo de todas as equipes e controle de vencimento e entrega de documentos.",
      detalhe: "Área protegida por senha.",
      icone: ClipboardList,
      cor: "text-sky-500 bg-sky-500/10",
    },
    {
      href: "/desempenho",
      titulo: "Avaliação de desempenho",
      descricao:
        "Formulário da empresa para a Equipe Delta, painéis individuais e da equipe e sugestões de desenvolvimento.",
      detalhe: "Área protegida por senha.",
      icone: ChartNoAxesCombined,
      cor: "text-emerald-500 bg-emerald-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header>
        <p className="text-sm text-muted-foreground">SESCINC SBNF · Equipe Delta</p>
        <h1 className="text-2xl font-semibold tracking-tight">No que você vai trabalhar?</h1>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map(({ href, titulo, descricao, detalhe, icone: Icone, cor }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-secondary/40"
          >
            <span className={`flex size-11 items-center justify-center rounded-lg ${cor}`}>
              <Icone className="size-6" aria-hidden />
            </span>
            <span className="mt-4 flex items-center gap-1 text-lg font-semibold">
              {titulo}
              <ChevronRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
            <span className="mt-1 text-sm text-muted-foreground">{descricao}</span>
            <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              {href !== "/plantao" ? <Lock className="size-3" aria-hidden /> : null}
              {detalhe}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
