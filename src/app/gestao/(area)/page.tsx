import Link from "next/link";
import { BookCheck, ChevronRight, FileCheck2, LogOut, UsersRound } from "lucide-react";

import { sairGestaoAction } from "@/app/acoes/gestao";
import {
  BarraSituacao,
  Cartao,
  COR_FAIXA,
  Indicador,
  Legenda,
  LinhaBarra,
  TextoDias,
} from "@/components/gestao/painel";
import { Button } from "@/components/ui/button";
import { hojeISO, listarTiposDocumento, montarQuadroDocumentos } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";
import { ROTULO_EQUIPE, ROTULO_GRUPO } from "@/lib/gestao";
import { montarPainel } from "@/lib/gestao-painel";
import { dataBR } from "@/components/gestao/comum";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestão" };

const PENDENCIAS = "/gestao/documentos?visao=pendencias";

export default async function Gestao() {
  await exigirGestao();
  const [quadro, tipos] = await Promise.all([montarQuadroDocumentos(), listarTiposDocumento()]);
  const painel = montarPainel(quadro.linhas);
  const { geral } = painel;
  const semValidade = tipos.filter((t) => t.ativo && t.forma === "REALIZACAO" && !t.validadeMeses).length;
  const maiorCritico = Math.max(1, ...painel.documentosCriticos.map((d) => d.vencidos + d.faltas));

  const modulos = [
    {
      href: "/gestao/documentos",
      titulo: "Documentação",
      descricao: "Grade de cada pessoa e lista de pendências.",
      icone: FileCheck2,
    },
    {
      href: "/gestao/catalogo",
      titulo: "Catálogo de documentos",
      descricao:
        semValidade > 0
          ? `${semValidade} documentos ainda sem validade definida.`
          : "Validade e funções de cada documento.",
      icone: BookCheck,
    },
    {
      href: "/gestao/efetivo",
      titulo: "Efetivo",
      descricao: "Pessoas, equipes, funções e situação.",
      icone: UsersRound,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Efetivo ativo de todas as equipes · {dataBR(hojeISO())}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão</h1>
        </div>
        <form action={sairGestaoAction}>
          <Button type="submit" size="sm" variant="ghost">
            <LogOut data-icon="inline-start" />
            Sair da Gestão
          </Button>
        </form>
      </header>

      {/* Indicadores */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Indicador rotulo="Pessoas ativas" valor={painel.pessoas} href="/gestao/efetivo" />
        <Indicador
          rotulo="Documentos válidos"
          valor={`${painel.conformidade}%`}
          detalhe={`${painel.exigidos - geral.VENCIDO - geral.FALTA - geral.CONFERIR} de ${painel.exigidos}`}
          cor={COR_FAIXA.EM_DIA}
        />
        <Indicador rotulo="Vencidos" valor={geral.VENCIDO} cor={COR_FAIXA.VENCIDO} href={PENDENCIAS} />
        <Indicador rotulo="Faltando" valor={geral.FALTA} cor={COR_FAIXA.FALTA} href={PENDENCIAS} />
        <Indicador
          rotulo="Vencem em 30 dias"
          valor={geral.VENCE_30}
          cor={COR_FAIXA.VENCE_30}
          href={PENDENCIAS}
        />
        <Indicador
          rotulo="Vencem em 90 dias"
          valor={geral.VENCE_90}
          cor={COR_FAIXA.VENCE_90}
          href={PENDENCIAS}
        />
      </div>

      {semValidade > 0 ? (
        <p className="mt-3 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm">
          {semValidade} documentos do catálogo ainda estão sem validade, então não dá para saber se
          venceram.{" "}
          <Link href="/gestao/catalogo" className="font-medium underline">
            Preencher no Catálogo
          </Link>
        </p>
      ) : null}

      {/* Situação geral */}
      <Cartao
        className="mt-4"
        titulo="Situação geral dos documentos"
        subtitulo={`${painel.exigidos} documentos exigidos do efetivo ativo. Passe o mouse nas faixas para ver os números.`}
      >
        <BarraSituacao dist={geral} alta />
        <div className="mt-3">
          <Legenda dist={geral} />
        </div>
      </Cartao>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Por equipe" subtitulo="% de documentos válidos de cada equipe">
          <ul className="space-y-3">
            {painel.porEquipe.map((e) => (
              <LinhaBarra
                key={e.equipe}
                rotulo={ROTULO_EQUIPE[e.equipe]}
                detalhe={`${e.pessoas} ${e.pessoas === 1 ? "pessoa" : "pessoas"}`}
                href={`/gestao/documentos?equipe=${e.equipe}`}
                dist={e.dist}
                percentual={e.conformidade}
              />
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="Por grupo de documento" subtitulo="% de documentos válidos em cada grupo">
          <ul className="space-y-3">
            {painel.porGrupo.map((g) => (
              <LinhaBarra
                key={g.grupo}
                rotulo={ROTULO_GRUPO[g.grupo]}
                href={`/gestao/documentos?grupo=${g.grupo}`}
                dist={g.dist}
                percentual={g.conformidade}
              />
            ))}
          </ul>
        </Cartao>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Quem precisa de atenção" subtitulo="Mais vencidos, faltando ou vencendo em 30 dias">
          {painel.atencao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém com pendência urgente.</p>
          ) : (
            <ol className="divide-y">
              {painel.atencao.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <Link href={`/gestao/documentos/${p.id}`} className="font-medium hover:underline">
                      {p.nome}
                    </Link>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {p.equipe ? ROTULO_EQUIPE[p.equipe] : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1.5 text-xs tabular-nums">
                    {p.vencidos > 0 ? (
                      <Contagem cor={COR_FAIXA.VENCIDO} texto={`${p.vencidos} vencido${p.vencidos > 1 ? "s" : ""}`} />
                    ) : null}
                    {p.faltas > 0 ? (
                      <Contagem cor={COR_FAIXA.FALTA} texto={`${p.faltas} faltando`} />
                    ) : null}
                    {p.vencendo > 0 ? (
                      <Contagem cor={COR_FAIXA.VENCE_30} texto={`${p.vencendo} vencendo`} />
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Cartao>

        <Cartao titulo="Próximos vencimentos" subtitulo="Nos próximos 90 dias">
          {painel.proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nada vencendo nos próximos 90 dias
              {semValidade > 0 ? " (com as validades que já estão no catálogo)" : ""}.
            </p>
          ) : (
            <ol className="divide-y">
              {painel.proximos.map((v) => (
                <li key={`${v.id}-${v.documento}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <Link href={`/gestao/documentos/${v.id}`} className="font-medium hover:underline">
                      {v.nome}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">{v.documento}</span>
                  </span>
                  <TextoDias dias={v.dias} vencimento={v.vencimento} />
                </li>
              ))}
            </ol>
          )}
        </Cartao>
      </div>

      {painel.documentosCriticos.length > 0 ? (
        <Cartao className="mt-4" titulo="Documentos com mais pendências" subtitulo="Vencidos e faltando, somando todo o efetivo ativo">
          <ul className="space-y-2.5">
            {painel.documentosCriticos.map((d) => (
              <li key={d.nome} className="grid grid-cols-[minmax(7rem,14rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                <span className="truncate">{d.nome}</span>
                <span className="flex h-3 gap-0.5">
                  {d.vencidos > 0 ? (
                    <span
                      className={`rounded-l-full ${d.faltas === 0 ? "rounded-r-full" : ""} ${COR_FAIXA.VENCIDO}`}
                      style={{ width: `${(d.vencidos / maiorCritico) * 100}%` }}
                      title={`Vencidos: ${d.vencidos}`}
                    />
                  ) : null}
                  {d.faltas > 0 ? (
                    <span
                      className={`rounded-r-full ${d.vencidos === 0 ? "rounded-l-full" : ""} ${COR_FAIXA.FALTA}`}
                      style={{ width: `${(d.faltas / maiorCritico) * 100}%` }}
                      title={`Faltando: ${d.faltas}`}
                    />
                  ) : null}
                </span>
                <span className="text-right font-medium tabular-nums">{d.vencidos + d.faltas}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${COR_FAIXA.VENCIDO}`} aria-hidden /> Vencido
            </li>
            <li className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${COR_FAIXA.FALTA}`} aria-hidden /> Falta
            </li>
          </ul>
        </Cartao>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {modulos.map(({ href, titulo, descricao, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30 hover:bg-secondary/40"
          >
            <Icone className="mt-0.5 size-5 shrink-0 text-sky-500" aria-hidden />
            <span>
              <span className="flex items-center gap-1 font-semibold">
                {titulo}
                <ChevronRight className="size-4" aria-hidden />
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{descricao}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Contagem({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1 rounded-md border px-1.5 py-0.5">
      <span className={`size-2 rounded-full ${cor}`} aria-hidden />
      {texto}
    </span>
  );
}
