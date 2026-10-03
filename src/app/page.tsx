import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  Moon,
  TriangleAlert,
  UserRoundPlus,
  Users,
} from "lucide-react";

import { BotaoLink } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listarAusencias,
  listarPeriodos,
  listarPessoas,
  lerConfiguracoes,
  montarEscala,
  periodoVigente,
  semearPostos,
} from "@/db/repositorio";
import { FUNCOES, ROTULO_UNIDADE, type Funcao, type Unidade } from "@/lib/dominio";
import {
  ehNoiteDeServico,
  formatarDataBR,
  paraISO,
  proximaNoiteDeServico,
  rotuloMesCurto,
  somarDias,
} from "@/lib/calendario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel do plantão" };

export default async function Painel() {
  await semearPostos();

  const hoje = new Date();
  const [config, periodos, pessoas, ausencias] = await Promise.all([
    lerConfiguracoes(),
    listarPeriodos(),
    listarPessoas(),
    listarAusencias(),
  ]);

  const vigente = await periodoVigente(hoje);
  const escala = vigente ? await montarEscala(vigente) : null;

  const emServico = ehNoiteDeServico(hoje, config.dataAncora, config.noiteDeServico);
  // Quando hoje é noite de serviço, a próxima é a outra — não a de hoje.
  const proxima = proximaNoiteDeServico(
    emServico ? somarDias(hoje, 1) : hoje,
    config.dataAncora,
    config.noiteDeServico,
  );
  const nomesPorId = new Map(escala?.pessoas.map((p) => [p.id, p.nome]) ?? []);

  const porFuncao = FUNCOES.map((funcao) => ({
    funcao,
    total: pessoas.filter((p) => p.ativo && p.funcao === funcao).length,
  })) as { funcao: Funcao; total: number }[];

  const unidades: Unidade[] = ["F2", "F3", "CRS"];
  const hojeISO = paraISO(hoje);
  const ausenciasAtivas = ausencias.filter(
    (a) => a.inicio <= hojeISO && a.fim >= hojeISO,
  );
  const ativos = pessoas.filter((p) => p.ativo).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">
          Plantão noturno {String(config.turnoInicio).slice(0, 5)} às{" "}
          {String(config.turnoFim).slice(0, 5)} · escala 12x36
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Painel do plantão</h1>
      </header>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="size-4 text-orange-500" aria-hidden />
              {emServico ? "A equipe está de plantão hoje" : "A equipe está de folga hoje"}
            </CardTitle>
<CardDescription>
                {emServico
                  ? `Plantão das ${String(config.turnoInicio).slice(0, 5)} às ${String(config.turnoFim).slice(0, 5)}. A próxima noite de serviço é ${formatarDataBR(proxima)}.`
                  : `A próxima noite de serviço é ${formatarDataBR(proxima)} (${rotuloMesCurto(proxima.getFullYear(), proxima.getMonth() + 1)}).`}
              </CardDescription>
          </CardHeader>
          <CardContent>
            {!vigente ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma escala cadastrada ainda.{" "}
                <Link className="underline" href="/escala">
                  Crie a primeira
                </Link>
                .
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{rotuloMesCurto(vigente.ano, vigente.mes)}</Badge>
                  {escala?.periodo.status === "PUBLICADO" ? (
                    <Badge>Publicada</Badge>
                  ) : (
                    <Badge variant="secondary">Rascunho</Badge>
                  )}
                  <BotaoLink
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    href={`/escala/${vigente.ano}/${String(vigente.mes).padStart(2, "0")}`}
                  >
                    Abrir escala
                    <ChevronRight data-icon="inline-end" />
                  </BotaoLink>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {unidades.map((unidade) => {
                    const vagas = (escala?.postos ?? []).filter((p) => p.unidade === unidade);
                    return (
                      <div key={unidade} className="rounded-lg border p-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {ROTULO_UNIDADE[unidade]}
                        </h3>
                        <ul className="mt-2 space-y-1 text-sm">
                          {vagas.map((posto) => (
                            <li key={posto.codigo} className="flex items-baseline gap-2">
                              <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                                {posto.rotulo}
                              </span>
                              <span className="truncate">
                                {nomesPorId.get(escala?.estado[posto.codigo] ?? "") ?? "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" aria-hidden />
                Quadro da equipe
              </CardTitle>
              <CardDescription>
                {ativos} {ativos === 1 ? "bombeiro ativo" : "bombeiros ativos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {porFuncao.map(({ funcao, total }) => (
                  <li key={funcao} className="flex items-center justify-between">
                    <span className="font-mono text-xs">{funcao}</span>
                    <span className={total > 0 ? "tabular-nums" : "text-muted-foreground"}>
                      {total}
                    </span>
                  </li>
                ))}
              </ul>
              <BotaoLink variant="outline" size="sm" className="mt-4 w-full" href="/pessoas">
                <UserRoundPlus data-icon="inline-start" />
                Gerenciar quadro
              </BotaoLink>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="size-4" aria-hidden />
                Férias e atestados hoje
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {ausenciasAtivas.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma ausência registrada para hoje.</p>
              ) : (
                <ul className="space-y-1">
                  {ausenciasAtivas.map((ausencia) => (
                    <li key={ausencia.id} className="flex items-center gap-2">
                      <TriangleAlert className="size-3.5 text-amber-500" aria-hidden />
                      {pessoas.find((p) => p.id === ausencia.pessoaId)?.nome ?? "—"}
                    </li>
                  ))}
                </ul>
              )}
              <BotaoLink
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                href="/ausencias"
              >
                <CalendarClock data-icon="inline-start" />
                Registrar ausência
              </BotaoLink>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">Meses cadastrados</h2>
        {periodos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum mês criado ainda.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {periodos
              .slice()
              .reverse()
              .map((periodo) => (
                <li key={periodo.id}>
                  <Link
                    href={`/escala/${periodo.ano}/${String(periodo.mes).padStart(2, "0")}`}
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
