import { formatarNota } from "@/lib/desempenho";

/** Cor de fundo/texto pela nota (1–10), usada no mapa de calor e nos selos. */
export function corNota(valor: number | null): string {
  if (valor === null) return "text-muted-foreground";
  if (valor >= 9) return "bg-emerald-500/25 text-emerald-800 dark:text-emerald-200";
  if (valor >= 8) return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  if (valor >= 7) return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  if (valor >= 6) return "bg-amber-400/20 text-amber-700 dark:text-amber-300";
  if (valor >= 5) return "bg-orange-500/20 text-orange-700 dark:text-orange-300";
  return "bg-red-500/20 text-red-700 dark:text-red-300";
}

/** Cor sólida para barras e pontos. */
export function corBarra(valor: number | null): string {
  if (valor === null) return "bg-muted";
  if (valor >= 8.5) return "bg-emerald-500";
  if (valor >= 7) return "bg-sky-500";
  if (valor >= 6) return "bg-amber-400";
  if (valor >= 5) return "bg-orange-500";
  return "bg-red-500";
}

export function SeloNota({ valor, rotulo }: { valor: number | null; rotulo?: string | null }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${corNota(valor)}`}>
      {formatarNota(valor)}
      {rotulo ? <span className="font-normal">· {rotulo}</span> : null}
    </span>
  );
}

/** Barra horizontal 0–10 com marcador opcional da média da equipe. */
export function BarraNota({
  rotulo,
  valor,
  referencia,
  detalhe,
}: {
  rotulo: string;
  valor: number | null;
  referencia?: number | null;
  detalhe?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate" title={detalhe}>
          {rotulo}
        </span>
        <span className="shrink-0 tabular-nums">
          <span className="font-semibold">{formatarNota(valor)}</span>
          {referencia !== undefined && referencia !== null ? (
            <span className="ml-1 text-xs text-muted-foreground">equipe {formatarNota(referencia)}</span>
          ) : null}
        </span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${corBarra(valor)}`}
          style={{ width: `${((valor ?? 0) / 10) * 100}%` }}
        />
        {referencia !== undefined && referencia !== null ? (
          <div
            className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/70"
            style={{ left: `calc(${(referencia / 10) * 100}% - 1px)` }}
            title={`Média da equipe: ${formatarNota(referencia)}`}
          />
        ) : null}
      </div>
    </div>
  );
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
  className = "",
}: {
  rotulo: string;
  valor: string;
  detalhe?: string | null;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${className}`}>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}
