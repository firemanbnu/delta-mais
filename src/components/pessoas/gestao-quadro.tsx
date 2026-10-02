"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";

import { alternarAtivoAction, excluirPessoaAction, salvarPessoaAction } from "@/app/acoes/pessoas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FUNCOES } from "@/lib/dominio";
import type { PessoaComEquipe } from "@/db/repositorio";

const POSTO_FIXO_POR_FUNCAO: Partial<Record<string, string>> = { CE: "F2-CE", LR: "CRS-LR" };

export function GestaoQuadro({ pessoas }: { pessoas: PessoaComEquipe[] }) {
  const [editando, setEditando] = useState<PessoaComEquipe | null>(null);
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <div className="sem-impressao mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {pessoas.filter((p) => p.ativo).length} ativos de {pessoas.length} cadastrados
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setAberto(true);
          }}
        >
          <Plus data-icon="inline-start" />
          Novo bombeiro
        </Button>
      </div>

      <Card className="impressao">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24">Função</TableHead>
                <TableHead className="w-28">Matrícula</TableHead>
                <TableHead className="w-40">Telefone</TableHead>
                <TableHead className="w-24">Situação</TableHead>
                <TableHead className="w-36 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pessoas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhum bombeiro cadastrado. Cadastre os 10 componentes do plantão para começar.
                  </TableCell>
                </TableRow>
              ) : (
                pessoas.map((pessoa) => (
                  <LinhaPessoa
                    key={pessoa.id}
                    pessoa={pessoa}
                    onEditar={() => {
                      setEditando(pessoa);
                      setAberto(true);
                    }}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DialogoPessoa
        aberto={aberto}
        onFechar={() => setAberto(false)}
        pessoa={editando}
        total={pessoas.length}
      />
    </>
  );
}

function LinhaPessoa({
  pessoa,
  onEditar,
}: {
  pessoa: PessoaComEquipe;
  onEditar: () => void;
}) {
  const [pendente, iniciar] = useTransition();

  function alternar() {
    iniciar(async () => {
      const dados = new FormData();
      dados.set("id", String(pessoa.id));
      const resultado = await alternarAtivoAction(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  function excluir() {
    iniciar(async () => {
      const dados = new FormData();
      dados.set("id", String(pessoa.id));
      const resultado = await excluirPessoaAction(null, dados);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  return (
    <TableRow className={pessoa.ativo ? undefined : "opacity-60"}>
      <TableCell className="font-medium">{pessoa.nome}</TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {pessoa.funcao}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{pessoa.matricula ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">{pessoa.telefone ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={pessoa.ativo ? "default" : "secondary"} className="text-xs">
          {pessoa.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="sem-impressao flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEditar} disabled={pendente}>
            <Pencil />
            <span className="sr-only">Editar {pessoa.nome}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={alternar} disabled={pendente}>
            <Power />
            <span className="sr-only">
              {pessoa.ativo ? "Desativar" : "Reativar"} {pessoa.nome}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={excluir}
            disabled={pendente}
            className="text-destructive"
          >
            <Trash2 />
            <span className="sr-only">Excluir {pessoa.nome}</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function DialogoPessoa({
  aberto,
  onFechar,
  pessoa,
  total,
}: {
  aberto: boolean;
  onFechar: () => void;
  pessoa: PessoaComEquipe | null;
  total: number;
}) {
  const [estado, submeter, pendente] = useActionState(salvarPessoaAction, null);
  const [funcao, setFuncao] = useState<string>(pessoa?.funcao ?? "MC");

  const vagaFixa = POSTO_FIXO_POR_FUNCAO[funcao] ?? "";

  return (
    <Dialog open={aberto} onOpenChange={(value) => !value && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pessoa ? `Editar ${pessoa.nome}` : "Novo bombeiro"}</DialogTitle>
          <DialogDescription>
            {pessoa
              ? "Atualize os dados do componente do plantão."
              : "Informe nome e função. A função define em quais vagas o rodízio pode escalar essa pessoa."}
          </DialogDescription>
        </DialogHeader>

        <form action={submeter} className="flex flex-col gap-4">
          {pessoa ? <input type="hidden" name="id" value={pessoa.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" defaultValue={pessoa?.nome ?? ""} required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="funcao">Função</Label>
              <Select
                name="funcao"
                value={funcao}
                onValueChange={(valor) => setFuncao(valor ?? "MC")}
              >
                <SelectTrigger id="funcao" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input id="matricula" name="matricula" defaultValue={pessoa?.matricula ?? ""} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                inputMode="tel"
                defaultValue={pessoa?.telefone ?? ""}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ordem">Ordem na escala impressa</Label>
              <Input
                id="ordem"
                name="ordem"
                type="number"
                min={0}
                defaultValue={pessoa?.ordem ?? total + 1}
              />
            </div>
          </div>

          {vagaFixa ? (
            <input type="hidden" name="postoFixo" value={vagaFixa} />
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              defaultValue={pessoa?.observacoes ?? ""}
            />
          </div>

          {estado && !estado.ok ? (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {estado.erro}
            </p>
          ) : null}
          {estado?.ok ? (
            <p className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm">
              {estado.mensagem}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onFechar}>
              Fechar
            </Button>
            <Button type="submit" disabled={pendente}>
              {pessoa ? "Salvar alterações" : "Adicionar ao quadro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
