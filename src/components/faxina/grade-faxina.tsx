import type { CelulaFaxina } from "@/lib/faxina";

/** Borda de destaque dos locais que já tinham cor própria na escala em papel. */
const DESTAQUE: Record<string, string> = {
  lideranca: "border-amber-500/70",
  lixo: "border-red-500/70",
};

export function GradeFaxina({ celulas }: { celulas: CelulaFaxina[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {celulas.map((celula) => (
        <li
          key={celula.local.id}
          className={`rounded-md border bg-card px-3 py-2 ${
            celula.cobertura ? "bg-sky-500/10" : ""
          } ${DESTAQUE[celula.local.id] ?? ""}`}
          title={celula.cobertura?.descricao}
        >
          <p className="text-[11px] uppercase leading-tight text-muted-foreground">
            {celula.local.rotulo}
          </p>
          <p className="mt-0.5 text-sm font-semibold uppercase">
            {celula.cobertura?.nome ?? celula.nome}
          </p>
          {celula.cobertura ? (
            <p className="text-[11px] text-sky-700 dark:text-sky-300">
              ferista · férias de {celula.nome}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
