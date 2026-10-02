"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import { definirOcupanteAction, restaurarAutomaticoAction } from "@/app/acoes/escala";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PessoaResumo, Posto } from "@/lib/rotacao";

export type PropsCelula = {
  ano: number;
  mes: number;
  posto: Posto;
  pessoaId: string | null;
  origem: "AUTO" | "MANUAL";
  pessoas: PessoaResumo[];
  ausentes: string[];
  nomesOcupados: string[];
  somenteLeitura?: boolean;
};

export function CelulaVaga({
  ano,
  mes,
  posto,
  pessoaId,
  origem,
  pessoas,
  ausentes,
  nomesOcupados,
  somenteLeitura = false,
}: PropsCelula) {
  const [ocupando, iniciarTransicao] = useTransition();
  const [otimista, definirOtimista] = useOptimistic(
    pessoaId,
    (_atual: string | null, novo: string | null) => novo,
  );

  const opcoes = pessoas.filter(
    (p) => posto.funcoes.includes(p.funcao) && !nomesOcupados.includes(p.id),
  );

  const ocupado = otimista !== null;
  const ausente = ocupado && ausentes.includes(otimista);
  const nome = pessoas.find((p) => p.id === otimista)?.nome;

  async function escolher(valor: string) {
    iniciarTransicao(async () => {
      definirOtimista(valor === "vazio" ? null : valor);
      const dados = new FormData();
      dados.set("ano", String(ano));
      dados.set("mes", String(mes));
      dados.set("codigoPosto", posto.codigo);
      dados.set("pessoaId", valor);

      const resultado = await definirOcupanteAction(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  async function voltarAoAutomatico() {
    iniciarTransicao(async () => {
      const dados = new FormData();
      dados.set("ano", String(ano));
      dados.set("mes", String(mes));
      dados.set("codigoPosto", posto.codigo);

      const resultado = await restaurarAutomaticoAction(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={otimista ?? "vazio"}
        onChange={(evento) => void escolher(evento.target.value)}
        disabled={somenteLeitura || ocupando}
        aria-label={`Ocupante da vaga ${posto.codigo} (${posto.rotulo})`}
        className={`h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
          ausente
            ? "border-amber-500/70 bg-amber-500/10"
            : ocupado
              ? "border-border"
              : "border-destructive/60 text-destructive"
        }`}
      >
        <option value="vazio">— vaga vazia —</option>
        {opcoes.map((pessoa) => (
          <option key={pessoa.id} value={pessoa.id}>
            {pessoa.nome} ({pessoa.funcao})
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
              onClick={() => void voltarAoAutomatico()}
              disabled={ocupando}
              aria-label={`Devolver ${posto.codigo} ao rodízio automático`}
            >
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Alteração manual — devolver ao rodízio</TooltipContent>
        </Tooltip>
      ) : null}

      <span className="sr-only" role="status">
        {nome ? `${posto.codigo}: ${nome}` : `${posto.codigo}: vaga vazia`}
      </span>
    </div>
  );
}
