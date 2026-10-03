"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import { definirOperadorRadioAction } from "@/app/acoes/radio";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type OperadorEscolhivel = {
  id: string;
  nome: string;
  anel: 1 | 2;
};

export type PropsCelulaRadio = {
  ano: number;
  mes: number;
  data: string;
  slot: string;
  rotuloSlot: string;
  pessoaId: string | null;
  origem: "AUTO" | "MANUAL";
  operadores: OperadorEscolhivel[];
  /** Ids já escalados nas outras faixas da mesma noite. */
  idsOcupados: string[];
  somenteLeitura?: boolean;
};

export function CelulaRadio({
  ano,
  mes,
  data,
  slot,
  rotuloSlot,
  pessoaId,
  origem,
  operadores,
  idsOcupados,
  somenteLeitura = false,
}: PropsCelulaRadio) {
  const [ocupando, iniciarTransicao] = useTransition();
  const [otimista, definirOtimista] = useOptimistic(
    pessoaId,
    (_atual: string | null, novo: string | null) => novo,
  );

  const ocupado = otimista !== null;
  const nome = operadores.find((operador) => operador.id === otimista)?.nome;

  async function escolher(valor: string) {
    iniciarTransicao(async () => {
      definirOtimista(valor === "vazio" ? null : valor);
      const dados = new FormData();
      dados.set("ano", String(ano));
      dados.set("mes", String(mes));
      dados.set("data", data);
      dados.set("slot", slot);
      dados.set("pessoaId", valor);

      const resultado = await definirOperadorRadioAction(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  async function voltarAoAutomatico() {
    iniciarTransicao(async () => {
      const dados = new FormData();
      dados.set("ano", String(ano));
      dados.set("mes", String(mes));
      dados.set("data", data);
      dados.set("slot", slot);
      dados.set("pessoaId", "");

      const resultado = await definirOperadorRadioAction(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  return (
    <div className="flex items-center gap-0.5">
      <select
        value={otimista ?? "vazio"}
        onChange={(evento) => void escolher(evento.target.value)}
        disabled={somenteLeitura || ocupando}
        aria-label={`Operador de ${rotuloSlot} em ${data}`}
        className={`h-8 w-full min-w-0 rounded-md border bg-background px-1.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
          ocupado ? "border-border" : "border-destructive/60 text-destructive"
        }`}
      >
        <option value="vazio">{ocupado ? "Rodízio" : "— sem operador"}</option>
        {operadores.map((operador) => (
          <option key={operador.id} value={operador.id}>
            {operador.nome}
            {idsOcupados.includes(operador.id) ? " (troca de faixa)" : ""}
          </option>
        ))}
      </select>

      {origem === "MANUAL" && !somenteLeitura ? (
        <Tooltip>
          <TooltipTrigger>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => void voltarAoAutomatico()}
              disabled={ocupando}
              aria-label={`Devolver ${rotuloSlot} de ${data} ao rodízio`}
            >
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Alteração manual — devolver ao rodízio</TooltipContent>
        </Tooltip>
      ) : null}

      <span className="sr-only" role="status">
        {nome ? `${rotuloSlot}: ${nome}` : `${rotuloSlot}: faixa vazia`}
      </span>
    </div>
  );
}
