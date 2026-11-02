"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { salvarDocumentoAction } from "@/app/acoes/gestao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ROTULO_SITUACAO_DOCUMENTO,
  SITUACOES_DOCUMENTO,
  type FormaDocumento,
  type SituacaoDocumento,
} from "@/lib/gestao";
import { CLASSE_SELECT } from "./comum";

export type DadosEditorDocumento = {
  efetivoId: number;
  tipoId: number;
  tipoNome: string;
  forma: FormaDocumento;
  data: string | null;
  situacao: SituacaoDocumento | null;
  arquivoUrl: string | null;
  observacao: string | null;
};

export function EditorDocumento({ dados, pessoa }: { dados: DadosEditorDocumento; pessoa: string }) {
  const [aberto, setAberto] = useState(false);
  const [, enviar, pendente] = useActionState(
    async (anterior: unknown, dados: FormData) => {
      const resultado = await salvarDocumentoAction(anterior, dados);
      if (resultado.ok) {
        toast.success(resultado.mensagem);
        setAberto(false);
      } else {
        toast.error(resultado.erro);
      }
      return resultado;
    },
    null,
  );

  const rotuloData =
    dados.forma === "VENCIMENTO" ? "Data de vencimento" : "Data de realização";

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Editar ${dados.tipoNome}`}
        title={`Editar ${dados.tipoNome}`}
        onClick={() => setAberto(true)}
      >
        <Pencil />
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dados.tipoNome}</DialogTitle>
            <DialogDescription>{pessoa}</DialogDescription>
          </DialogHeader>

          <form action={enviar} className="space-y-4">
            <input type="hidden" name="efetivoId" value={dados.efetivoId} />
            <input type="hidden" name="tipoId" value={dados.tipoId} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="situacao">Situação</Label>
                <select
                  id="situacao"
                  name="situacao"
                  defaultValue={dados.situacao ?? "ENTREGUE"}
                  className={CLASSE_SELECT}
                >
                  {SITUACOES_DOCUMENTO.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_SITUACAO_DOCUMENTO[s]}
                    </option>
                  ))}
                </select>
              </div>

              {dados.forma === "ENTREGA" ? null : (
                <div className="space-y-1.5">
                  <Label htmlFor="data">{rotuloData}</Label>
                  <Input id="data" name="data" type="date" defaultValue={dados.data ?? ""} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="arquivoUrl">Link do arquivo no Drive</Label>
              <Input
                id="arquivoUrl"
                name="arquivoUrl"
                type="url"
                placeholder="https://drive.google.com/…"
                defaultValue={dados.arquivoUrl ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                name="observacao"
                rows={2}
                defaultValue={dados.observacao ?? ""}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
