import { GestaoEfetivo } from "@/components/gestao/gestao-efetivo";
import { listarEfetivo } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Efetivo" };

export default async function Efetivo() {
  await exigirGestao();
  // Ordem alfabética pelo nome (listarEfetivo já devolve assim).
  const pessoas = await listarEfetivo();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <p className="text-sm text-muted-foreground">Gestão</p>
        <h1 className="text-2xl font-semibold tracking-tight">Efetivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas as equipes, em ordem alfabética. Afastados e desligados ficam fora da documentação até voltarem a ativo.
        </p>
      </header>
      <GestaoEfetivo
        pessoas={pessoas.map((p) => ({
          id: p.id,
          nome: p.nome,
          nomeGuerra: p.nomeGuerra,
          matricula: p.matricula,
          funcao: p.funcao,
          equipe: p.equipe,
          situacao: p.situacao,
          pastaDrive: p.pastaDrive,
          observacoes: p.observacoes,
        }))}
      />
    </div>
  );
}
