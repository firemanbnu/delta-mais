import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarClock,
  ExternalLink,
  GraduationCap,
  Mail,
  Moon,
  Plus,
  Stethoscope,
} from "lucide-react";

import { EditarPtrba } from "@/components/painel-dia/editar-ptrba";
import { TrocasDaNoite } from "@/components/painel-dia/trocas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ausenciasEntre,
  emailsRecentes,
  nomesDaEquipe,
  ptrbaDasNoites,
  sincronizacoes,
  trocasEntre,
} from "@/db/painel-dia";
import { lerConfiguracoes } from "@/db/repositorio";
import { exigirGestao } from "@/lib/acesso-gestao";
import { DIAS_SEMANA, formatarDataBR, paraData, paraISO, somarDias } from "@/lib/calendario";
import { ROTULOS_AUSENCIA } from "@/lib/dominio";
import {
  FUSO_PLANTAO,
  ROTULO_SITUACAO_PLANTAO,
  agoraNoFuso,
  ausenteNaNoite,
  plantoesDoPainel,
  programaPtrba,
} from "@/lib/painel-dia";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel do dia" };

function diaDaSemana(data: string) {
  return DIAS_SEMANA[paraData(data).getDay()];
}

function quando(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_PLANTAO,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

const COR_AUSENCIA: Record<string, string> = {
  ATESTADO: "bg-red-500/10 text-red-700 dark:text-red-300",
  FERIAS: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  DISPENSA: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export default async function PainelDoDia() {
  await exigirGestao("/dia");

  const config = await lerConfiguracoes();
  const agora = agoraNoFuso();
  const plantoes = plantoesDoPainel({
    dataISO: agora.dataISO,
    minutos: agora.minutos,
    ancora: String(config.dataAncora),
    noite: config.noiteDeServico,
    turnoInicio: String(config.turnoInicio),
    turnoFim: String(config.turnoFim),
  });
  const datas = plantoes.map((p) => p.data);
  const primeiro = datas[0];
  const ultimo = datas[datas.length - 1];
  const inicioAtestados = paraISO(somarDias(agora.dataISO, -30));
  const fimAtestados = paraISO(somarDias(agora.dataISO, 60));

  const [trocas, ptrba, ausencias, emails, sinc, nomes] = await Promise.all([
    trocasEntre(primeiro, ultimo),
    ptrbaDasNoites(datas),
    ausenciasEntre(inicioAtestados, fimAtestados),
    emailsRecentes(15),
    sincronizacoes(),
    nomesDaEquipe(),
  ]);

  const atestados = ausencias.filter((a) => a.tipo === "ATESTADO");
  const emailSinc = sinc.get("gmail");
  const ptrbaSinc = sinc.get("ptrba");
  const naoLidos = emails.filter((e) => e.naoLido).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {diaDaSemana(agora.dataISO)}, {formatarDataBR(agora.dataISO)} · Equipe Delta
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Painel do dia</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Plantão atual e os próximos 3, com PTR-BA, trocas e afastamentos.
        </p>
      </header>

      {/* Plantões: atual + 3 próximos */}
      <section aria-label="Plantões" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plantoes.map((p, i) => {
          const linhas = ptrba.filter((l) => l.data === p.data);
          const programa = programaPtrba(linhas);
          const daNoite = trocas.filter((t) => t.data === p.data);
          const ausentes = ausencias.filter((a) => ausenteNaNoite(a, p.data));
          return (
            <Card key={p.data} className={i === 0 ? "border-orange-500/50 ring-1 ring-orange-500/20" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Moon className="size-4 text-orange-500" aria-hidden />
                    {formatarDataBR(p.data)}
                  </span>
                  <Badge variant={i === 0 ? "default" : "outline"}>{ROTULO_SITUACAO_PLANTAO[p.situacao]}</Badge>
                </CardTitle>
                <CardDescription>
                  {diaDaSemana(p.data)} às {String(config.turnoInicio).slice(0, 5)} até{" "}
                  {diaDaSemana(paraISO(somarDias(p.data, 1))).toLowerCase()} às{" "}
                  {String(config.turnoFim).slice(0, 5)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="size-3.5" aria-hidden /> PTR-BA
                    </span>
                    <EditarPtrba data={p.data} linhas={linhas} nomes={nomes} />
                  </h3>
                  {linhas.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Sem programação cadastrada.</p>
                  ) : (
                    <ol className="mt-1.5 space-y-1.5">
                      {programa.instrucoes.map((x) => (
                        <li key={x.horario} className="text-sm leading-snug">
                          <span className="mr-1.5 text-xs tabular-nums text-muted-foreground">{x.horario}</span>
                          {x.assunto}
                          {x.instrutor ? (
                            <span className="ml-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                              · {x.instrutor}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                  {programa.atividadeFisica && programa.instrucoes.length === 3 && linhas.some((l) => l.ordem === 3) ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Atividade física: {programa.atividadeFisica}
                    </p>
                  ) : null}
                </div>

                <div>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ArrowRightLeft className="size-3.5" aria-hidden /> Trocas de serviço
                  </h3>
                  <TrocasDaNoite
                    data={p.data}
                    trocas={daNoite.map((t) => ({ id: t.id, sai: t.sai, entra: t.entra, observacao: t.observacao }))}
                    nomes={nomes}
                  />
                </div>

                <div>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Stethoscope className="size-3.5" aria-hidden /> Fora nesta noite
                  </h3>
                  {ausentes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Equipe completa.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {ausentes.map((a) => (
                        <li key={a.id} className={`rounded-md px-2 py-0.5 text-xs ${COR_AUSENCIA[a.tipo] ?? ""}`}>
                          <span className="font-medium">{a.nome}</span> · {ROTULOS_AUSENCIA[a.tipo]}
                          {a.ferista ? ` (cobre ${a.ferista})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
      {ptrbaSinc ? (
        <p className="mt-2 text-xs text-muted-foreground">
          PTR-BA importado da tabela {ptrbaSinc.detalhe ?? "Escala Delta"} em {quando(ptrbaSinc.atualizadoEm)}.
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-5">
        {/* Atestados */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="size-4 text-red-500" aria-hidden /> Atestados
            </CardTitle>
            <CardDescription>Últimos 30 dias e os já lançados para frente.</CardDescription>
          </CardHeader>
          <CardContent>
            {atestados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atestado no período.</p>
            ) : (
              <ul className="divide-y text-sm">
                {atestados.map((a) => {
                  const vigente = ausenteNaNoite(a, agora.dataISO);
                  return (
                    <li key={a.id} className="flex items-start justify-between gap-2 py-2">
                      <span>
                        <span className="font-medium">{a.nome}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatarDataBR(a.inicio)}
                          {a.fim !== a.inicio ? ` a ${formatarDataBR(a.fim)}` : ""}
                          {a.observacoes ? ` · ${a.observacoes}` : ""}
                        </span>
                      </span>
                      {vigente ? <Badge variant="destructive">Em vigor</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/ausencias"
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Plus className="size-3.5" aria-hidden /> Lançar atestado, férias ou dispensa
            </Link>
          </CardContent>
        </Card>

        {/* E-mails */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4 text-sky-500" aria-hidden /> E-mails
              {naoLidos > 0 ? <Badge variant="secondary">{naoLidos} não lidos</Badge> : null}
            </CardTitle>
            <CardDescription>
              Caixa de entrada do Gmail da equipe.{" "}
              {emailSinc ? `Atualizado em ${quando(emailSinc.atualizadoEm)}.` : "Ainda não sincronizado."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum e-mail copiado ainda.</p>
            ) : (
              <ul className="divide-y">
                {emails.map((e) => (
                  <li key={e.id} className="py-2">
                    <a
                      href={e.link ?? "https://mail.google.com/"}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-md"
                    >
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span className={`truncate ${e.naoLido ? "font-semibold" : ""}`}>{e.assunto}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {quando(e.recebidoEm)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {e.importante ? <Badge variant="outline" className="h-4 px-1 text-[10px]">importante</Badge> : null}
                        <span className="truncate">{e.de}</span>
                        <ExternalLink className="size-3 opacity-0 group-hover:opacity-100" aria-hidden />
                      </span>
                      {e.trecho ? (
                        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.trecho}</span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Espaço reservado para as próximas funções do painel. */}
      <section className="mt-6">
        <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4" aria-hidden />
            Espaço reservado para novas funções do painel (viaturas, avisos, checklists…).
          </span>
          <span className="text-xs">Peça ao Claude o que quer ver aqui.</span>
        </div>
      </section>
    </div>
  );
}
