"use client";

import { useActionState, useMemo, useState } from "react";

import { salvarConfiguracoesAction } from "@/app/acoes/configuracoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ancoraDoCiclo,
  formatarDataBR,
  paraISO,
  proximaNoiteDeServico,
  somarDias,
} from "@/lib/calendario";
import {
  NOITES_DE_SERVICO,
  ROTULO_NOITE_DE_SERVICO,
  type NoiteDeServico,
} from "@/lib/dominio";

type Config = {
  turnoInicio: string;
  turnoFim: string;
  dataAncora: string;
  noiteDeServico: NoiteDeServico;
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
  const [noiteDeServico, setNoiteDeServico] = useState<NoiteDeServico>(config.noiteDeServico);
  const [dataAncora, setDataAncora] = useState(ancoraISO);

  const referencia = dataAncora || ancoraISO;
  const inicioDoCiclo = useMemo(
    () => ancoraDoCiclo(referencia, noiteDeServico),
    [referencia, noiteDeServico],
  );
  const proximas = useMemo(() => {
    const saida: Date[] = [];
    let cursor = new Date();
    for (let i = 0; i < 4; i++) {
      cursor = proximaNoiteDeServico(cursor, referencia, noiteDeServico);
      saida.push(cursor);
      cursor = somarDias(cursor, 1);
    }
    return saida;
  }, [referencia, noiteDeServico]);
  const cicloDeslocado = paraISO(inicioDoCiclo) !== referencia;

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
            <Label htmlFor="noiteDeServico">Noites de serviço caem nos dias</Label>
            <Select
              name="noiteDeServico"
              value={noiteDeServico}
              onValueChange={(valor) =>
                setNoiteDeServico((valor as NoiteDeServico | null) ?? config.noiteDeServico)
              }
            >
              <SelectTrigger id="noiteDeServico" className="w-full sm:max-w-xs">
                <SelectValue placeholder="Escolha ímpares ou pares" />
              </SelectTrigger>
              <SelectContent>
                {NOITES_DE_SERVICO.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>
                    {ROTULO_NOITE_DE_SERVICO[opcao]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define se a equipe entra de plantão em dias ímpares ou pares do mês. Trocar esta opção
              inverte todas as marcações de serviço.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="dataAncora">Noite de referência do 12x36</Label>
            <Input
              id="dataAncora"
              name="dataAncora"
              type="date"
              value={dataAncora}
              onChange={(evento) => setDataAncora(evento.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Contando a partir dela, noites alternadas são de serviço e as demais de folga. Quando a
              paridade escolhida não bate com a desta data, o ciclo começa um dia depois para as
              noites caírem sempre nos dias pedidos.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
            <p className="text-sm font-medium">Assim ficará o calendário</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {proximas.map((dia) => (
                <li key={paraISO(dia)}>{formatarDataBR(dia)}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {cicloDeslocado
                ? `Com esta configuração o ciclo começa em ${formatarDataBR(inicioDoCiclo)}.`
                : `O ciclo começa em ${formatarDataBR(inicioDoCiclo)}.`}{" "}
              Salve para aplicar na escala.
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
