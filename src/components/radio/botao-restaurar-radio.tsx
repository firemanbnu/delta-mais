"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";

import { restaurarRadioAction } from "@/app/acoes/radio";
import { Button } from "@/components/ui/button";

/** Refaz o mês inteiro de rádio pelo rodízio, apagando as trocas manuais. */
export function BotaoRestaurarRadio({ ano, mes }: { ano: number; mes: number }) {
  const [pendente, iniciar] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const dados = new FormData();
          dados.set("ano", String(ano));
          dados.set("mes", String(mes));
          const resultado = await restaurarRadioAction(null, dados);
          if (resultado.ok) toast.success(resultado.mensagem);
          else toast.error(resultado.erro);
        })
      }
    >
      <RefreshCcw data-icon="inline-start" />
      Refazer pelo rodízio
    </Button>
  );
}
