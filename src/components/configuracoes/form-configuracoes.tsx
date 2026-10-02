"use client";

import { useActionState } from "react";

import { salvarConfiguracoesAction } from "@/app/acoes/configuracoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Config = {
  turnoInicio: string;
  turnoFim: string;
  dataAncora: string;
  observacoes: string | null;
};

export function FormConfiguracoes({
  config,
  ancoraISO,
}: {
  config: Config;
  ancoraISO: string;
}) {
  const [estado, submeter, pendente] = useActionState(salvarConfiguracoesAction, null);

  return (
    <Card className="impressao">
      <CardHeader>
        <CardTitle className="text-base">Parâmetros do plantão</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submeter} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="turnoInicio">Início do plantão</Label>
            <Input
              id="turnoInicio"
              name="turnoInicio"
              type="time"
              defaultValue={String(config.turnoInicio).slice(0, 5)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="turnoFim">Término do plantão</Label>
            <Input
              id="turnoFim"
              name="turnoFim"
              type="time"
              defaultValue={String(config.turnoFim).slice(0, 5)}
              required
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="dataAncora">Noite de referência do 12x36</Label>
            <Input
              id="dataAncora"
              name="dataAncora"
              type="date"
              defaultValue={ancoraISO}
              required
            />
            <p className="text-xs text-muted-foreground">
              A data em que a equipe entra de plantão. Contando a partir dela, noites alternadas são
              de serviço e as demais de folga. Ao mudar esta data, as marcações do mês mudam.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="observacoes">Observações gerais</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={config.observacoes ?? ""}
            />
          </div>

          {estado && !estado.ok ? (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {estado.erro}
            </p>
          ) : null}
          {estado?.ok ? (
            <p className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm sm:col-span-2">
              {estado.mensagem}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={pendente}>
              Salvar configurações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
