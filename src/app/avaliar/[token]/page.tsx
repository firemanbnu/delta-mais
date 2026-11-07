import { cookies } from "next/headers";
import { CircleCheck, Lock, TriangleAlert } from "lucide-react";

import { FormPares } from "@/components/desempenho/form-pares";
import { avaliadosDoConvite, conviteDoToken, hashSegredo } from "@/db/desempenho-pares";
import { TEXTOS_PLANILHA } from "@/lib/desempenho";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Avaliação pelos colegas",
  robots: { index: false, follow: false },
};

function Aviso({ icone: Icone, titulo, texto }: { icone: typeof Lock; titulo: string; texto: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border p-6 text-center">
      <Icone className="mx-auto size-10 text-muted-foreground" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

/** Página pública do link: mostra só o formulário, sem acesso ao resto do sistema. */
export default async function ResponderAvaliacao({ params }: PageProps<"/avaliar/[token]">) {
  const { token } = await params;
  const convite = await conviteDoToken(token);

  if (!convite || convite.revogadoEm) {
    return <Aviso icone={TriangleAlert} titulo="Link inválido" texto="Este link não existe ou foi substituído. Peça um novo link ao chefe de equipe." />;
  }
  if (convite.respondidoEm) {
    return <Aviso icone={CircleCheck} titulo="Formulário já respondido" texto="Suas respostas foram recebidas. Obrigado pela participação!" />;
  }
  if (convite.aparelhoHash) {
    const segredo = (await cookies()).get(`dm_pares_${convite.id}`)?.value;
    if (!segredo || hashSegredo(segredo) !== convite.aparelhoHash) {
      return (
        <Aviso
          icone={Lock}
          titulo="Link já utilizado"
          texto="Este link já foi aberto em outro aparelho ou navegador e só pode ser usado uma vez. Se foi você, peça um novo link ao chefe de equipe."
        />
      );
    }
  }

  const avaliados = await avaliadosDoConvite(convite);
  if (avaliados.length === 0) {
    return <Aviso icone={TriangleAlert} titulo="Formulário indisponível" texto="Não há colegas para avaliar nesta rodada." />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-center text-xl font-bold">{TEXTOS_PLANILHA.titulo}</h1>
      <p className="text-center text-sm text-muted-foreground">Avaliação pelos colegas · Equipe Delta</p>
      <FormPares
        token={token}
        precisaAbrir={!convite.aparelhoHash}
        avaliados={avaliados.map((p) => ({ id: p.id, nome: p.nome, apelido: p.nomeGuerra, funcao: p.funcao }))}
      />
    </div>
  );
}
