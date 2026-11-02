import { GestaoEfetivo } from "@/components/gestao/gestao-efetivo";
import { listarEfetivo } from "@/db/gestao";
import { exigirGestao } from "@/lib/acesso-gestao";
import { EQUIPES_EFETIVO } from "@/lib/gestao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Efetivo" };

const ORDEM_SITUACAO = { ATIVO: 0, AFASTADO: 1, DESLIGADO: 2 } as const;

export default async function Efetivo() {
  await exigirGestao();
  const pessoas = (await listarEfetivo()).sort(
    (a, b) =>
      ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao] ||
      (a.equipe ? EQUIPES_EFETIVO.indexOf(a.equipe) : 99) -
        (b.equipe ? EQUIPES_EFETIVO.indexOf(b.equipe) : 99) ||
      a.nome.localeCompare(b.nome),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <p className="text-sm text-muted-foreground">Gestão</p>
        <h1 className="text-2xl font-semibold tracking-tight">Efetivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas as equipes. Desligados ficam fora dos alertas; afastados aparecem, mas não contam.
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
