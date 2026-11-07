"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CircleCheck, Lock, Send, ShieldCheck } from "lucide-react";

import { abrirConviteAction, enviarRespostasParesAction } from "@/app/acoes/desempenho-pares";
import { Button } from "@/components/ui/button";
import {
  COMPETENCIAS,
  ESCALA_NOTAS,
  MIN_RESPOSTAS_COLEGAS,
  TEXTOS_PLANILHA,
  classificar,
  type Notas,
} from "@/lib/desempenho";
import { corNota } from "./comum";

type Avaliado = { id: number; nome: string; apelido: string | null; funcao: string | null };
type Respostas = Record<string, Notas>;

const CLASSE_SELECT =
  "h-10 w-20 shrink-0 rounded-md border border-input bg-transparent px-2 text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function lerRascunho(chave: string): Respostas {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Respostas) : {};
  } catch {
    return {};
  }
}

export function FormPares({
  token,
  precisaAbrir,
  avaliados,
}: {
  token: string;
  precisaAbrir: boolean;
  avaliados: Avaliado[];
}) {
  const chave = `dm-pares-${token.slice(0, 12)}`;
  const [estado, setEstado] = useState<"abrindo" | "pronto" | "bloqueado" | "enviado">("abrindo");
  const [motivo, setMotivo] = useState("");
  const [respostas, setRespostas] = useState<Respostas>({});
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState("");
  const [enviando, iniciar] = useTransition();

  useEffect(() => {
    let vivo = true;
    const abrir: Promise<{ ok: true } | { ok: false; motivo: string }> = precisaAbrir
      ? abrirConviteAction(token)
      : Promise.resolve({ ok: true });
    abrir.then((r) => {
      if (!vivo) return;
      if (r.ok) {
        setRespostas(lerRascunho(chave));
        setEstado("pronto");
      } else {
        setMotivo(r.motivo);
        setEstado("bloqueado");
      }
    });
    return () => {
      vivo = false;
    };
  }, [chave, precisaAbrir, token]);

  useEffect(() => {
    if (estado !== "pronto") return;
    try {
      localStorage.setItem(chave, JSON.stringify(respostas));
    } catch {
      /* rascunho é só conveniência */
    }
  }, [chave, estado, respostas]);

  const total = COMPETENCIAS.length * avaliados.length;
  const dadas = useMemo(
    () => Object.values(respostas).reduce((a, n) => a + Object.keys(n).length, 0),
    [respostas],
  );

  function definir(avaliadoId: number, item: number, valor: string) {
    setRespostas((atual) => {
      const pessoa = { ...(atual[avaliadoId] ?? {}) };
      if (valor === "") delete pessoa[String(item)];
      else pessoa[String(item)] = Number(valor);
      return { ...atual, [avaliadoId]: pessoa };
    });
  }

  function enviar() {
    setErro("");
    if (dadas < total && !window.confirm(`Faltam ${total - dadas} notas (ficarão como "não sei avaliar"). Enviar assim mesmo?`)) {
      return;
    }
    iniciar(async () => {
      const r = await enviarRespostasParesAction(token, respostas);
      if (r.ok) {
        try {
          localStorage.removeItem(chave);
        } catch {
          /* ignorar */
        }
        setEstado("enviado");
      } else {
        setErro(r.erro);
      }
    });
  }

  if (estado === "abrindo") {
    return <p className="mt-10 text-center text-sm text-muted-foreground">Abrindo o formulário…</p>;
  }
  if (estado === "bloqueado") {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border p-6 text-center">
        <Lock className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 font-semibold">Não foi possível abrir</p>
        <p className="mt-1 text-sm text-muted-foreground">{motivo} Peça um novo link ao chefe de equipe.</p>
      </div>
    );
  }
  if (estado === "enviado") {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border p-6 text-center">
        <CircleCheck className="mx-auto size-10 text-emerald-500" aria-hidden />
        <p className="mt-3 font-semibold">Respostas enviadas. Obrigado!</p>
        <p className="mt-1 text-sm text-muted-foreground">Este link foi encerrado. Você já pode fechar esta página.</p>
      </div>
    );
  }

  const c = COMPETENCIAS[passo];
  const ultimo = passo === COMPETENCIAS.length - 1;

  return (
    <div className="mt-4 space-y-4 pb-24">
      {passo === 0 ? (
        <section className="space-y-3 rounded-xl border p-4 text-sm">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
            <span>
              <strong>Suas respostas são anônimas.</strong> As notas são guardadas separadas por colega, sem seu nome e sem
              horário; o chefe de equipe vê apenas médias de pelo menos {MIN_RESPOSTAS_COLEGAS} respostas.
            </span>
          </p>
          <p>
            Dê uma nota de 1 a 10 para cada colega em cada item. Se não tiver como avaliar alguém num item, deixe em
            branco. O link funciona só neste aparelho e uma única vez: o que você preencher fica salvo aqui até enviar.
          </p>
          <div>
            <p className="font-semibold">{TEXTOS_PLANILHA.escalaTitulo}</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
              {ESCALA_NOTAS.map((e) => (
                <span key={e.nota}>
                  <strong className="tabular-nums">{e.nota}</strong> {e.rotulo}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Item {passo + 1} de {COMPETENCIAS.length}
          </span>
          <span>
            {dadas}/{total} notas
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${((passo + 1) / COMPETENCIAS.length) * 100}%` }} />
        </div>
      </div>

      <section className="rounded-xl border">
        <header className="space-y-1 border-b bg-muted/40 p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            {TEXTOS_PLANILHA.cabecalho[0]} {c.numero} · {TEXTOS_PLANILHA.cabecalho[1]}
          </p>
          <h2 className="text-lg font-semibold">{c.competencia}</h2>
          <p className="text-sm">{c.pergunta}</p>
          <p className="text-xs text-sky-700 dark:text-sky-300">
            <span className="font-semibold">{TEXTOS_PLANILHA.cabecalho[3]}:</span> {c.comportamento}
          </p>
        </header>
        <ul>
          {avaliados.map((p) => {
            const nota = respostas[p.id]?.[String(c.numero)] ?? null;
            return (
              <li key={p.id} className="flex items-center gap-3 border-t px-4 py-2.5 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.apelido ?? p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.apelido ? p.nome : null}
                    {nota ? (
                      <span className={`ml-1 rounded px-1 ${corNota(nota)}`}>{classificar(nota)}</span>
                    ) : null}
                  </p>
                </div>
                <select
                  aria-label={`Nota de ${p.apelido ?? p.nome} em ${c.competencia}`}
                  value={nota ?? ""}
                  onChange={(e) => definir(p.id, c.numero, e.target.value)}
                  className={CLASSE_SELECT}
                >
                  <option value="">—</option>
                  {ESCALA_NOTAS.map((e) => (
                    <option key={e.nota} value={e.nota}>
                      {e.nota}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </section>

      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Button variant="outline" disabled={passo === 0} onClick={() => setPasso((p) => Math.max(0, p - 1))}>
            <ChevronLeft data-icon="inline-start" />
            Anterior
          </Button>
          {ultimo ? (
            <Button onClick={enviar} disabled={enviando || dadas === 0}>
              <Send data-icon="inline-start" />
              {enviando ? "Enviando…" : "Enviar respostas"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                setPasso((p) => p + 1);
                window.scrollTo({ top: 0 });
              }}
            >
              Próximo
              <ChevronRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
