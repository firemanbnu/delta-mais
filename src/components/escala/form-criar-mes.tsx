"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CalendarPlus, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type AcaoEscala = (
  estado: unknown,
  dados: FormData,
) => Promise<{ ok: true; mensagem: string } | { ok: false; erro: string }>;

export function FormCriarMes({
  ano,
  mes,
  usarRodizio,
  action,
}: {
  ano: number;
  mes: number;
  usarRodizio: boolean;
  action: AcaoEscala;
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(dados) =>
        iniciar(async () => {
          const resultado = await action(null, dados);
          if (resultado.ok) toast.success(resultado.mensagem);
          else toast.error(resultado.erro);
        })
      }
    >
      <input type="hidden" name="ano" value={ano} />
      <input type="hidden" name="mes" value={mes} />
      <Button type="submit" disabled={pendente}>
        {usarRodizio ? (
          <WandSparkles data-icon="inline-start" />
        ) : (
          <CalendarPlus data-icon="inline-start" />
        )}
        {usarRodizio ? "Gerar pelo rodízio" : "Criar mês em branco"}
      </Button>
      <span className="text-sm text-muted-foreground">
        {usarRodizio
          ? "Aplica a rotação sobre o mês anterior."
          : "Depois de preencher este mês, os próximos saem pelo rodízio."}
      </span>
    </form>
  );
}
