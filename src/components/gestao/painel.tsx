import Link from "next/link";
import type { ReactNode } from "react";

import { ROTULO_STATUS, type StatusDocumento } from "@/lib/gestao";
import { ORDEM_FAIXAS, totalExigido, type Distribuicao } from "@/lib/gestao-painel";
import { dataBR } from "./comum";

/** Cor sólida de cada situação nas barras (os selos usam versões claras das mesmas cores). */
export const COR_FAIXA: Record<StatusDocumento, string> = {
  EM_DIA: "bg-emerald-500",
  SEM_VALIDADE: "bg-sky-400",
  VENCE_90: "bg-amber-400",
  VENCE_30: "bg-orange-500",
  CONFERIR: "bg-purple-500",
  FALTA: "bg-rose-300 dark:bg-rose-400",
  VENCIDO: "bg-red-600",
  NAO_SE_APLICA: "bg-muted",
};

export function Cartao({
  titulo,
  subtitulo,
  children,
  className = "",
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-4 sm:p-5 ${className}`}>
      <h2 className="font-semibold">{titulo}</h2>
      {subtitulo ? <p className="text-xs text-muted-foreground">{subtitulo}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Barra empilhada: cada faixa com a quantidade e o percentual no balão. */
export function BarraSituacao({ dist, alta = false }: { dist: Distribuicao; alta?: boolean }) {
  const total = totalExigido(dist);
  if (total === 0) return <div className="h-3 rounded-full bg-muted" />;
  return (
    <div
      className={`flex w-full gap-0.5 overflow-hidden rounded-full ${alta ? "h-5" : "h-3"}`}
      role="img"
      aria-label={ORDEM_FAIXAS.filter((s) => dist[s] > 0)
        .map((s) => `${ROTULO_STATUS[s]}: ${dist[s]}`)
        .join(", ")}
    >
      {ORDEM_FAIXAS.filter((s) => dist[s] > 0).map((s) => (
        <div
          key={s}
          className={`${COR_FAIXA[s]} min-w-1 transition-opacity hover:opacity-80`}
          style={{ width: `${(dist[s] / total) * 100}%` }}
          title={`${ROTULO_STATUS[s]}: ${dist[s]} (${Math.round((dist[s] / total) * 100)}%)`}
        />
      ))}
    </div>
  );
}

export function Legenda({ dist }: { dist?: Distribuicao }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {ORDEM_FAIXAS.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-sm ${COR_FAIXA[s]}`} aria-hidden />
          {ROTULO_STATUS[s]}
          {dist ? <span className="font-medium tabular-nums text-foreground">{dist[s]}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
  cor,
  href,
}: {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  cor?: string;
  href?: string;
}) {
  const conteudo = (
    <>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {cor ? <span className={`size-2.5 rounded-sm ${cor}`} aria-hidden /> : null}
        {rotulo}
      </span>
      <span className="mt-1 block text-3xl font-semibold tabular-nums tracking-tight">{valor}</span>
      {detalhe ? <span className="mt-0.5 block text-xs text-muted-foreground">{detalhe}</span> : null}
    </>
  );
  const classe = "rounded-xl border bg-card p-4";
  return href ? (
    <Link href={href} className={`${classe} transition-colors hover:border-foreground/30 hover:bg-secondary/40`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export function LinhaBarra({
  rotulo,
  detalhe,
  href,
  dist,
  percentual,
}: {
  rotulo: string;
  detalhe?: string;
  href?: string;
  dist: Distribuicao;
  percentual: number;
}) {
  const nome = href ? (
    <Link href={href} className="font-medium hover:underline">
      {rotulo}
    </Link>
  ) : (
    <span className="font-medium">{rotulo}</span>
  );
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1">
      <span className="truncate text-sm">
        {nome}
        {detalhe ? <span className="ml-1.5 text-xs text-muted-foreground">{detalhe}</span> : null}
      </span>
      <span className="row-span-2 text-right text-sm font-semibold tabular-nums">{percentual}%</span>
      <BarraSituacao dist={dist} />
    </li>
  );
}

export function TextoDias({ dias, vencimento }: { dias: number; vencimento: string }) {
  return (
    <span className="text-right tabular-nums">
      <span className={`font-medium ${dias <= 30 ? "text-orange-600 dark:text-orange-400" : ""}`}>
        {dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `${dias} dias`}
      </span>
      <span className="block text-xs text-muted-foreground">{dataBR(vencimento)}</span>
    </span>
  );
}
