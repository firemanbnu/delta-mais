import { listarAusencias, listarPessoas } from "@/db/repositorio";
import {
  GestaoAusencias,
  type AusenciaLista,
} from "@/components/ausencias/gestao-ausencias";

export const dynamic = "force-dynamic";

export const metadata = { title: "Férias e atestados" };

export default async function PaginaAusencias() {
  const [ausencias, pessoas] = await Promise.all([listarAusencias(), listarPessoas()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">
          Afastamentos e substituições do plantão noturno
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Férias, atestados e dispensas</h1>
      </header>

      <div className="mt-6">
        <GestaoAusencias
          ausencias={ausencias as AusenciaLista[]}
          pessoas={pessoas.map((p) => ({
            id: p.id,
            nome: p.nome,
            funcao: p.funcao,
            ativo: p.ativo,
          }))}
        />
      </div>
    </div>
  );
}
