import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { dataBR } from "@/components/gestao/comum";
import { EditorDocumento } from "@/components/gestao/editor-documento";
import { SeloStatus } from "@/components/gestao/selo-status";
import { montarQuadroDocumentos } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";
import {
  GRUPOS_DOCUMENTO,
  ROTULO_EQUIPE,
  ROTULO_GRUPO,
  ROTULO_SITUACAO_DOCUMENTO,
  ROTULO_SITUACAO_EFETIVO,
} from "@/lib/gestao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ficha de documentos" };

export default async function FichaDocumentos({ params }: PageProps<"/gestao/documentos/[id]">) {
  await exigirGestao();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const quadro = await montarQuadroDocumentos({ efetivoId: id });
  const linha = quadro.linhas[0];
  if (!linha) notFound();
  const { pessoa } = linha;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link
        href="/gestao/documentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Documentação
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl font-semibold tracking-tight">{pessoa.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[
            pessoa.nomeGuerra,
            pessoa.funcao,
            pessoa.equipe ? `Equipe ${ROTULO_EQUIPE[pessoa.equipe]}` : null,
            pessoa.matricula,
            ROTULO_SITUACAO_EFETIVO[pessoa.situacao],
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {pessoa.observacoes ? (
          <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            {pessoa.observacoes}
          </p>
        ) : null}
        <p className="mt-2 text-sm">
          {pessoa.situacao !== "ATIVO"
            ? `${ROTULO_SITUACAO_EFETIVO[pessoa.situacao]}: fica fora da grade e da contagem até voltar a ativo (em Efetivo).`
            : linha.pendentes > 0
              ? `${linha.pendentes} documentos pedem atenção.`
              : "Nenhuma pendência."}
        </p>
      </header>

      {GRUPOS_DOCUMENTO.map((grupo) => {
        const celulas = linha.celulas.filter((c) => c.tipo.grupo === grupo);
        if (celulas.length === 0) return null;
        return (
          <section key={grupo} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {ROTULO_GRUPO[grupo]}
            </h2>
            <div className="mt-2 overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Documento</th>
                    <th className="px-3 py-2 font-medium">Situação</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Data</th>
                    <th className="px-3 py-2 font-medium">Vencimento</th>
                    <th className="w-20 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {celulas.map(({ tipo, registro, avaliacao }) => (
                    <tr key={tipo.id} className="border-t align-top">
                      <td className="px-3 py-2">
                        <span className="font-medium">{tipo.nome}</span>
                        {registro?.observacao ? (
                          <span className="block text-xs text-muted-foreground">{registro.observacao}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <SeloStatus status={avaliacao.status} />
                        {registro && registro.situacao !== "ENTREGUE" ? (
                          <span className="block text-xs text-muted-foreground">
                            registrado: {ROTULO_SITUACAO_DOCUMENTO[registro.situacao]}
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums sm:table-cell">
                        {tipo.forma === "ENTREGA" ? "—" : dataBR(registro?.data)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {dataBR(avaliacao.vencimento)}
                        {avaliacao.dias !== null ? (
                          <span className="block text-xs text-muted-foreground">
                            {avaliacao.dias < 0 ? `venceu há ${-avaliacao.dias} dias` : `em ${avaliacao.dias} dias`}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex justify-end gap-1">
                          {registro?.arquivoUrl ? (
                            <a
                              href={registro.arquivoUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Abrir arquivo de ${tipo.nome}`}
                              title="Abrir arquivo"
                              className="inline-flex size-7 items-center justify-center rounded-md hover:bg-secondary"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          ) : null}
                          <EditorDocumento
                            pessoa={pessoa.nome}
                            dados={{
                              efetivoId: pessoa.id,
                              tipoId: tipo.id,
                              tipoNome: tipo.nome,
                              forma: tipo.forma,
                              data: registro?.data ?? null,
                              situacao: registro?.situacao ?? null,
                              arquivoUrl: registro?.arquivoUrl ?? null,
                              observacao: registro?.observacao ?? null,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
