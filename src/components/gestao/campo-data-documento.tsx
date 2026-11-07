"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

import { salvarDataDocumentoAction } from "@/app/acoes/gestao";

/**
 * Data editável direto na ficha da pessoa: salva ao sair do campo (ou Enter)
 * quando o valor mudou.
 */
export function CampoDataDocumento({
  efetivoId,
  tipoId,
  tipoNome,
  data,
}: {
  efetivoId: number;
  tipoId: number;
  tipoNome: string;
  data: string | null;
}) {
  const [valor, setValor] = useState(data ?? "");
  const [salvo, setSalvo] = useState(data ?? "");
  const [ok, setOk] = useState(false);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    if (valor === salvo) return;
    if (valor && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return;
    iniciar(async () => {
      const r = await salvarDataDocumentoAction({ efetivoId, tipoId, data: valor || null });
      if (r.ok) {
        setSalvo(valor);
        setOk(true);
        setTimeout(() => setOk(false), 1800);
      } else {
        toast.error(r.erro);
        setValor(salvo);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="date"
        value={valor}
        aria-label={`Data de ${tipoNome}`}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            salvar();
          }
          if (e.key === "Escape") setValor(salvo);
        }}
        disabled={pendente}
        className="h-8 w-[8.75rem] rounded-md border border-input bg-transparent px-2 text-sm tabular-nums shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30"
      />
      <span className="inline-flex size-4 items-center justify-center" aria-live="polite">
        {pendente ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Salvando" />
        ) : ok ? (
          <Check className="size-3.5 text-emerald-600" aria-label="Salvo" />
        ) : null}
      </span>
    </span>
  );
}
