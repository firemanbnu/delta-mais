import Link from "next/link";
import type { ReactNode } from "react";

import { SeloStatus } from "@/components/gestao/selo-status";
import { dataBR } from "@/components/gestao/comum";
import { montarQuadroDocumentos, type CelulaDocumento } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";
import {
  COR_STATUS,
  EQUIPES_EFETIVO,
  GRUPOS_DOCUMENTO,
  ROTULO_EQUIPE,
  ROTULO_GRUPO,
  ROTULO_STATUS,
  STATUS_PENDENTES,
  type EquipeEfetivo,
  type GrupoDocumento,
  type StatusDocumento,
} from "@/lib/gestao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentação" };

type Busca = { equipe?: string; grupo?: string; visao?: string };

function montarLink(atual: Busca, muda: Busca): string {
  const params = new URLSearchParams();
  const final = { ...atual, ...muda };
  for (const [chave, valor] of Object.entries(final)) {
    if (valor) params.set(chave, valor);
  }
  const texto = params.toString();
  return `/gestao/documentos${texto ? `?${texto}` : ""}`;
}

function Filtro({ ativo, href, children }: { ativo: boolean; href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className={`shrink-0 rounded-md border px-2.5 py-1 text-xs transition-colors ${
        ativo ? "border-foreground/40 bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60"
      }`}
    >
      {children}
    </Link>
  );
}

/** Texto curto da célula: vencimento quando dá para calcular, senão a data informada. */
function textoCelula(celula: CelulaDocumento): string {
  const { avaliacao, registro, tipo } = celula;
  if (avaliacao.status === "NAO_SE_APLICA") return "NA";
  if (avaliacao.status === "FALTA") return "F";
  if (avaliacao.status === "CONFERIR") return "?";
  if (tipo.forma === "ENTREGA") return avaliacao.status === "EM_DIA" ? "C" : "D";
  const data = avaliacao.vencimento ?? registro?.data ?? null;
  return data ? dataBR(data).replace(/\/(\d{2})(\d{2})$/, "/$2") : "—";
}

const ORDEM_GRAVIDADE: readonly StatusDocumento[] = [
  "VENCIDO",
  "FALTA",
  "VENCE_30",
  "CONFERIR",
  "VENCE_90",
];

