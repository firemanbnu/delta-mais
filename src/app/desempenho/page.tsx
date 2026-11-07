import Link from "next/link";
import { ChevronRight, ClipboardPen, FileSpreadsheet, Lightbulb, Users, UsersRound } from "lucide-react";

import { BarraNota, Indicador, SeletorVisao, SeloNota, corNota } from "@/components/desempenho/comum";
import { IncluirPessoa } from "@/components/desempenho/incluir-pessoa";
import { NoveBox, type PessoaNoveBox } from "@/components/desempenho/nove-box";
import { BotaoImprimir } from "@/components/escala/botao-imprimir";
import { Button } from "@/components/ui/button";
import { ciclosComAvaliacao, cicloAtual, lerCiclo, listarAvaliados } from "@/db/desempenho";
import { listarConvites, respostasColegas } from "@/db/desempenho-pares";
import { listarEfetivo } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";
import {
  ACOES_COMPETENCIA,
  ACOES_PILAR,
  COMPETENCIAS,
  DESCRICAO_VISAO,
  MIN_RESPOSTAS_COLEGAS,
  ROTULO_VISAO,
  VISOES,
  lerVisao,
  notasNaVisao,
  PILARES,
  ROTINAS_GESTAO,
  ROTULO_PILAR,
  analisarEquipe,
  classificarMedia,
  completa,
  formatarNota,
  mediaGeral,
  notaDe,
  preenchidas,
  quadrante9Box,
} from "@/lib/desempenho";
import { BLOCOS_PLANILHA } from "@/lib/planilha-desempenho";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avaliação de desempenho" };

