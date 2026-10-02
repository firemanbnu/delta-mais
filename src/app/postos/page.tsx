import { CheckCircle2, CircleDot, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { listarPostos, semearPostos } from "@/db/repositorio";
import { ROTULO_GRUPO, ROTULO_UNIDADE, type Unidade } from "@/lib/dominio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vagas do plantão" };

export default async function PaginaPostos() {
  await semearPostos();
  const postos = await listarPostos();

const unidades: Unidade[] = ["F2", "F3", "CRS"];
  const fixos = postos.filter((p) => p.grupo === "FIXO");
  const cicloMc = postos.filter((p) => p.grupo === "MC");
  const cicloBaRe = postos.filter((p) => p.grupo === "BA_RE");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">As 10 vagas do plantão noturno</p>
        <h1 className="text-2xl font-semibold tracking-tight">Vagas</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
O rodízio acontece dentro de dois ciclos independentes: MC circula em três vagas com
          retorno a cada 3 meses, e o grupo BA/RE circula em cinco vagas com retorno a cada 5 meses.
          A composição fica fixa durante o mês e só muda na virada.
        </p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {unidades.map((unidade) => {
          const vagas = postos.filter((p) => p.unidade === unidade);
          return (
            <Card key={unidade}>
              <CardHeader>
                <CardTitle className="text-base">{ROTULO_UNIDADE[unidade]}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {vagas.map((posto) => (
                      <TableRow key={posto.codigo}>
                        <TableCell className="font-mono text-xs">{posto.codigo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {posto.rotulo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {posto.funcoes.join(" / ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDot className="size-4" aria-hidden />
              Ciclo de rodízio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
<li>
                <p className="text-sm font-medium">
                  MC — {cicloMc.length} vagas, retorno a cada {cicloMc.length} meses
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  F2-MC → F3-MC → CRS-MC → F2-MC
                </p>
              </li>
              <li>
                <p className="text-sm font-medium">
                  BA/RE — {cicloBaRe.length} vagas, retorno a cada {cicloBaRe.length} meses
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  F2-BA → F3-BA1 → F3-BA2 → CRS-RE1 → CRS-RE2 → F2-BA
                </p>
              </li>
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              F3-BA2 também passa a atuar na central de comunicações.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-4" aria-hidden />
              Postos fixos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {fixos.map((posto) => (
                <li key={posto.codigo} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                  <span className="font-mono text-xs">{posto.codigo}</span>
                  <span>{posto.funcoes.join(" / ")}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {ROTULO_GRUPO.FIXO}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
