import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, FileBarChart } from "lucide-react";

import { BotaoImagemEscala } from "@/components/escala/botao-imagem-escala";
import { BotaoPdfRelatorio } from "@/components/gestao/botao-pdf-relatorio";
import { BotaoImprimir } from "@/components/escala/botao-imprimir";
import { CLASSE_SELECT, dataBR } from "@/components/gestao/comum";
import { BarraSituacao, Legenda } from "@/components/gestao/painel";
import { SeloStatus } from "@/components/gestao/selo-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotaoLink } from "@/components/ui/link-button";
import { hojeISO, montarQuadroDocumentos, type CelulaDocumento, type LinhaDocumentos } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";
import {
  EQUIPES_EFETIVO,
  FUNCOES_EFETIVO,
  GRUPOS_DOCUMENTO,
  ROTULO_EQUIPE,
  ROTULO_GRUPO,
  ROTULO_STATUS,
  STATUS_DOCUMENTO,
  type StatusDocumento,
} from "@/lib/gestao";
import { montarPainel, percentualEmDia, type Distribuicao } from "@/lib/gestao-painel";
import {
  DESCRICAO_MODELO,
  MODELOS_RELATORIO,
  ROTULO_MODELO,
  lerFiltros,
  periodo,
  recortar,
  relatorioPendencias,
  relatorioPorDocumento,
  relatorioSituacao,
  relatorioVencimentos,
  statusPadrao,
  type FiltrosRelatorio,
} from "@/lib/gestao-relatorios";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios" };

type Pessoa = LinhaDocumentos["pessoa"];