export default async function PainelDesempenho({ searchParams }: PageProps<"/desempenho">) {
  const busca = await searchParams;
  const ciclo = lerCiclo(busca.ciclo);
  const visao = lerVisao(busca.visao);
  await exigirGestao(`/desempenho?ciclo=${ciclo}`);

  const [membrosBase, ciclos, respostas, convites, efetivoTodo] = await Promise.all([
    listarAvaliados(ciclo),
    ciclosComAvaliacao(),
    respostasColegas(ciclo),
    listarConvites(ciclo),
    listarEfetivo(),
  ]);
  const naLista = new Set(membrosBase.map((m) => m.pessoa.id));
  const outros = efetivoTodo
    .filter((p) => p.situacao === "ATIVO" && !naLista.has(p.id))
    .map((p) => ({ id: p.id, nome: p.nome, detalhe: [p.funcao, p.equipe].filter(Boolean).join(" · ") }));
  const membros = membrosBase.map((m) => ({
    ...m,
    notas: notasNaVisao(m.notas, respostas.get(m.pessoa.id) ?? [], visao),
    respostas: respostas.get(m.pessoa.id)?.length ?? 0,
  }));
  const respondidos = convites.filter((c) => c.convite.respondidoEm).length;
  const opcoesCiclo = [...new Set([cicloAtual(), ciclo, ...ciclos])].sort((a, b) => b - a);

  const pessoas = membros.map((m) => ({
    id: m.pessoa.id,
    nome: m.pessoa.nome,
    nomeGuerra: m.pessoa.nomeGuerra,
    notas: m.notas,
  }));
  const analise = analisarEquipe(pessoas);
  const comNotas = membros.filter((m) => preenchidas(m.notas) > 0);
  const completas = membros.filter((m) => completa(m.notas)).length;

  const pilaresOrdenados = PILARES.filter((p) => analise.mediaPorPilar[p] !== null).sort(
    (a, b) => (analise.mediaPorPilar[a] ?? 0) - (analise.mediaPorPilar[b] ?? 0),
  );
  const pilarFraco = pilaresOrdenados[0];
  const pilarForte = pilaresOrdenados[pilaresOrdenados.length - 1];

  const noveBox: PessoaNoveBox[] = membros.flatMap((m) => {
    const q = quadrante9Box(m.notas);
    return q ? [{ id: m.pessoa.id, rotulo: m.pessoa.nomeGuerra ?? m.pessoa.nome.split(" ")[0], ...q }] : [];
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Equipe Delta · ciclo {ciclo}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Avaliação de desempenho</h1>
        </div>
        <div className="sem-impressao flex flex-wrap items-center gap-2">
          <nav aria-label="Ciclo" className="flex gap-1">
            {opcoesCiclo.map((c) => (
              <Link
                key={c}
                href={`/desempenho?ciclo=${c}&visao=${visao}`}
                aria-current={c === ciclo ? "page" : undefined}
                className={`rounded-md px-2.5 py-1 text-sm ${
                  c === ciclo ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                {c}
              </Link>
            ))}
          </nav>
          <Button size="sm" variant="outline" render={<Link href={`/desempenho/colegas?ciclo=${ciclo}`} />}>
            <UsersRound data-icon="inline-start" />
            Avaliação pelos colegas
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<a href={`/desempenho/exportar?ciclo=${ciclo}&visao=${visao}`} download />}
          >
            <FileSpreadsheet data-icon="inline-start" />
            Planilha da empresa (.xlsx)
          </Button>
          <BotaoImprimir />
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SeletorVisao
          base="/desempenho"
          ciclo={ciclo}
          atual={visao}
          opcoes={VISOES.map((v) => ({ valor: v, rotulo: ROTULO_VISAO[v], dica: DESCRICAO_VISAO[v] }))}
        />
        <p className="text-xs text-muted-foreground">
          {DESCRICAO_VISAO[visao]}
          {convites.length > 0 ? ` Colegas: ${respondidos} de ${convites.length} responderam.` : ""}
        </p>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Avaliações"
          valor={`${completas}/${membros.length}`}
          detalhe={
            comNotas.length > completas
              ? `${comNotas.length - completas} em andamento`
              : completas === membros.length && membros.length > 0
                ? "Todas completas"
                : "completas"
          }
        />
        <Indicador
          rotulo="Média da equipe"
          valor={formatarNota(analise.mediaEquipe, 2)}
          detalhe={classificarMedia(analise.mediaEquipe)}
        />
        <Indicador
          rotulo="Pilar mais forte"
          valor={pilarForte ? formatarNota(analise.mediaPorPilar[pilarForte]) : "—"}
          detalhe={pilarForte ? ROTULO_PILAR[pilarForte] : null}
        />
        <Indicador
          rotulo="Pilar a desenvolver"
          valor={pilarFraco ? formatarNota(analise.mediaPorPilar[pilarFraco]) : "—"}
          detalhe={pilarFraco ? ROTULO_PILAR[pilarFraco] : null}
        />
      </section>

      {/* Lista de pessoas */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-4" aria-hidden /> Integrantes
          </h2>
          <IncluirPessoa ciclo={ciclo} opcoes={outros} />
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {membros.map(({ pessoa, notas, respostas: nRespostas }) => {
            const media = mediaGeral(notas);
            const feitos = preenchidas(notas);
            const q = quadrante9Box(notas);
            return (
              <div key={pessoa.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div
                  className={`flex size-12 shrink-0 flex-col items-center justify-center rounded-lg text-sm font-semibold tabular-nums ${corNota(media)}`}
                >
                  {formatarNota(media)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/desempenho/${pessoa.id}?ciclo=${ciclo}&visao=${visao}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {pessoa.nome}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      pessoa.funcao,
                      pessoa.equipe && pessoa.equipe !== "DELTA" ? `Equipe ${pessoa.equipe}` : null,
                      feitos === 0
                        ? visao === "colegas" && nRespostas < MIN_RESPOSTAS_COLEGAS
                          ? `${nRespostas} resposta(s) de colegas`
                          : "não avaliado"
                        : `${feitos}/${COMPETENCIAS.length} itens`,
                      q?.titulo,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-1 h-1 rounded-full bg-muted">
                    <div
                      className="h-1 rounded-full bg-sky-500"
                      style={{ width: `${(feitos / COMPETENCIAS.length) * 100}%` }}
                    />
                  </div>
                </div>
                <Link
                  href={`/desempenho/${pessoa.id}/avaliar?ciclo=${ciclo}`}
                  title={feitos ? "Editar avaliação" : "Avaliar"}
                  aria-label={`${feitos ? "Editar avaliação" : "Avaliar"} de ${pessoa.nome}`}
                  className="sem-impressao inline-flex size-9 items-center justify-center rounded-md hover:bg-secondary"
                >
                  <ClipboardPen className="size-4" />
                </Link>
                <Link
                  href={`/desempenho/${pessoa.id}?ciclo=${ciclo}&visao=${visao}`}
                  aria-label={`Painel de ${pessoa.nome}`}
                  className="sem-impressao inline-flex size-9 items-center justify-center rounded-md hover:bg-secondary"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            );
          })}
        </div>
        {membros.length > BLOCOS_PLANILHA ? (
          <p className="mt-2 text-xs text-amber-600">
            A planilha da empresa tem {BLOCOS_PLANILHA} blocos: só as primeiras {BLOCOS_PLANILHA} pessoas
            avaliadas cabem na exportação.
          </p>
        ) : null}
      </section>

      {comNotas.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {visao === "minha"
            ? `Nenhuma avaliação no ciclo ${ciclo}. Clique no ícone de prancheta ao lado de um nome para preencher o formulário; os painéis e as sugestões aparecem conforme as notas são lançadas.`
            : `Ainda não há notas suficientes nesta visão. A média dos colegas aparece quando cada pessoa tem pelo menos ${MIN_RESPOSTAS_COLEGAS} respostas.`}
        </p>
      ) : (
        <>
          {/* Mapa de calor */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Mapa de competências
            </h2>
            <div className="mt-2 overflow-x-auto rounded-xl border">
              <table className="border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-36 border-b bg-background px-2 py-2 text-left font-medium">
                      Pessoa
                    </th>
                    {COMPETENCIAS.map((c) => (
                      <th
                        key={c.numero}
                        title={`${c.numero}. ${c.competencia}`}
                        className="h-32 w-8 border-b bg-background px-0.5 align-bottom font-medium"
                      >
                        <span className="mx-auto block max-h-28 rotate-180 whitespace-nowrap text-left [writing-mode:vertical-rl]">
                          {c.competencia}
                        </span>
                      </th>
                    ))}
                    <th className="border-b border-l bg-background px-2 align-bottom font-semibold">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {comNotas.map(({ pessoa, notas }) => (
                    <tr key={pessoa.id}>
                      <th className="sticky left-0 z-10 whitespace-nowrap border-b bg-background px-2 py-1 text-left font-normal">
                        <Link href={`/desempenho/${pessoa.id}?ciclo=${ciclo}&visao=${visao}`} className="hover:underline">
                          {pessoa.nomeGuerra ?? pessoa.nome}
                        </Link>
                      </th>
                      {COMPETENCIAS.map((c) => {
                        const n = notaDe(notas, c.numero);
                        return (
                          <td
                            key={c.numero}
                            title={`${pessoa.nomeGuerra ?? pessoa.nome} · ${c.competencia}: ${n === null ? "sem nota" : formatarNota(n)}`}
                            className={`border-b border-l text-center tabular-nums ${corNota(n)}`}
                          >
                            {n === null ? "" : Number.isInteger(n) ? n : formatarNota(n)}
                          </td>
                        );
                      })}
                      <td className={`border-b border-l px-2 text-center font-semibold tabular-nums ${corNota(mediaGeral(notas))}`}>
                        {formatarNota(mediaGeral(notas))}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th className="sticky left-0 z-10 bg-muted px-2 py-1 text-left font-semibold">Equipe</th>
                    {COMPETENCIAS.map((c) => {
                      const m = analise.mediaPorCompetencia[c.numero];
                      return (
                        <td key={c.numero} className={`border-l bg-muted px-0.5 text-center font-semibold tabular-nums ${corNota(m)}`}>
                          {m === null ? "" : formatarNota(m)}
                        </td>
                      );
                    })}
                    <td className="border-l bg-muted px-2 text-center font-semibold tabular-nums">
                      {formatarNota(analise.mediaEquipe)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pilares (valores da empresa)
              </h2>
              <div className="mt-3 space-y-3 rounded-xl border p-4">
                {PILARES.map((p) => (
                  <BarraNota key={p} rotulo={ROTULO_PILAR[p]} valor={analise.mediaPorPilar[p]} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Matriz 9-box
              </h2>
              <div className="mt-3 rounded-xl border p-4">
                <NoveBox pessoas={noveBox} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Potencial = item 1 (Performance). Desempenho = média dos outros 22 itens. Faixas: até 6,4
                  baixo; 6,5 a 8,4 médio; 8,5 ou mais alto.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Onde a equipe é forte
              </h2>
              <ul className="mt-3 space-y-2">
                {analise.fortes.map(({ competencia, media }) => (
                  <li key={competencia.numero} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                    <span>
                      <span className="font-medium">{competencia.competencia}</span>
                      <span className="block text-xs text-muted-foreground">{ROTULO_PILAR[competencia.pilar]}</span>
                    </span>
                    <SeloNota valor={media} />
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Competências a desenvolver
              </h2>
              <ul className="mt-3 space-y-2">
                {analise.criticas.map(({ competencia, media, desvio }) => (
                  <li key={competencia.numero} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{competencia.competencia}</span>
                      <SeloNota valor={media} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {desvio >= 1.5
                        ? `Equipe desigual (desvio ${formatarNota(desvio)}): há quem domine e quem precise de apoio — bom para mentoria entre pares.`
                        : "Nível parecido entre todos: vale uma ação coletiva."}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Sugestões para a equipe */}
          <section className="mt-8 rounded-xl border bg-amber-400/5 p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Lightbulb className="size-5 text-amber-500" aria-hidden />
              Sugestões para a equipe
            </h2>
            <ol className="mt-3 space-y-3 text-sm">
              {pilaresOrdenados.slice(0, 2).map((p) => (
                <li key={p}>
                  <span className="font-semibold">
                    {ROTULO_PILAR[p]} ({formatarNota(analise.mediaPorPilar[p])}):
                  </span>{" "}
                  {ACOES_PILAR[p]}
                </li>
              ))}
              {analise.criticas.slice(0, 2).map(({ competencia }) => (
                <li key={competencia.numero}>
                  <span className="font-semibold">{competencia.competencia}, ação coletiva:</span>{" "}
                  {ACOES_COMPETENCIA[competencia.numero]?.formacao}{" "}
                  {ACOES_COMPETENCIA[competencia.numero]?.troca}
                </li>
              ))}
            </ol>

            {analise.duplas.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm font-semibold">Duplas de mentoria sugeridas</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {analise.duplas.map((d) => (
                    <li key={d.competencia.numero} className="rounded-lg border bg-background p-3 text-sm">
                      <p className="font-medium">{d.competencia.competencia}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mentor: <strong>{d.mentor.nomeGuerra ?? d.mentor.nome}</strong> ({d.mentorNota}) → apoia{" "}
                        {d.aprendizes.map((a) => `${a.pessoa.nomeGuerra ?? a.pessoa.nome} (${a.nota})`).join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <h3 className="mt-5 text-sm font-semibold">Rotinas de gestão recomendadas</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ROTINAS_GESTAO.map((r) => (
                <li key={r.titulo} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-medium">{r.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.texto}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
