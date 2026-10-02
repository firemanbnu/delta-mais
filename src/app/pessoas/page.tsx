import { listarPessoas } from "@/db/repositorio";
import { GestaoQuadro } from "@/components/pessoas/gestao-quadro";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quadro de bombeiros" };

export default async function PaginaPessoas() {
  const pessoas = await listarPessoas();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">
          Componentes da equipe do plantão noturno
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Quadro de bombeiros</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
A função de cada bombeiro define em quais vagas o rodízio pode colocá-lo: MC circula por F2, F3 e
          CRS; BA e RE circulam pelas cinco vagas do grupo BA/RE; CE fica sempre no F2 e LR sempre no
          CRS.
        </p>
      </header>

      <div className="mt-6">
        <GestaoQuadro pessoas={pessoas} />
      </div>
    </div>
  );
}
