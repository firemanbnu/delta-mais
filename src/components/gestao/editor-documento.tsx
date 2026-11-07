"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FileUser, Pencil } from "lucide-react";

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

export function EditorDocumento({
  dados,
  pessoa,
  celula,
  classeCelula,
  dica,
  linkFicha = false,
}: {
  dados: DadosEditorDocumento;
  pessoa: string;
  /** Quando informado, o próprio conteúdo (célula da grade) abre o editor. */
  celula?: ReactNode;
  classeCelula?: string;
  dica?: string;
  /** Mostra o atalho para a ficha individual dentro do editor. */
  linkFicha?: boolean;
}) {
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
      {celula !== undefined ? (
        <button
          type="button"
          title={dica ? `${dica} · clique para editar` : `Editar ${dados.tipoNome}`}
          aria-label={`Editar ${dados.tipoNome} de ${pessoa}`}
          onClick={() => setAberto(true)}
          className={`block w-full cursor-pointer outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring ${classeCelula ?? ""}`}
        >
          {celula}
        </button>
      ) : (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Editar ${dados.tipoNome}`}
          title={`Editar ${dados.tipoNome}`}
          onClick={() => setAberto(true)}
        >
          <Pencil />
        </Button>
      )}

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

            <div className="flex flex-wrap items-center justify-end gap-2">
              {linkFicha ? (
                <Link
                  href={`/gestao/documentos/${dados.efetivoId}`}
                  className="mr-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  <FileUser className="size-4" aria-hidden />
                  Ficha da pessoa
                </Link>
              ) : null}
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
