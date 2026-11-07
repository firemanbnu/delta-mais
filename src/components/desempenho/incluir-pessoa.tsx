"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { incluirNaAvaliacaoAction } from "@/app/acoes/desempenho";

/** Inclui na avaliação do ciclo alguém de outra equipe (ferista etc.). */
export function IncluirPessoa({
  ciclo,
  opcoes,
}: {
  ciclo: number;
  opcoes: { id: number; nome: string; detalhe: string }[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  if (opcoes.length === 0) return null;
  return (
    <label className="sem-impressao flex items-center gap-2 text-sm">
      <UserPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">Incluir pessoa de outra equipe</span>
      <select
        defaultValue=""
        disabled={pendente}
        onChange={(e) => {
          const id = Number(e.target.value);
          e.target.value = "";
          if (!id) return;
          iniciar(async () => {
            const r = await incluirNaAvaliacaoAction(id, ciclo);
            if (r.ok) {
              toast.success(r.mensagem);
              router.refresh();
            } else toast.error(r.erro);
          });
        }}
        className="h-8 max-w-72 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
      >
        <option value="">Incluir pessoa de outra equipe…</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome} ({o.detalhe})
          </option>
        ))}
      </select>
    </label>
  );
}
