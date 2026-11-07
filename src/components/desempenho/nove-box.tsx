import Link from "next/link";

import { QUADRANTES_9BOX, ROTULO_FAIXA, type Faixa } from "@/lib/desempenho";

export type PessoaNoveBox = { id: number; rotulo: string; potencial: Faixa; desempenho: Faixa };

const LINHAS: Faixa[] = ["ALTO", "MEDIO", "BAIXO"];
const COLUNAS: Faixa[] = ["BAIXO", "MEDIO", "ALTO"];

const COR: Record<string, string> = {
  "ALTO-ALTO": "bg-emerald-500/20",
  "ALTO-MEDIO": "bg-emerald-500/10",
  "MEDIO-ALTO": "bg-emerald-500/10",
  "ALTO-BAIXO": "bg-amber-400/15",
  "MEDIO-MEDIO": "bg-sky-500/10",
  "BAIXO-ALTO": "bg-sky-500/10",
  "MEDIO-BAIXO": "bg-orange-500/15",
  "BAIXO-MEDIO": "bg-amber-400/10",
  "BAIXO-BAIXO": "bg-red-500/15",
};

/** Matriz 9-box: potencial (item 1) × desempenho (média dos demais itens). */
export function NoveBox({ pessoas, destaque }: { pessoas: PessoaNoveBox[]; destaque?: number }) {
  return (
    <div className="flex gap-2">
      <div className="flex items-center">
        <span className="-rotate-180 text-xs text-muted-foreground [writing-mode:vertical-rl]">Potencial →</span>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-3 gap-1">
          {LINHAS.map((p) =>
            COLUNAS.map((d) => {
              const chave = `${p}-${d}` as const;
              const aqui = pessoas.filter((x) => x.potencial === p && x.desempenho === d);
              return (
                <div key={chave} className={`min-h-20 rounded-md p-1.5 ${COR[chave]}`}>
                  <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                    {QUADRANTES_9BOX[chave].titulo}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {aqui.map((x) => (
                      <Link
                        key={x.id}
                        href={`/desempenho/${x.id}`}
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          destaque === x.id ? "bg-foreground text-background" : "bg-background/80 hover:bg-background"
                        }`}
                      >
                        {x.rotulo}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }),
          )}
        </div>
        <div className="mt-1 grid grid-cols-3 text-center text-[11px] text-muted-foreground">
          {COLUNAS.map((d) => (
            <span key={d}>{ROTULO_FAIXA[d]}</span>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">Desempenho →</p>
      </div>
    </div>
  );
}
