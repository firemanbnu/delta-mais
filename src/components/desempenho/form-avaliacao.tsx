"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { salvarAvaliacaoAction } from "@/app/acoes/desempenho";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPETENCIAS,
  ESCALA_NOTAS,
  TEXTOS_PLANILHA,
  classificar,
  classificarMedia,
  formatarNota,
  mediaGeral,
  type Notas,
} from "@/lib/desempenho";
import { corNota } from "./comum";

const CLASSE_SELECT =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm tabular-nums shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function FormAvaliacao({
  efetivoId,
  nome,
  ciclo,
  notasIniciais,
  dataAvaliacao,
  observacoes,
  planoAcao,
}: {
  efetivoId: number;
  nome: string;
  ciclo: number;
  notasIniciais: Notas;
  dataAvaliacao: string | null;
  observacoes: string | null;
  planoAcao: string | null;
}) {
  const router = useRouter();
  const [notas, setNotas] = useState<Notas>(notasIniciais);
  const media = useMemo(() => mediaGeral(notas), [notas]);
  const feitos = COMPETENCIAS.filter((c) => notas[String(c.numero)]).length;

  const [, enviar, pendente] = useActionState(async (anterior: unknown, dados: FormData) => {
    const r = await salvarAvaliacaoAction(anterior, dados);
    if (r.ok) {
      toast.success(r.mensagem);
      router.push(`/desempenho/${efetivoId}?ciclo=${ciclo}`);
    } else {
      toast.error(r.erro);
    }
    return r;
  }, null);

  return (
    <form action={enviar} className="space-y-6">
      <input type="hidden" name="efetivoId" value={efetivoId} />
      <input type="hidden" name="ciclo" value={ciclo} />

      {/* Mesmo cabeçalho e escala da planilha da empresa. */}
      <section className="overflow-hidden rounded-xl border">
        <h2 className="bg-[#1f3864] px-4 py-3 text-center text-base font-bold text-white">{TEXTOS_PLANILHA.titulo}</h2>
        <p className="border-b bg-muted/40 px-4 py-2 text-center text-xs italic text-muted-foreground">
          {TEXTOS_PLANILHA.instrucao}
        </p>
        <div className="px-4 py-3">
          <p className="text-center text-xs font-semibold">{TEXTOS_PLANILHA.escalaTitulo}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-5">
            {ESCALA_NOTAS.map((e) => (
              <span key={e.nota} className="flex gap-1.5">
                <span className="w-5 text-right font-semibold tabular-nums">{e.nota}</span>
                {e.rotulo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border">
        <div className="grid gap-1 border-b bg-[#1f3864] px-4 py-2 text-sm font-semibold text-white sm:grid-cols-[auto_1fr] sm:gap-3">
          <span>{TEXTOS_PLANILHA.nomeRotulo}</span>
          <span className="rounded bg-[#fff2cc] px-2 text-[#1f3864]">{nome}</span>
        </div>

        <div className="hidden bg-muted/60 px-3 py-2 text-xs font-semibold md:grid md:grid-cols-[2.5rem_9rem_1fr_1fr_8.5rem_9rem] md:gap-3">
          {TEXTOS_PLANILHA.cabecalho.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <ol>
          {COMPETENCIAS.map((c) => {
            const nota = notas[String(c.numero)] ?? null;
            return (
              <li
                key={c.numero}
                className="grid grid-cols-[2.5rem_1fr] gap-x-3 gap-y-1 border-t px-3 py-3 text-sm md:grid-cols-[2.5rem_9rem_1fr_1fr_8.5rem_9rem] md:items-center"
              >
                <span className="font-semibold tabular-nums md:text-center">{c.numero}</span>
                <span className="font-semibold">{c.competencia}</span>
                <span className="col-start-2 text-muted-foreground md:col-start-auto md:text-foreground">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground md:hidden">
                    {TEXTOS_PLANILHA.cabecalho[2]}:{" "}
                  </span>
                  {c.pergunta}
                </span>
                <span className="col-start-2 text-xs text-sky-700 md:col-start-auto dark:text-sky-300">
                  <span className="font-semibold uppercase text-muted-foreground md:hidden">
                    {TEXTOS_PLANILHA.cabecalho[3]}:{" "}
                  </span>
                  {c.comportamento}
                </span>
                <span className="col-start-2 flex items-center gap-2 md:col-start-auto">
                  <label htmlFor={`nota_${c.numero}`} className="text-xs text-muted-foreground md:sr-only">
                    {TEXTOS_PLANILHA.cabecalho[4]}
                  </label>
                  <select
                    id={`nota_${c.numero}`}
                    name={`nota_${c.numero}`}
                    value={nota ?? ""}
                    onChange={(e) =>
                      setNotas((atual) => {
                        const novo = { ...atual };
                        if (e.target.value === "") delete novo[String(c.numero)];
                        else novo[String(c.numero)] = Number(e.target.value);
                        return novo;
                      })
                    }
                    className={`${CLASSE_SELECT} max-w-28 bg-[#fff2cc]/40`}
                  >
                    <option value="">—</option>
                    {ESCALA_NOTAS.map((e) => (
                      <option key={e.nota} value={e.nota}>
                        {e.nota}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="col-start-2 md:col-start-auto">
                  {nota ? (
                    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${corNota(nota)}`}>
                      {classificar(nota)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {feitos} de {COMPETENCIAS.length} itens
          </span>
          <span className="font-semibold">Média: {formatarNota(media, 2)}</span>
          {media !== null ? (
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${corNota(media)}`}>
              {classificarMedia(media)}
            </span>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="text-sm font-semibold">Anotações do avaliador</h2>
          <p className="text-xs text-muted-foreground">
            Uso interno: não vão para a planilha da empresa. Registre fatos observados no ciclo e o que
            foi combinado na conversa de feedback.
          </p>
        </div>
        <div className="max-w-48 space-y-1.5">
          <Label htmlFor="dataAvaliacao">Data da avaliação</Label>
          <Input id="dataAvaliacao" name="dataAvaliacao" type="date" defaultValue={dataAvaliacao ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="observacoes">Fatos e exemplos observados</Label>
          <Textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            defaultValue={observacoes ?? ""}
            placeholder="Ex.: 12/09 – conduziu bem o PTR-BA; 03/10 – atrasou o checklist do CCI 333…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="planoAcao">Plano de desenvolvimento combinado (PDI)</Label>
          <Textarea
            id="planoAcao"
            name="planoAcao"
            rows={4}
            defaultValue={planoAcao ?? ""}
            placeholder="Ex.: até dez/26 – treinar EPR semanalmente com o Vanzella; revisar no check-in de janeiro."
          />
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          <Save data-icon="inline-start" />
          {pendente ? "Salvando…" : "Salvar avaliação"}
        </Button>
      </div>
    </form>
  );
}