export default async function Documentos({ searchParams }: PageProps<"/gestao/documentos">) {
  await exigirGestao();
  const busca = (await searchParams) as Busca;
  const equipe = EQUIPES_EFETIVO.includes(busca.equipe as EquipeEfetivo)
    ? (busca.equipe as EquipeEfetivo)
    : null;
  const grupo = GRUPOS_DOCUMENTO.includes(busca.grupo as GrupoDocumento)
    ? (busca.grupo as GrupoDocumento)
    : null;
  const visao = busca.visao === "pendencias" ? "pendencias" : "grade";

  const quadro = await montarQuadroDocumentos({ equipe });
  const tipos = quadro.tipos.filter((t) => !grupo || t.grupo === grupo);
  const atual: Busca = { equipe: equipe ?? undefined, grupo: grupo ?? undefined, visao };

  const pendencias = quadro.linhas
    .filter((l) => l.pessoa.situacao === "ATIVO")
    .flatMap((linha) =>
      linha.celulas
        .filter((c) => !grupo || c.tipo.grupo === grupo)
        .filter((c) => STATUS_PENDENTES.includes(c.avaliacao.status))
        .map((celula) => ({ pessoa: linha.pessoa, celula })),
    )
    .sort(
      (a, b) =>
        ORDEM_GRAVIDADE.indexOf(a.celula.avaliacao.status) -
          ORDEM_GRAVIDADE.indexOf(b.celula.avaliacao.status) ||
        (a.celula.avaliacao.dias ?? 0) - (b.celula.avaliacao.dias ?? 0) ||
        a.pessoa.nome.localeCompare(b.pessoa.nome),
    );

  const resumo: StatusDocumento[] = ["VENCIDO", "FALTA", "VENCE_30", "VENCE_90", "CONFERIR", "SEM_VALIDADE"];

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">
          Gestão · {equipe ? `Equipe ${ROTULO_EQUIPE[equipe]}` : "todas as equipes"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Documentação</h1>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {resumo.map((status) => (
          <div key={status} className={`rounded-lg border p-3 ${COR_STATUS[status]}`}>
            <p className="text-2xl font-semibold tabular-nums">{quadro.contagem[status]}</p>
            <p className="text-xs">{ROTULO_STATUS[status]}</p>
          </div>
        ))}
      </section>
      <p className="mt-2 text-xs text-muted-foreground">
        Contam só pessoas ativas. &quot;Validade não definida&quot;: o documento tem data, mas o
        catálogo ainda não diz por quanto tempo ele vale.{" "}
        <Link href="/gestao/catalogo" className="underline">
          Definir validades
        </Link>
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          <Filtro ativo={visao === "grade"} href={montarLink(atual, { visao: "grade" })}>
            Grade
          </Filtro>
          <Filtro ativo={visao === "pendencias"} href={montarLink(atual, { visao: "pendencias" })}>
            Pendências ({pendencias.length})
          </Filtro>
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          <Filtro ativo={!equipe} href={montarLink(atual, { equipe: undefined })}>
            Todas as equipes
          </Filtro>
          {EQUIPES_EFETIVO.map((e) => (
            <Filtro key={e} ativo={equipe === e} href={montarLink(atual, { equipe: e })}>
              {ROTULO_EQUIPE[e]}
            </Filtro>
          ))}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          <Filtro ativo={!grupo} href={montarLink(atual, { grupo: undefined })}>
            Todos os documentos
          </Filtro>
          {GRUPOS_DOCUMENTO.map((g) => (
            <Filtro key={g} ativo={grupo === g} href={montarLink(atual, { grupo: g })}>
              {ROTULO_GRUPO[g]}
            </Filtro>
          ))}
        </div>
      </div>

      {visao === "pendencias" ? (
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Pessoa</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Equipe</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 font-medium">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {pendencias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhuma pendência com estes filtros.
                  </td>
                </tr>
              ) : (
                pendencias.map(({ pessoa, celula }) => (
                  <tr key={`${pessoa.id}-${celula.tipo.id}`} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/gestao/documentos/${pessoa.id}`} className="font-medium hover:underline">
                        {pessoa.nomeGuerra ?? pessoa.nome}
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      {pessoa.equipe ? ROTULO_EQUIPE[pessoa.equipe] : "—"}
                    </td>
                    <td className="px-3 py-2">{celula.tipo.nome}</td>
                    <td className="px-3 py-2">
                      <SeloStatus status={celula.avaliacao.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {dataBR(celula.avaliacao.vencimento)}
                      {celula.avaliacao.dias !== null ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({celula.avaliacao.dias < 0
                            ? `há ${-celula.avaliacao.dias} dias`
                            : `em ${celula.avaliacao.dias} dias`})
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 max-h-[75vh] overflow-auto rounded-xl border">
          <table className="border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 min-w-44 border-b bg-background px-3 py-2 text-left font-medium">
                  Pessoa
                </th>
                {tipos.map((tipo) => (
                  <th
                    key={tipo.id}
                    title={`${tipo.nome} · ${ROTULO_GRUPO[tipo.grupo]}`}
                    className="whitespace-nowrap border-b bg-background px-2 py-2 text-center font-medium"
                  >
                    {tipo.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quadro.linhas.map((linha) => (
                <tr key={linha.pessoa.id} className={linha.pessoa.situacao === "ATIVO" ? "" : "opacity-50"}>
                  <th className="sticky left-0 z-10 border-b bg-background px-3 py-1.5 text-left font-normal">
                    <Link href={`/gestao/documentos/${linha.pessoa.id}`} className="font-medium hover:underline">
                      {linha.pessoa.nomeGuerra ?? linha.pessoa.nome}
                    </Link>
                    <span className="ml-1.5 text-muted-foreground">
                      {linha.pessoa.equipe ? ROTULO_EQUIPE[linha.pessoa.equipe] : ""}
                      {linha.pessoa.situacao === "AFASTADO" ? " · afastado" : ""}
                    </span>
                  </th>
                  {linha.celulas
                    .filter((c) => !grupo || c.tipo.grupo === grupo)
                    .map((celula) => (
                      <td
                        key={celula.tipo.id}
                        title={`${celula.tipo.nome}: ${ROTULO_STATUS[celula.avaliacao.status]}${
                          celula.avaliacao.vencimento ? ` · vence ${dataBR(celula.avaliacao.vencimento)}` : ""
                        }${celula.registro?.observacao ? ` · ${celula.registro.observacao}` : ""}`}
                        className={`whitespace-nowrap border-b border-l px-2 py-1.5 text-center tabular-nums ${COR_STATUS[celula.avaliacao.status]}`}
                      >
                        {textoCelula(celula)}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Na grade, as datas mostram o vencimento quando a validade está definida; senão, a data
        registrada. C = entregue, D = desatualizado, F = falta, NA = não se aplica, ? = conferir.
        Clique no nome para ver e editar os documentos da pessoa.
      </p>
    </div>
  );
}
