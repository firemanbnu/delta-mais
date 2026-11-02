"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

import { salvarEfetivoAction } from "@/app/acoes/gestao";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EQUIPES_EFETIVO,
  FUNCOES_EFETIVO,
  ROTULO_EQUIPE,
  ROTULO_SITUACAO_EFETIVO,
  SITUACOES_EFETIVO,
  type EquipeEfetivo,
  type SituacaoEfetivo,
} from "@/lib/gestao";
import { CLASSE_SELECT } from "./comum";

export type PessoaEfetivo = {
  id: number;
  nome: string;
  nomeGuerra: string | null;
  matricula: string | null;
  funcao: string | null;
  equipe: EquipeEfetivo | null;
  situacao: SituacaoEfetivo;
  pastaDrive: string | null;
  observacoes: string | null;
};

const COR_SITUACAO: Record<SituacaoEfetivo, string> = {
  ATIVO: "text-emerald-600 dark:text-emerald-400",
  AFASTADO: "text-amber-600 dark:text-amber-400",
  DESLIGADO: "text-muted-foreground",
};

export function GestaoEfetivo({ pessoas }: { pessoas: PessoaEfetivo[] }) {
  const [editando, setEditando] = useState<PessoaEfetivo | null>(null);
  const [aberto, setAberto] = useState(false);

  function abrir(pessoa: PessoaEfetivo | null) {
    setEditando(pessoa);
    setAberto(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {pessoas.filter((p) => p.situacao === "ATIVO").length} ativos de {pessoas.length} cadastrados
        </p>
        <Button size="sm" onClick={() => abrir(null)}>
          <Plus data-icon="inline-start" />
          Nova pessoa
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Guerra</TableHead>
              <TableHead className="hidden md:table-cell">Matrícula</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pessoas.map((pessoa) => (
              <TableRow key={pessoa.id} className={pessoa.situacao === "DESLIGADO" ? "opacity-60" : ""}>
                <TableCell className="font-medium">
                  <Link href={`/gestao/documentos/${pessoa.id}`} className="hover:underline">
                    {pessoa.nome}
                  </Link>
                  {pessoa.observacoes ? (
                    <span className="block max-w-md truncate text-xs font-normal text-muted-foreground">
                      {pessoa.observacoes}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{pessoa.nomeGuerra ?? "—"}</TableCell>
                <TableCell className="hidden font-mono text-xs md:table-cell">
                  {pessoa.matricula ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">{pessoa.funcao ?? "—"}</TableCell>
                <TableCell>{pessoa.equipe ? ROTULO_EQUIPE[pessoa.equipe] : "—"}</TableCell>
                <TableCell className={COR_SITUACAO[pessoa.situacao]}>
                  {ROTULO_SITUACAO_EFETIVO[pessoa.situacao]}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Editar ${pessoa.nome}`}
                    onClick={() => abrir(pessoa)}
                  >
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? editando.nome : "Nova pessoa no efetivo"}</DialogTitle>
            <DialogDescription>
              Os dados vieram do cadastro de bombeiros do SCI NVT. Mudanças aqui valem só no Delta Mais.
            </DialogDescription>
          </DialogHeader>
          {/* A chave remonta o formulário ao trocar de pessoa. */}
          <FormEfetivo key={editando?.id ?? "nova"} pessoa={editando} onSalvo={() => setAberto(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormEfetivo({ pessoa, onSalvo }: { pessoa: PessoaEfetivo | null; onSalvo: () => void }) {
  const [estado, enviar, pendente] = useActionState(salvarEfetivoAction, null);
  const aoSalvar = useRef(onSalvo);

  useEffect(() => {
    aoSalvar.current = onSalvo;
  });

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.success(estado.mensagem);
      aoSalvar.current();
    } else {
      toast.error(estado.erro);
    }
  }, [estado]);

  return (
    <form action={enviar} className="space-y-4">
      {pessoa ? <input type="hidden" name="id" value={pessoa.id} /> : null}

      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome completo</Label>
        <Input
          id="nome"
          name="nome"
          required
          className="uppercase"
          autoCapitalize="characters"
          defaultValue={pessoa?.nome ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nomeGuerra">Nome de guerra</Label>
          <Input
            id="nomeGuerra"
            name="nomeGuerra"
            className="uppercase"
            defaultValue={pessoa?.nomeGuerra ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="matricula">Matrícula</Label>
          <Input id="matricula" name="matricula" defaultValue={pessoa?.matricula ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="funcao">Função</Label>
          <select id="funcao" name="funcao" defaultValue={pessoa?.funcao ?? ""} className={CLASSE_SELECT}>
            <option value="">—</option>
            {FUNCOES_EFETIVO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="equipe">Equipe</Label>
          <select id="equipe" name="equipe" defaultValue={pessoa?.equipe ?? ""} className={CLASSE_SELECT}>
            <option value="">—</option>
            {EQUIPES_EFETIVO.map((e) => (
              <option key={e} value={e}>
                {ROTULO_EQUIPE[e]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="situacaoEfetivo">Situação</Label>
          <select
            id="situacaoEfetivo"
            name="situacao"
            defaultValue={pessoa?.situacao ?? "ATIVO"}
            className={CLASSE_SELECT}
          >
            {SITUACOES_EFETIVO.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SITUACAO_EFETIVO[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pastaDrive">Pasta no Drive</Label>
          <Input
            id="pastaDrive"
            name="pastaDrive"
            placeholder="D - NOME DA PESSOA"
            defaultValue={pessoa?.pastaDrive ?? ""}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" name="observacoes" rows={2} defaultValue={pessoa?.observacoes ?? ""} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
