"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { salvarPtrbaAction } from "@/app/acoes/painel-dia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Linha = { ordem: number; assunto: string; instrutor: string };

const ROTULOS = ["Atividade física", "1ª PTR-BA", "2ª PTR-BA", "3ª PTR-BA"];

/** Corrige à mão a programação de uma noite (quando a tabela do mês mudar). */
export function EditarPtrba({
  data,
  linhas,
  nomes,
}: {
  data: string;
  linhas: { ordem: number; assunto: string; instrutor: string | null }[];
  nomes: string[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const inicial = (): Linha[] =>
    [1, 2, 3, 0].map((ordem) => {
      const l = linhas.find((x) => x.ordem === ordem);
      return { ordem, assunto: l?.assunto ?? "", instrutor: l?.instrutor ?? "" };
    });
  const [form, setForm] = useState<Linha[]>(inicial);
  const lista = `instrutores-${data}`;

  if (!aberto) {
    return (
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          setForm(inicial());
          setAberto(true);
        }}
      >
        <Pencil /> Editar
      </Button>
    );
  }

  return (
    <form
      className="mt-2 space-y-2 rounded-md border p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvarPtrbaAction({ data, linhas: form });
          if (r.ok) {
            toast.success(r.mensagem);
            setAberto(false);
            router.refresh();
          } else toast.error(r.erro);
        });
      }}
    >
      <datalist id={lista}>
        {nomes.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {form.map((l, i) => (
        <div key={l.ordem} className="grid gap-1.5 sm:grid-cols-[1fr_9rem]">
          <label className="text-xs text-muted-foreground">
            {ROTULOS[l.ordem]}
            <Input
              value={l.assunto}
              onChange={(e) => setForm((f) => f.map((x, j) => (j === i ? { ...x, assunto: e.target.value } : x)))}
              placeholder={l.ordem === 0 ? "Ex.: corrida ou caminhada" : "Assunto (vazio = sem PTR)"}
            />
          </label>
          {l.ordem === 0 ? null : (
            <label className="text-xs text-muted-foreground">
              Instrutor
              <Input
                list={lista}
                value={l.instrutor}
                onChange={(e) =>
                  setForm((f) => f.map((x, j) => (j === i ? { ...x, instrutor: e.target.value } : x)))
                }
              />
            </label>
          )}
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pendente}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
