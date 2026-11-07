type ItemRadar = { rotulo: string; titulo?: string; valor: number | null; referencia?: number | null };

/** Radar 0–10 em SVG puro: pessoa (preenchido) e média da equipe (tracejado). */
export function Radar({ itens, tamanho = 420 }: { itens: ItemRadar[]; tamanho?: number }) {
  const n = itens.length;
  const margem = 78;
  const c = tamanho / 2;
  const r = c - margem;
  const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const ponto = (i: number, v: number) => [c + Math.cos(ang(i)) * r * (v / 10), c + Math.sin(ang(i)) * r * (v / 10)];
  const caminho = (valores: (number | null)[]) =>
    valores.map((v, i) => ponto(i, v ?? 0)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z";
  const temRef = itens.some((i) => i.referencia !== undefined && i.referencia !== null);

  return (
    <figure>
      <svg viewBox={`0 0 ${tamanho} ${tamanho}`} className="mx-auto h-auto w-full max-w-[460px]" role="img" aria-label="Gráfico radar das competências">
        {[2, 4, 6, 8, 10].map((nivel) => (
          <polygon
            key={nivel}
            points={itens.map((_, i) => ponto(i, nivel).join(",")).join(" ")}
            className="fill-none stroke-border"
            strokeWidth={nivel === 10 ? 1.2 : 0.8}
          />
        ))}
        {itens.map((_, i) => {
          const [x, y] = ponto(i, 10);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} className="stroke-border" strokeWidth={0.6} />;
        })}
        {[5, 10].map((nivel) => (
          <text key={nivel} x={c + 3} y={c - (r * nivel) / 10 + 10} className="fill-muted-foreground text-[9px]">
            {nivel}
          </text>
        ))}
        {temRef ? (
          <path
            d={caminho(itens.map((i) => i.referencia ?? null))}
            className="fill-none stroke-muted-foreground"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        ) : null}
        <path d={caminho(itens.map((i) => i.valor))} className="fill-sky-500/25 stroke-sky-500" strokeWidth={2} />
        {itens.map((item, i) =>
          item.valor === null ? null : (
            <circle key={i} cx={ponto(i, item.valor)[0]} cy={ponto(i, item.valor)[1]} r={2.6} className="fill-sky-500" />
          ),
        )}
        {itens.map((item, i) => {
          const [x, y] = ponto(i, 11.3);
          const cos = Math.cos(ang(i));
          const ancora = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
          return (
            <text key={i} x={x} y={y} textAnchor={ancora} dominantBaseline="middle" className="fill-foreground text-[9.5px]">
              <title>{item.titulo ?? item.rotulo}</title>
              {item.rotulo}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-sky-500/40 ring-1 ring-sky-500" /> Avaliado
        </span>
        {temRef ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-muted-foreground" /> Média da equipe
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
