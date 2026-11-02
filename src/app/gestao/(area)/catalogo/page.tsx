import { LinhaCatalogo } from "@/components/gestao/linha-catalogo";
import { listarTiposDocumento, semearTiposDocumento } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";
import { GRUPOS_DOCUMENTO, ROTULO_GRUPO } from "@/lib/gestao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogo de documentos" };

export default async function Catalogo() {
  await exigirGestao();
  await semearTiposDocumento();
  const tipos = await listarTiposDocumento();
  const semValidade = tipos.filter((t) => t.ativo && t.forma === "REALIZACAO" && !t.validadeMeses);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">Gestão · Documentação</p>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo de documentos</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Para cada documento, diga como a data é lida, por quantos meses ele vale e para quais
          funções é obrigatório. Sem nenhuma função marcada, ele vale para todos. Quem não precisa
          do documento não aparece como pendente.
        </p>
        {semValidade.length > 0 ? (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            {semValidade.length} documentos com data de realização ainda estão sem validade (campos em
            amarelo). Enquanto isso, o sistema mostra a data, mas não sabe quando vencem.
          </p>
        ) : null}
      </header>

      {GRUPOS_DOCUMENTO.map((grupo) => {
        const doGrupo = tipos.filter((t) => t.grupo === grupo);
        if (doGrupo.length === 0) return null;
        return (
          <section key={grupo} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {ROTULO_GRUPO[grupo]}
            </h2>
            <div className="mt-2 rounded-xl border">
              <div className="hidden gap-3 border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground md:grid md:grid-cols-[minmax(9rem,1fr)_13rem_7rem_minmax(14rem,1.4fr)_auto]">
                <span>Documento</span>
                <span>Data</span>
                <span>Validade</span>
                <span>Obrigatório para</span>
                <span className="w-20" />
              </div>
              {doGrupo.map((tipo) => (
                <LinhaCatalogo
                  key={tipo.id}
                  tipo={{
                    id: tipo.id,
                    nome: tipo.nome,
                    forma: tipo.forma,
                    validadeMeses: tipo.validadeMeses,
                    funcoesObrigatorias: [...tipo.funcoesObrigatorias],
                    ativo: tipo.ativo,
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
