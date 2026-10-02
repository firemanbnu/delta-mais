"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  CheckCheck,
  RefreshCcw,
  Trash2,
  Undo2,
  WandSparkles,
} from "lucide-react";

import {
  excluirMesAction,
  gerarMesAction,
  publicarAction,
  regerarAction,
  voltarRascunhoAction,
} from "@/app/acoes/escala";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Resultado } from "@/app/acoes/escala";
import { rotuloMesCurto } from "@/lib/calendario";

export type PropsBarraAcoes = {
  ano: number;
  mes: number;
  status: "RASCUNHO" | "PUBLICADO";
  existeMesAnterior: boolean;
  rotuloMesAnterior: string;
  bloqueadoPorErros: boolean;
};

export function BarraAcoes({
  ano,
  mes,
  status,
  existeMesAnterior,
  rotuloMesAnterior,
  bloqueadoPorErros,
}: PropsBarraAcoes) {
  const [pendente, iniciar] = useTransition();
  const [dialogo, setDialogo] = useState<"criar" | "excluir" | null>(null);
  const [mesEscolhido, setMesEscolhido] = useState(String(mes));

  function executar(
    acao: (estado: unknown, dados: FormData) => Promise<Resultado>,
    contexto: string,
  ) {
    iniciar(async () => {
      const dados = new FormData();
      dados.set("ano", String(ano));
      dados.set("mes", String(mes));
      const resultado = await acao(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro, { description: contexto });
      setDialogo(null);
    });
  }

  function criarMesAlvo() {
    iniciar(async () => {
      const dados = new FormData();
      dados.set("ano", String(ano));
      dados.set("mes", mesEscolhido);
      const resultado = await gerarMesAction(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
      setDialogo(null);
    });
  }

  const desabilitado = pendente;

  return (
    <div className="sem-impressao flex flex-wrap items-center gap-2">
      {status === "PUBLICADO" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => executar(voltarRascunhoAction, "Não foi possível reabrir o mês.")}
          disabled={desabilitado}
        >
          <Undo2 data-icon="inline-start" />
          Voltar para rascunho
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => executar(publicarAction, "Resolva os erros antes de publicar.")}
          disabled={desabilitado || bloqueadoPorErros}
          title={
            bloqueadoPorErros
              ? "Corrija os erros apontados na escala antes de publicar."
              : undefined
          }
        >
          <CheckCheck data-icon="inline-start" />
          Publicar escala
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => executar(regerarAction, "Não foi possível regenerar.")}
        disabled={desabilitado || !existeMesAnterior}
        title={
          existeMesAnterior
            ? "Refaz apenas as vagas que você não alterou à mão."
            : "Só é possível a partir do segundo mês."
        }
      >
        <RefreshCcw data-icon="inline-start" />
        Regerar automáticas
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setDialogo("criar")}
        disabled={desabilitado || !existeMesAnterior}
        title={
          existeMesAnterior
            ? "Aplica o rodízio sobre o mês anterior."
            : "Só é possível a partir do segundo mês."
        }
      >
        <WandSparkles data-icon="inline-start" />
        Gerar mês pelo rodízio
      </Button>

      <Button variant="ghost" size="sm" onClick={() => setDialogo("excluir")} disabled={desabilitado}>
        <Trash2 data-icon="inline-start" />
        Excluir mês
      </Button>

      <Dialog open={dialogo === "criar"} onOpenChange={(aberto) => setDialogo(aberto ? "criar" : null)}>
        <DialogContent>
          <form
            action={criarMesAlvo}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Gerar escala pelo rodízio</DialogTitle>
              <DialogDescription>
                O mês será preenchido aplicando a rotação sobre a escala de{" "}
                <strong>{rotuloMesAnterior}</strong>. Vagas que você já alterou à mão neste mês
                são preservadas.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mes-alvo">Mês de destino</Label>
              <Select value={mesEscolhido} onValueChange={(v) => setMesEscolhido(v ?? String(mes))}>
                <SelectTrigger id="mes-alvo" className="w-full">
                  <SelectValue placeholder="Escolha o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((rotulo, indice) => {
                    const valor = indice + 1;
                    return (
                      <SelectItem key={valor} value={String(valor)}>
                        {rotulo}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
              <Button type="submit" disabled={desabilitado}>
                <CalendarPlus data-icon="inline-start" />
                Gerar escala
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogo === "excluir"}
        onOpenChange={(aberto) => setDialogo(aberto ? "excluir" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir a escala deste mês?</DialogTitle>
            <DialogDescription>
              Todas as vagas de {rotuloMesCurto(ano, mes)} serão apagadas. Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
            <Button
              variant="destructive"
              disabled={desabilitado}
              onClick={() => executar(excluirMesAction, "Não foi possível excluir.")}
            >
              <Trash2 data-icon="inline-start" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
