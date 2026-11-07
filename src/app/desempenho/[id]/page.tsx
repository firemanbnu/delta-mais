import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardPen, Lightbulb, MessagesSquare, Sparkles, Target } from "lucide-react";

import { BarraNota, Indicador, SeloNota, corNota } from "@/components/desempenho/comum";
import { NoveBox } from "@/components/desempenho/nove-box";
import { Radar } from "@/components/desempenho/radar";
import { BotaoImprimir } from "@/components/escala/botao-imprimir";
import { BotaoLink } from "@/components/ui/link-button";
import { dataBR } from "@/components/gestao/comum";
import { historicoAvaliacoes, lerCiclo, listarAvaliados, obterPessoa } from "@/db/desempenho";
import { exigirGestao } from "@/lib/acesso-gestao";
import {
  ACOES_COMPETENCIA,
  COMPETENCIAS,
  PILARES,
  ROTULO_PILAR,
  analisarEquipe,
  classificar,
  classificarMedia,
  formatarNota,
  mediaGeral,
  mediasPorPilar,
  notaDe,
  pontosFortes,
  preenchidas,
  prioridades,
  quadrante9Box,
  type Notas,
} from "@/lib/desempenho";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel individual · Desempenho" };

export default async function PainelIndividual({ params, searchParams }: PageProps<"/desempenho/[id]">) {
  const id = Number((await params).id);
  const ciclo = lerCiclo((await searchParams).ciclo);
  await exigirGestao(`/desempenho/${id}?ciclo=${ciclo}`);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [pessoa, membros, historico] = await Promise.all([
    obterPessoa(id),
    listarAvaliados(ciclo),
    historicoAvaliacoes(id),
  ]);
  if (!pessoa) notFound();

  const atual = historico.find((h) => h.ciclo === ciclo) ?? null;
  const notas = (atual?.notas ?? {}) as Notas;
  const analise = analisarEquipe(
    membros.map((m) => ({ id: m.pessoa.id, nome: m.pessoa.nome, nomeGuerra: m.pessoa.nomeGuerra, notas: m.notas })),
  );
  const media = mediaGeral(notas);
  const feitos = preenchidas(notas);
  const pilares = mediasPorPilar(notas);
  const fortes = pontosFortes(notas);
  const focos = prioridades(notas, analise.mediaPorCompetencia);
  const q = quadrante9Box(notas);

  const mediasPessoas = membros
    .map((m) => ({ id: m.pessoa.id, media: mediaGeral(m.notas) }))
    .filter((m): m is { id: number; media: number } => m.media !== null)
    .sort((a, b) => b.media - a.media);
  const posicao = mediasPessoas.findIndex((m) => m.id === id) + 1;
  const difEquipe = media !== null && analise.mediaEquipe !== null ? media - analise.mediaEquipe : null;
  const nomeCurto = pessoa.nomeGuerra ?? pessoa.nome.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        href={`/desempenho?ciclo=${ciclo}`}
        className="sem-impressao inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Equipe Delta
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Avaliação de desempenho {ciclo}
            {atual?.dataAvaliacao ? ` · avaliado em ${dataBR(atual.dataAvaliacao)}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{pessoa.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {[pessoa.nomeGuerra, pessoa.funcao, pessoa.equipe ? `Equipe ${pessoa.equipe}` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="sem-impressao flex flex-wrap gap-2">
          <BotaoLink href={`/desempenho/${id}/avaliar?ciclo=${ciclo}`} size="sm">
            <ClipboardPen data-icon="inline-start" />
            {feitos ? "Editar avaliação" : "Preencher avaliação"}
          </BotaoLink>
          {feitos ? <BotaoImprimir /> : null}
        </div>
      </header>

      {feitos === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ainda sem notas no ciclo {ciclo}. Preencha a avaliação para ver o painel e as sugestões.
        </p>
      ) : (
        <>
          <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador
              rotulo="Média geral"
              valor={formatarNota(media, 2)}
              detalhe={classificarMedia(media)}
              className={corNota(media)}
            />
            <Indicador
              rotulo="Em relação à equipe"
              valor={difEquipe === null ? "—" : `${difEquipe >= 0 ? "+" : "−"}${formatarNota(Math.abs(difEquipe))}`}
              detalhe={posicao ? `${posicao}º de ${mediasPessoas.length} avaliados` : null}
            />
            <Indicador rotulo="Itens avaliados" valor={`${feitos}/${COMPETENCIAS.length}`} />
            <Indicador rotulo="Matriz 9-box" valor={q?.titulo ?? "—"} detalhe={q ? "potencial × desempenho" : "precisa do item 1 e de outras notas"} />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="rounded-xl border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Perfil de competências</h2>
              <Radar
                itens={COMPETENCIAS.map((c) => ({
                  rotulo: c.competencia.length > 18 ? `${c.competencia.slice(0, 17)}…` : c.competencia,
                  titulo: `${c.numero}. ${c.competencia}`,
                  valor: notaDe(notas, c.numero),
                  referencia: analise.mediaPorCompetencia[c.numero],
                }))}
              />
            </section>
            <div className="space-y-6">
              <section className="rounded-xl border p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pilares</h2>
                <div className="mt-3 space-y-3">
                  {PILARES.map((p) => (
                    <BarraNota key={p} rotulo={ROTULO_PILAR[p]} valor={pilares[p]} referencia={analise.mediaPorPilar[p]} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">O traço vertical marca a média da equipe.</p>
              </section>
              {q ? (
                <section className="rounded-xl border p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Matriz 9-box</h2>
                  <div className="mt-3">
                    <NoveBox pessoas={[{ id, rotulo: nomeCurto, potencial: q.potencial, desempenho: q.desempenho }]} destaque={id} />
                  </div>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">{q.titulo}:</span> {q.orientacao}
                  </p>
                </section>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="size-5 text-emerald-500" aria-hidden /> Pontos fortes
              </h2>
              {fortes.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma competência com nota 7 ou mais.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {fortes.map(({ competencia, nota }) => (
                    <li key={competencia.numero} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{competencia.competencia}</span>
                        <SeloNota valor={nota} rotulo={classificar(nota)} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Como aproveitar: {ACOES_COMPETENCIA[competencia.numero]?.troca.replace(/\.$/, "")}; reconhecer em
                        público e usar {nomeCurto} como referência para os colegas.
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border bg-amber-400/5 p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Target className="size-5 text-amber-500" aria-hidden /> Prioridades de desenvolvimento (PDI 70-20-10)
              </h2>
              {focos.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Todas as notas são 9 ou 10. Foco em desafios maiores e em multiplicar o conhecimento.
                </p>
              ) : (
                <ol className="mt-3 space-y-4">
                  {focos.map(({ competencia, nota, mediaEquipe }) => {
                    const acoes = ACOES_COMPETENCIA[competencia.numero];
                    return (
                      <li key={competencia.numero} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{competencia.competencia}</span>
                          <span className="flex items-center gap-1.5">
                            <SeloNota valor={nota} />
                            {mediaEquipe !== null ? (
                              <span className="text-xs text-muted-foreground">equipe {formatarNota(mediaEquipe)}</span>
                            ) : null}
                          </span>
                        </div>
                        {acoes ? (
                          <ul className="mt-1.5 space-y-1 text-xs">
                            <li>
                              <span className="font-semibold">70% prática:</span> {acoes.pratica}
                            </li>
                            <li>
                              <span className="font-semibold">20% troca:</span> {acoes.troca}
                            </li>
                            <li>
                              <span className="font-semibold">10% formação:</span> {acoes.formacao}
                            </li>
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-xl border p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <MessagesSquare className="size-5 text-sky-500" aria-hidden /> Roteiro da conversa de feedback
            </h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
              <li>
                Abra perguntando como {nomeCurto} avalia o próprio ano: o que deu certo e o que foi difícil (autoavaliação
                antes da sua visão).
              </li>
              <li>
                Reconheça com exemplos concretos{fortes[0] ? `, começando por ${fortes[0].competencia.competencia.toLowerCase()}` : ""}.
              </li>
              <li>
                Use o modelo SBI nas prioridades: situação, comportamento observado e impacto na equipe
                {focos[0] ? ` (comece por ${focos[0].competencia.competencia.toLowerCase()})` : ""}.
              </li>
              <li>Pergunte o que precisa de você para evoluir e combine no máximo duas metas, com prazo.</li>
              <li>Registre o PDI combinado e marque um check-in em 30 dias.</li>
            </ol>
            {atual?.planoAcao || atual?.observacoes ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {atual?.observacoes ? (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">Fatos observados</h3>
                    <p className="mt-1 whitespace-pre-line text-sm">{atual.observacoes}</p>
                  </div>
                ) : null}
                {atual?.planoAcao ? (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">PDI combinado</h3>
                    <p className="mt-1 whitespace-pre-line text-sm">{atual.planoAcao}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {historico.length > 1 ? (
            <section className="mt-6 rounded-xl border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Evolução por ciclo</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {historico.map((h) => {
                  const m = mediaGeral(h.notas as Notas);
                  return (
                    <Link
                      key={h.ciclo}
                      href={`/desempenho/${id}?ciclo=${h.ciclo}`}
                      className={`rounded-lg border px-3 py-2 text-center ${h.ciclo === ciclo ? "ring-2 ring-sky-500" : ""}`}
                    >
                      <p className="text-xs text-muted-foreground">{h.ciclo}</p>
                      <p className="text-lg font-semibold tabular-nums">{formatarNota(m)}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="mt-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Lightbulb className="size-4" aria-hidden /> Notas por competência
            </h2>
            <div className="mt-2 overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nº</th>
                    <th className="px-3 py-2 font-medium">Competência</th>
                    <th className="px-3 py-2 font-medium">Nota</th>
                    <th className="px-3 py-2 font-medium">Classificação</th>
                    <th className="px-3 py-2 font-medium">Equipe</th>
                    <th className="px-3 py-2 font-medium">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETENCIAS.map((c) => {
                    const n = notaDe(notas, c.numero);
                    const eq = analise.mediaPorCompetencia[c.numero];
                    const dif = n !== null && eq !== null ? n - eq : null;
                    return (
                      <tr key={c.numero} className="border-t">
                        <td className="px-3 py-1.5 tabular-nums">{c.numero}</td>
                        <td className="px-3 py-1.5">{c.competencia}</td>
                        <td className="px-3 py-1.5">
                          <SeloNota valor={n} />
                        </td>
                        <td className="px-3 py-1.5">{classificar(n) ?? "—"}</td>
                        <td className="px-3 py-1.5 tabular-nums">{formatarNota(eq)}</td>
                        <td
                          className={`px-3 py-1.5 tabular-nums ${
                            dif === null ? "" : dif >= 0.5 ? "text-emerald-600" : dif <= -0.5 ? "text-red-600" : ""
                          }`}
                        >
                          {dif === null ? "—" : `${dif >= 0 ? "+" : "−"}${formatarNota(Math.abs(dif))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
