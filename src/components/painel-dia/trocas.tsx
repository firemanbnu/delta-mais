"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Plus, X } from "lucide-react";

import { adicionarTrocaAction, removerTrocaAction } from "@/app/acoes/painel-dia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type Troca = { id: number; sai: string; entra: string; observacao: string | null };

/** Lista de trocas de uma noite, com remover e um formulário curto para incluir. */
export function TrocasDaNoite({
  data,
  trocas,
  nomes,
}: {
  data: string;
  trocas: Troca[];
  nomes: string[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [sai, setSai] = useState("");
  const [entra, setEntra] = useState("");
  const [obs, setObs] = useState("");
  const lista = `nomes-${data}`;

  function salvar() {
    iniciar(async () => {
      const r = await adicionarTrocaAction({ data, sai, entra, observacao: obs });
      if (r.ok) {
        toast.success(r.mensagem);
        setSai("");
        setEntra("");
        setObs("");
        setAberto(false);
        router.refresh();
      } else toast.error(r.erro);
    });
  }

  function remover(id: number) {
    iniciar(async () => {
      const r = await removerTrocaAction(id);
      if (r.ok) {
        toast.success(r.mensagem);
        router.refresh();
      } else toast.error(r.erro);
    });
  }

  return (
    <div className="space-y-2">
      {trocas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma troca registrada.</p>
      ) : (
        <ul className="space-y-1.5">
          {trocas.map((t) => (
            <li key={t.id} className="flex items-start gap-2 rounded-md bg-secondary/50 px-2.5 py-1.5 text-sm">
              <span className="flex-1">
                <span className="font-medium">{t.sai}</span>
                <ArrowRight className="mx-1 inline size-3.5 text-muted-foreground" aria-label="sai, entra" />
                <span className="font-medium">{t.entra}</span>
                {t.observacao ? (
                  <span className="block text-xs text-muted-foreground">{t.observacao}</span>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pendente}
                onClick={() => remover(t.id)}
                aria-label={`Remover troca ${t.sai} por ${t.entra}`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {aberto ? (
        <form
          className="space-y-2 rounded-md border p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <datalist id={lista}>
            {nomes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Sai
              <Input list={lista} value={sai} onChange={(e) => setSai(e.target.value)} required />
            </label>
            <label className="text-xs text-muted-foreground">
              Entra
              <Input list={lista} value={entra} onChange={(e) => setEntra(e.target.value)} required />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            Observação (opcional)
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: devolve no dia 25" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pendente}>
              Salvar troca
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
          <Plus /> Registrar troca
        </Button>
      )}
    </div>
  );
}
