"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { salvarTipoDocumentoAction } from "@/app/acoes/gestao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FORMAS_DOCUMENTO,
  FUNCOES_EFETIVO,
  ROTULO_FORMA,
  type FormaDocumento,
} from "@/lib/gestao";
import { CLASSE_SELECT } from "./comum";

export type DadosTipo = {
  id: number;
  nome: string;
  forma: FormaDocumento;
  validadeMeses: number | null;
  funcoesObrigatorias: string[];
  ativo: boolean;
};

/**
 * Uma linha do catálogo: nome, como a data é lida, validade em meses e as
 * funções que precisam do documento (nenhuma marcada = todas).
 */
export function LinhaCatalogo({ tipo }: { tipo: DadosTipo }) {
  const [estado, enviar, pendente] = useActionState(salvarTipoDocumentoAction, null);

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) toast.success(estado.mensagem);
    else toast.error(estado.erro);
  }, [estado]);

  return (
    <form
      action={enviar}
      className={`grid gap-3 border-b px-4 py-3 last:border-0 md:grid-cols-[minmax(9rem,1fr)_13rem_7rem_minmax(14rem,1.4fr)_auto] md:items-center ${
        tipo.ativo ? "" : "opacity-60"
      }`}
    >
      <input type="hidden" name="id" value={tipo.id} />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={tipo.ativo}
          aria-label={`${tipo.nome} em uso`}
          title="Em uso (desmarque para tirar das telas)"
          className="size-4 accent-orange-500"
        />
        <Input name="nome" defaultValue={tipo.nome} aria-label="Nome do documento" />
      </div>

      <select
        name="forma"
        defaultValue={tipo.forma}
        aria-label="Como a data é lida"
        className={CLASSE_SELECT}
      >
        {FORMAS_DOCUMENTO.map((forma) => (
          <option key={forma} value={forma}>
            {ROTULO_FORMA[forma]}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <Input
          name="validadeMeses"
          type="number"
          min={1}
          max={240}
          inputMode="numeric"
          defaultValue={tipo.validadeMeses ?? ""}
          placeholder="—"
          aria-label="Validade em meses"
          className={tipo.forma === "REALIZACAO" && !tipo.validadeMeses ? "border-amber-500" : ""}
        />
        <span className="text-xs text-muted-foreground">meses</span>
      </div>

      <fieldset className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <legend className="sr-only">Funções que precisam do documento</legend>
        {FUNCOES_EFETIVO.map((funcao) => (
          <label key={funcao} className="flex items-center gap-1">
            <input
              type="checkbox"
              name="funcoesObrigatorias"
              value={funcao}
              defaultChecked={tipo.funcoesObrigatorias.includes(funcao)}
              className="size-3.5 accent-orange-500"
            />
            {funcao}
          </label>
        ))}
      </fieldset>

      <Button type="submit" size="sm" variant="outline" disabled={pendente}>
        <Save data-icon="inline-start" />
        {pendente ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