export default async function Relatorios({ searchParams }: PageProps<"/gestao/relatorios">) {
  await exigirGestao();
  const filtros = lerFiltros(await searchParams);
  const hoje = hojeISO();
  const quadro = await montarQuadroDocumentos();
  const linhas = recortar(quadro.linhas, filtros);
  const status = filtros.status.length > 0 ? filtros.status : statusPadrao(filtros.modelo);
  const tiposVisiveis = quadro.tipos.filter(
    (t) => (!filtros.grupo || t.grupo === filtros.grupo) && (!filtros.tipoId || t.id === filtros.tipoId),
  );
  const { de, ate } = periodo(filtros, hoje);
  const padrao = statusPadrao(filtros.modelo);
  const mudouSituacoes =
    filtros.status.length > 0 &&
    (filtros.status.length !== padrao.length || filtros.status.some((s) => !padrao.includes(s)));
  const tipoEscolhido = quadro.tipos.find((t) => t.id === filtros.tipoId) ?? null;
  const pessoaEscolhida = quadro.linhas.find((l) => l.pessoa.id === filtros.pessoaId)?.pessoa ?? null;

  const resumoFiltros = [
    filtros.equipe ? `Equipe ${ROTULO_EQUIPE[filtros.equipe]}` : "Todas as equipes",
    filtros.grupo ? ROTULO_GRUPO[filtros.grupo] : null,
    tipoEscolhido ? tipoEscolhido.nome : null,
    filtros.funcao ? `Função ${filtros.funcao}` : null,
    pessoaEscolhida ? pessoaEscolhida.nome : null,
    filtros.modelo === "vencimentos" ? `De ${dataBR(de)} a ${dataBR(ate)}` : null,
    mudouSituacoes ? `Situações: ${status.map((s) => ROTULO_STATUS[s]).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const paisagem = filtros.modelo === "situacao";
  const nomeArquivo = `relatorio-${filtros.modelo}${filtros.equipe ? `-${filtros.equipe.toLowerCase()}` : ""}-${hoje}.png`;

  return (
    <div className={`folha-impressao mx-auto max-w-6xl px-4 py-6 ${paisagem ? "folha-paisagem" : ""}`}>
      <div className="sem-impressao">
        <Link
          href="/gestao"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Gestão
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileBarChart className="size-6 text-sky-500" aria-hidden />
          Relatórios
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o modelo e os filtros, gere o relatório e salve em PDF ou imagem. Contam só pessoas ativas.
        </p>

        <FormFiltros filtros={filtros} status={status} quadro={quadro} de={de} ate={ate} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BotaoImprimir />
          <BotaoPdfRelatorio
            alvoId="relatorio"
            nomeArquivo={nomeArquivo.replace(/\.png$/i, "") + ".pdf"}
            titulo={`Relatório: ${ROTULO_MODELO[filtros.modelo]}`}
            paisagem={paisagem}
          />
          <BotaoImagemEscala
            alvoId="relatorio"
            nomeArquivo={nomeArquivo}
            titulo={`Relatório: ${ROTULO_MODELO[filtros.modelo]}`}
          />
          {paisagem ? (
            <span className="text-xs text-muted-foreground">A grade sai com a folha deitada.</span>
          ) : null}
        </div>
      </div>

      <article id="relatorio" className="impressao mt-4 rounded-xl border bg-white p-6 text-black">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-black/20 pb-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-black/60">SESCINC SBNF · Delta Mais</p>
            <h2 className="text-lg font-semibold">{ROTULO_MODELO[filtros.modelo]}</h2>
            <p className="text-xs text-black/70">{resumoFiltros}</p>
          </div>
          <p className="text-xs text-black/60">Gerado em {dataBR(hoje)}</p>
        </header>

        <div className="mt-3 text-[12px] leading-snug">
          {filtros.modelo === "pendencias" ? <Pendencias linhas={linhas} status={status} /> : null}
          {filtros.modelo === "vencimentos" ? (
            <Vencimentos itens={relatorioVencimentos(linhas, status, de, ate)} />
          ) : null}
          {filtros.modelo === "situacao" ? (
            <Situacao
              linhas={relatorioSituacao(linhas, status, !mudouSituacoes)}
              tipos={tiposVisiveis.map((t) => t.id)}
              status={status}
            />
          ) : null}
          {filtros.modelo === "resumo" ? <Resumo linhas={linhas} /> : null}
          {filtros.modelo === "documento" ? (
            <PorDocumento grupos={relatorioPorDocumento(linhas, tiposVisiveis, status)} />
          ) : null}
          {filtros.modelo === "individual" ? <Fichas linhas={linhas} status={status} /> : null}
        </div>
      </article>
    </div>
  );
}

/* ---------- Filtros ---------- */

function Campo({ rotulo, htmlFor, children }: { rotulo: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs">
        {rotulo}
      </Label>
      {children}
    </div>
  );
}

function FormFiltros({
  filtros,
  status,
  quadro,
  de,
  ate,
}: {
  filtros: FiltrosRelatorio;
  status: readonly StatusDocumento[];
  quadro: Awaited<ReturnType<typeof montarQuadroDocumentos>>;
  de: string;
  ate: string;
}) {
  const pessoas = quadro.linhas
    .map((l) => l.pessoa)
    .filter((p) => !filtros.equipe || p.equipe === filtros.equipe);
  return (
    <form method="get" className="mt-4 rounded-xl border bg-card p-4">
      <fieldset>
        <legend className="text-sm font-medium">Modelo</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MODELOS_RELATORIO.map((m) => (
            <label
              key={m}
              className="flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-sky-500 has-[:checked]:bg-sky-500/10"
            >
              <input
                type="radio"
                name="modelo"
                value={m}
                defaultChecked={filtros.modelo === m}
                className="mt-0.5 accent-sky-500"
              />
              <span>
                <span className="font-medium">{ROTULO_MODELO[m]}</span>
                <span className="block text-xs text-muted-foreground">{DESCRICAO_MODELO[m]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Equipe" htmlFor="f-equipe">
          <select id="f-equipe" name="equipe" defaultValue={filtros.equipe ?? ""} className={CLASSE_SELECT}>
            <option value="">Todas</option>
            {EQUIPES_EFETIVO.map((e) => (
              <option key={e} value={e}>
                {ROTULO_EQUIPE[e]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Categoria de documento" htmlFor="f-grupo">
          <select id="f-grupo" name="grupo" defaultValue={filtros.grupo ?? ""} className={CLASSE_SELECT}>
            <option value="">Todas</option>
            {GRUPOS_DOCUMENTO.map((g) => (
              <option key={g} value={g}>
                {ROTULO_GRUPO[g]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Documento" htmlFor="f-tipo">
          <select id="f-tipo" name="tipo" defaultValue={filtros.tipoId ?? ""} className={CLASSE_SELECT}>
            <option value="">Todos</option>
            {GRUPOS_DOCUMENTO.map((g) => (
              <optgroup key={g} label={ROTULO_GRUPO[g]}>
                {quadro.tipos
                  .filter((t) => t.grupo === g)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Função" htmlFor="f-funcao">
          <select id="f-funcao" name="funcao" defaultValue={filtros.funcao ?? ""} className={CLASSE_SELECT}>
            <option value="">Todas</option>
            {FUNCOES_EFETIVO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Pessoa" htmlFor="f-pessoa">
          <select id="f-pessoa" name="pessoa" defaultValue={filtros.pessoaId ?? ""} className={CLASSE_SELECT}>
            <option value="">Todas</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Vencimento de (período)" htmlFor="f-de">
          <Input id="f-de" type="date" name="de" defaultValue={filtros.de ?? de} />
        </Campo>
        <Campo rotulo="Vencimento até" htmlFor="f-ate">
          <Input id="f-ate" type="date" name="ate" defaultValue={filtros.ate ?? ate} />
        </Campo>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Situações</legend>
        <p className="text-xs text-muted-foreground">
          Sem marcar nenhuma, cada modelo usa o seu padrão (marcadas abaixo).
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {STATUS_DOCUMENTO.map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="status"
                value={s}
                defaultChecked={status.includes(s)}
                className="size-4 accent-sky-500"
              />
              {ROTULO_STATUS[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit">Gerar relatório</Button>
        <BotaoLink href="/gestao/relatorios" variant="ghost">
          Limpar filtros
        </BotaoLink>
      </div>
    </form>
  );
}

/* ---------- Peças comuns do relatório ---------- */

function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-black/60">{children}</p>;
}

function dataOuTraco(c: CelulaDocumento): string {
  return c.avaliacao.vencimento ? dataBR(c.avaliacao.vencimento) : "—";
}

function textoDias(c: CelulaDocumento): string {
  const d = c.avaliacao.dias;
  if (d === null) return "";
  if (d < 0) return `há ${-d} dia${d === -1 ? "" : "s"}`;
  if (d === 0) return "hoje";
  return `em ${d} dia${d === 1 ? "" : "s"}`;
}

const TH = "border-b border-black/30 px-2 py-1 text-left text-[11px] font-semibold";
const TD = "border-b border-black/10 px-2 py-1 align-top";

function rotuloPessoa(p: Pessoa) {
  return (
    <>
      <span className="font-medium">{p.nome}</span>
      <span className="ml-1 text-black/60">
        {[p.funcao, p.equipe ? ROTULO_EQUIPE[p.equipe] : null].filter(Boolean).join(" · ")}
      </span>
    </>
  );
}

function Contadores({ dist }: { dist: Distribuicao }) {
  const itens: StatusDocumento[] = ["VENCIDO", "FALTA", "VENCE_30", "VENCE_90", "CONFERIR"];
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {itens.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <SeloStatus status={s} />
          <span className="font-semibold tabular-nums">{dist[s]}</span>
        </span>
      ))}
    </div>
  );
}

function contar(linhas: readonly LinhaDocumentos[], status: readonly StatusDocumento[]): Distribuicao {
  const d = Object.fromEntries(STATUS_DOCUMENTO.map((s) => [s, 0])) as Distribuicao;
  for (const l of linhas) for (const c of l.celulas) if (status.includes(c.avaliacao.status)) d[c.avaliacao.status] += 1;
  return d;
}

/* ---------- Modelos ---------- */

function Pendencias({ linhas, status }: { linhas: LinhaDocumentos[]; status: readonly StatusDocumento[] }) {
  const pessoas = relatorioPendencias(linhas, status);
  if (pessoas.length === 0) return <Vazio>Nenhuma pendência com esses filtros.</Vazio>;
  return (
    <>
      <Contadores dist={contar(linhas, status)} />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>Pessoa</th>
            <th className={TH}>Documento</th>
            <th className={TH}>Situação</th>
            <th className={TH}>Vencimento</th>
          </tr>
        </thead>
        <tbody>
          {pessoas.map(({ pessoa, itens }) =>
            itens.map((c, i) => (
              <tr key={`${pessoa.id}-${c.tipo.id}`} className="break-inside-avoid">
                {i === 0 ? (
                  <td className={`${TD} w-[38%]`} rowSpan={itens.length}>
                    {rotuloPessoa(pessoa)}
                    <span className="block text-[11px] text-black/60">
                      {itens.length} {itens.length === 1 ? "item" : "itens"}
                    </span>
                  </td>
                ) : null}
                <td className={TD}>{c.tipo.nome}</td>
                <td className={TD}>
                  <SeloStatus status={c.avaliacao.status} />
                </td>
                <td className={`${TD} whitespace-nowrap tabular-nums`}>
                  {dataOuTraco(c)} <span className="text-black/60">{textoDias(c)}</span>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-black/60">{pessoas.length} pessoas com pendência.</p>
    </>
  );
}

function Vencimentos({ itens }: { itens: { pessoa: Pessoa; celula: CelulaDocumento }[] }) {
  if (itens.length === 0) return <Vazio>Nenhum vencimento nesse período.</Vazio>;
  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>Vencimento</th>
            <th className={TH}>Pessoa</th>
            <th className={TH}>Documento</th>
            <th className={TH}>Situação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map(({ pessoa, celula }) => (
            <tr key={`${pessoa.id}-${celula.tipo.id}`} className="break-inside-avoid">
              <td className={`${TD} whitespace-nowrap tabular-nums`}>
                {dataOuTraco(celula)}
                <span className="block text-[11px] text-black/60">{textoDias(celula)}</span>
              </td>
              <td className={TD}>{rotuloPessoa(pessoa)}</td>
              <td className={TD}>{celula.tipo.nome}</td>
              <td className={TD}>
                <SeloStatus status={celula.avaliacao.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-black/60">{itens.length} documentos no período.</p>
    </>
  );
}

const SIGLA: Record<StatusDocumento, string> = {
  VENCIDO: "V",
  FALTA: "F",
  CONFERIR: "?",
  VENCE_30: "30",
  VENCE_90: "90",
  SEM_VALIDADE: "S/V",
  EM_DIA: "OK",
  NAO_SE_APLICA: "NA",
};

function Situacao({
  linhas,
  tipos,
  status,
}: {
  linhas: LinhaDocumentos[];
  tipos: number[];
  status: readonly StatusDocumento[];
}) {
  if (linhas.length === 0) return <Vazio>Ninguém com esses filtros.</Vazio>;
  const cabecalho = linhas[0].celulas.filter((c) => tipos.includes(c.tipo.id)).map((c) => c.tipo);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className={`${TH} sticky left-0 bg-white`}>Pessoa</th>
              {cabecalho.map((t) => (
                <th key={t.id} className="border-b border-black/30 px-0.5 py-1 text-center align-bottom font-semibold">
                  <span className="inline-block max-w-[3.2rem] leading-tight">{t.nome}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.pessoa.id} className="break-inside-avoid">
                <td className="sticky left-0 whitespace-nowrap border-b border-black/10 bg-white px-1.5 py-0.5">
                  {l.pessoa.nome}
                  <span className="ml-1 text-black/50">{l.pessoa.equipe ? ROTULO_EQUIPE[l.pessoa.equipe] : ""}</span>
                </td>
                {l.celulas
                  .filter((c) => tipos.includes(c.tipo.id))
                  .map((c) => {
                    const destaque = status.includes(c.avaliacao.status);
                    return (
                      <td
                        key={c.tipo.id}
                        title={`${c.tipo.nome}: ${ROTULO_STATUS[c.avaliacao.status]}`}
                        className={`border border-black/10 px-0.5 py-0.5 text-center tabular-nums ${
                          destaque ? CELULA[c.avaliacao.status] : "text-black/30"
                        }`}
                      >
                        {SIGLA[c.avaliacao.status]}
                      </td>
                    );
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-black/70">
        {STATUS_DOCUMENTO.map((s) => (
          <span key={s}>
            <span className={`rounded px-1 ${CELULA[s]}`}>{SIGLA[s]}</span> {ROTULO_STATUS[s]}
          </span>
        ))}
      </p>
    </>
  );
}

/** Fundo claro de cada situação na grade impressa. */
const CELULA: Record<StatusDocumento, string> = {
  VENCIDO: "bg-red-200 font-semibold text-red-900",
  FALTA: "bg-rose-100 font-semibold text-rose-900",
  CONFERIR: "bg-purple-100 text-purple-900",
  VENCE_30: "bg-orange-200 text-orange-900",
  VENCE_90: "bg-amber-100 text-amber-900",
  SEM_VALIDADE: "bg-sky-100 text-sky-900",
  EM_DIA: "bg-emerald-100 text-emerald-900",
  NAO_SE_APLICA: "text-black/40",
};

function LinhaTabelaResumo({ rotulo, pessoas, dist }: { rotulo: string; pessoas?: number; dist: Distribuicao }) {
  const exigidos = dist.EM_DIA + dist.SEM_VALIDADE + dist.VENCE_90 + dist.VENCE_30 + dist.CONFERIR + dist.FALTA + dist.VENCIDO;
  return (
    <tr className="break-inside-avoid">
      <td className={`${TD} font-medium`}>
        {rotulo}
        <div className="mt-1 w-full max-w-56">
          <BarraSituacao dist={dist} />
        </div>
      </td>
      {pessoas !== undefined ? <td className={`${TD} text-right tabular-nums`}>{pessoas}</td> : null}
      <td className={`${TD} text-right tabular-nums`}>{exigidos}</td>
      <td className={`${TD} text-right tabular-nums`}>{dist.EM_DIA + dist.SEM_VALIDADE}</td>
      <td className={`${TD} text-right tabular-nums`}>{dist.VENCE_90}</td>
      <td className={`${TD} text-right tabular-nums`}>{dist.VENCE_30}</td>
      <td className={`${TD} text-right tabular-nums`}>{dist.VENCIDO}</td>
      <td className={`${TD} text-right tabular-nums`}>{dist.FALTA}</td>
      <td className={`${TD} text-right tabular-nums`}>{dist.CONFERIR}</td>
      <td className={`${TD} text-right font-semibold tabular-nums`}>{percentualEmDia(dist)}%</td>
    </tr>
  );
}

function CabecalhoResumo({ primeira, comPessoas }: { primeira: string; comPessoas: boolean }) {
  return (
    <thead>
      <tr>
        <th className={TH}>{primeira}</th>
        {comPessoas ? <th className={`${TH} text-right`}>Pessoas</th> : null}
        <th className={`${TH} text-right`}>Exigidos</th>
        <th className={`${TH} text-right`}>Em dia</th>
        <th className={`${TH} text-right`}>Vence 90d</th>
        <th className={`${TH} text-right`}>Vence 30d</th>
        <th className={`${TH} text-right`}>Vencidos</th>
        <th className={`${TH} text-right`}>Faltando</th>
        <th className={`${TH} text-right`}>Conferir</th>
        <th className={`${TH} text-right`}>Válidos</th>
      </tr>
    </thead>
  );
}

function Resumo({ linhas }: { linhas: LinhaDocumentos[] }) {
  if (linhas.length === 0) return <Vazio>Ninguém com esses filtros.</Vazio>;
  const painel = montarPainel(linhas);
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          ["Pessoas", painel.pessoas],
          ["Válidos", `${painel.conformidade}%`],
          ["Vencidos", painel.geral.VENCIDO],
          ["Faltando", painel.geral.FALTA],
          ["Vence 30d", painel.geral.VENCE_30],
          ["Vence 90d", painel.geral.VENCE_90],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-md border border-black/20 p-2">
            <p className="text-[10px] text-black/60">{rotulo}</p>
            <p className="text-lg font-semibold tabular-nums">{valor}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <BarraSituacao dist={painel.geral} alta />
        <div className="mt-2 text-black">
          <Legenda dist={painel.geral} />
        </div>
      </div>

      <h3 className="mt-5 font-semibold">Por equipe</h3>
      <table className="mt-1 w-full border-collapse">
        <CabecalhoResumo primeira="Equipe" comPessoas />
        <tbody>
          {painel.porEquipe.map((e) => (
            <LinhaTabelaResumo key={e.equipe} rotulo={ROTULO_EQUIPE[e.equipe]} pessoas={e.pessoas} dist={e.dist} />
          ))}
          <LinhaTabelaResumo rotulo="Total" pessoas={painel.pessoas} dist={painel.geral} />
        </tbody>
      </table>

      <h3 className="mt-5 font-semibold">Por categoria de documento</h3>
      <table className="mt-1 w-full border-collapse">
        <CabecalhoResumo primeira="Categoria" comPessoas={false} />
        <tbody>
          {painel.porGrupo.map((g) => (
            <LinhaTabelaResumo key={g.grupo} rotulo={ROTULO_GRUPO[g.grupo]} dist={g.dist} />
          ))}
        </tbody>
      </table>

      {painel.documentosCriticos.length > 0 ? (
        <>
          <h3 className="mt-5 font-semibold">Documentos com mais pendências</h3>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Documento</th>
                <th className={`${TH} text-right`}>Vencidos</th>
                <th className={`${TH} text-right`}>Faltando</th>
              </tr>
            </thead>
            <tbody>
              {painel.documentosCriticos.map((d) => (
                <tr key={d.nome}>
                  <td className={TD}>{d.nome}</td>
                  <td className={`${TD} text-right tabular-nums`}>{d.vencidos}</td>
                  <td className={`${TD} text-right tabular-nums`}>{d.faltas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </>
  );
}

function PorDocumento({
  grupos,
}: {
  grupos: ReturnType<typeof relatorioPorDocumento<Pessoa, CelulaDocumento>>;
}) {
  if (grupos.length === 0) return <Vazio>Nada com esses filtros.</Vazio>;
  return (
    <div className="space-y-4">
      {grupos.map(({ tipo, grupos: porStatus }) => (
        <section key={tipo.id} className="break-inside-avoid">
          <h3 className="border-b border-black/30 pb-0.5 font-semibold">
            {tipo.nome} <span className="font-normal text-black/60">· {ROTULO_GRUPO[tipo.grupo]}</span>
          </h3>
          <div className="mt-1 space-y-1.5">
            {porStatus.map(({ status, itens }) => (
              <div key={status} className="flex gap-2">
                <div className="w-40 shrink-0">
                  <SeloStatus status={status} /> <span className="font-semibold tabular-nums">{itens.length}</span>
                </div>
                <p className="text-black/80">
                  {itens
                    .map(({ pessoa, celula }) =>
                      celula.avaliacao.vencimento ? `${pessoa.nome} (${dataBR(celula.avaliacao.vencimento)})` : pessoa.nome,
                    )
                    .join("; ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Fichas({ linhas, status }: { linhas: LinhaDocumentos[]; status: readonly StatusDocumento[] }) {
  if (linhas.length === 0) return <Vazio>Ninguém com esses filtros.</Vazio>;
  return (
    <div>
      {linhas.map((l, i) => {
        const celulas = l.celulas.filter((c) => status.includes(c.avaliacao.status));
        return (
          <section key={l.pessoa.id} className={i > 0 ? "mt-6 break-before-page" : ""}>
            <h3 className="text-base font-semibold">{l.pessoa.nome}</h3>
            <p className="text-[11px] text-black/60">
              {[
                l.pessoa.nomeGuerra,
                l.pessoa.funcao,
                l.pessoa.equipe ? `Equipe ${ROTULO_EQUIPE[l.pessoa.equipe]}` : null,
                l.pessoa.matricula,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-2">
              <Contadores dist={contar([l], status)} />
            </div>
            {GRUPOS_DOCUMENTO.map((g) => {
              const doGrupo = celulas.filter((c) => c.tipo.grupo === g);
              if (doGrupo.length === 0) return null;
              return (
                <div key={g} className="mt-2 break-inside-avoid">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-black/60">{ROTULO_GRUPO[g]}</p>
                  <table className="w-full border-collapse">
                    <tbody>
                      {doGrupo.map((c) => (
                        <tr key={c.tipo.id}>
                          <td className={`${TD} w-[40%]`}>{c.tipo.nome}</td>
                          <td className={TD}>
                            <SeloStatus status={c.avaliacao.status} />
                          </td>
                          <td className={`${TD} whitespace-nowrap tabular-nums`}>
                            {c.registro?.data && c.tipo.forma !== "ENTREGA" ? `Data: ${dataBR(c.registro.data)}` : ""}
                          </td>
                          <td className={`${TD} whitespace-nowrap tabular-nums`}>
                            {c.avaliacao.vencimento ? `Vence: ${dataBR(c.avaliacao.vencimento)}` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
