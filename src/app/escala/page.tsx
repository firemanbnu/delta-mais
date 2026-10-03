import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

import { BotaoLink } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  listarPeriodos,
  lerConfiguracoes,
  montarEscala,
  semearPostos,
} from "@/db/repositorio";
import { type Unidade } from "@/lib/dominio";
import {
  anoMesAtual,
  diasDoMes,
  ehNoiteDeServico,
  mesAnterior,
  mesSeguinte,
  rotuloMesCurto,
} from "@/lib/calendario";

export const dynamic = "force-dynamic";

export const metadata = { title: "Escalas" };

export default async function PaginaEscalas() {
  await semearPostos();
  const [periodos, config] = await Promise.all([listarPeriodos(), lerConfiguracoes()]);
  const atual = anoMesAtual();
  const caminho = (ano: number, mes: number) => `/escala/${ano}/${String(mes).padStart(2, "0")}`;
  const unidades: Unidade[] = ["F2", "F3", "CRS"];

  const anterior = mesAnterior(atual);
  const proximo = mesSeguinte(atual);
  const anteriores = [anterior, atual, proximo];
  const escalas = await Promise.all(anteriores.map((periodo) => montarEscala(periodo)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">Escala de serviço · plantão noturno 12x36</p>
        <h1 className="text-2xl font-semibold tracking-tight">Escalas mensais</h1>
      </header>

      <section className="mt-5 flex flex-wrap items-center gap-2">
        <BotaoLink
          variant="outline"
          size="icon"
          aria-label="Mês anterior"
          href={caminho(anterior.ano, anterior.mes)}
        >
          <ChevronLeft />
        </BotaoLink>
        <span className="min-w-40 text-center text-sm font-medium">
          {rotuloMesCurto(atual.ano, atual.mes)}
        </span>
        <BotaoLink
          variant="outline"
          size="icon"
          aria-label="Próximo mês"
          href={caminho(proximo.ano, proximo.mes)}
        >
          <ChevronRight />
        </BotaoLink>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        {anteriores.map((periodo, indice) => {
          const escala = escalas[indice];
          const erros = escala?.problemas.filter((p) => p.severidade === "erro").length ?? 0;
          const noites = diasDoMes(periodo.ano, periodo.mes).filter((d) =>
            ehNoiteDeServico(d, config.dataAncora, config.noiteDeServico),
          ).length;
          const nomesPorId = new Map(escala?.pessoas.map((p) => [p.id, p.nome]) ?? []);

          return (
            <article
              key={`${periodo.ano}-${periodo.mes}`}
              className="flex flex-col rounded-xl border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{rotuloMesCurto(periodo.ano, periodo.mes)}</h2>
                {escala ? (
                  <Badge
                    variant={escala.periodo.status === "PUBLICADO" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {escala.periodo.status === "PUBLICADO" ? "Publicada" : "Rascunho"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Não criada
                  </Badge>
                )}
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                {noites} {noites === 1 ? "noite de serviço" : "noites de serviço"}
                {erros > 0 ? ` · ${erros} ${erros === 1 ? "erro" : "erros"}` : ""}
              </p>

              {escala ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {unidades.map((unidade) => (
                    <li key={unidade} className="flex gap-2">
                      <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                        {unidade}
                      </span>
                      <span className="text-muted-foreground">
                        {escala.postos
                          .filter((p) => p.unidade === unidade)
                          .map((p) => nomesPorId.get(escala.estado[p.codigo] ?? ""))
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarPlus className="size-4" aria-hidden />
                  Abra o mês para criar a escala.
                </p>
              )}

              <BotaoLink
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                href={caminho(periodo.ano, periodo.mes)}
              >
                Abrir escala
              </BotaoLink>
            </article>
          );
        })}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Todos os meses</h2>
        {periodos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum mês cadastrado. Abra o mês desejado para criar a primeira escala.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {periodos
              .slice()
              .reverse()
              .map((periodo) => (
                <li key={periodo.id}>
                  <Link
                    href={caminho(periodo.ano, periodo.mes)}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-secondary/60"
                  >
                    <span>{rotuloMesCurto(periodo.ano, periodo.mes)}</span>
                    <Badge
                      variant={periodo.status === "PUBLICADO" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {periodo.status === "PUBLICADO" ? "Publicada" : "Rascunho"}
                    </Badge>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

    </div>
  );
}
