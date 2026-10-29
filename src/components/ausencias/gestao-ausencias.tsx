"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import { excluirAusenciaAction, salvarAusenciaAction } from "@/app/acoes/ausencias";
import type { Resultado } from "@/app/acoes/escala";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROTULOS_AUSENCIA, TIPOS_AUSENCIA } from "@/lib/dominio";
import { formatarDataBR, paraISO } from "@/lib/calendario";

export type AusenciaLista = {
  id: number;
  pessoaId: number;
  inicio: string;
  fim: string;
  tipo: "FERIAS" | "ATESTADO" | "DISPENSA";
  ferista: string | null;
  cobreFuncaoId: number | null;
  observacoes: string | null;
};

export function GestaoAusencias({
  ausencias,
  pessoas,
}: {
  ausencias: AusenciaLista[];
  pessoas: { id: number; nome: string; funcao: string; ativo: boolean }[];
}) {
  const [tipo, setTipo] = useState("FERIAS");
  const [pessoaId, setPessoaId] = useState("");
  const [ferista, setFerista] = useState("");
  const [estado, submeter, pendente] = useActionState<Resultado | null, FormData>(
    async (anterior, dados) => {
      const resultado = await salvarAusenciaAction(anterior, dados);
      // O React limpa o formulário depois de salvar; os campos com estado
      // precisam voltar ao início junto.
      if (resultado.ok) {
        setTipo("FERIAS");
        setPessoaId("");
        setFerista("");
      }
      return resultado;
    },
    null,
  );
  const hoje = paraISO(new Date());
  const ativos = pessoas.filter((p) => p.ativo);
  const ferias = tipo === "FERIAS";
  const nomeDe = (id: number | null) => pessoas.find((p) => p.id === id)?.nome ?? "—";

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardContent>
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarOff className="size-4" aria-hidden />
            Registrar ausência
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atestados e dispensas não mudam a escala sozinhos: eles marcam a pessoa e avisam
            qual vaga precisa de substituição. Nas férias, informe o ferista e a escala do mês
            já mostra a cobertura.
          </p>

          <form action={submeter} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pessoaId">Bombeiro</Label>
              <Select
                name="pessoaId"
                required
                onValueChange={(valor) => setPessoaId(valor ? String(valor) : "")}
              >
                <SelectTrigger id="pessoaId" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ativos.map((pessoa) => (
                    <SelectItem key={pessoa.id} value={String(pessoa.id)}>
                      {pessoa.nome} ({pessoa.funcao})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                name="tipo"
                defaultValue="FERIAS"
                onValueChange={(valor) => setTipo(valor ? String(valor) : "FERIAS")}
              >
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_AUSENCIA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {ROTULOS_AUSENCIA[tipo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="inicio">Início</Label>
                <Input id="inicio" name="inicio" type="date" defaultValue={hoje} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fim">Término</Label>
                <Input id="fim" name="fim" type="date" defaultValue={hoje} required />
              </div>
            </div>

            {ferias ? (
              <fieldset className="flex flex-col gap-4 rounded-md border p-3">
                <legend className="px-1 text-sm font-medium">Cobertura das férias</legend>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="ferista">Ferista</Label>
                  <Input
                    id="ferista"
                    name="ferista"
                    placeholder="Nome de quem cobre as férias"
                    value={ferista}
                    onChange={(evento) => setFerista(evento.target.value)}
                    maxLength={80}
                    className="uppercase"
                    autoCapitalize="characters"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="cobreFuncaoId">Quem cobre a função na viatura</Label>
                  <select
                    id="cobreFuncaoId"
                    name="cobreFuncaoId"
                    defaultValue="ferista"
                    disabled={!ferista.trim()}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="ferista">O próprio ferista</option>
                    {ativos
                      .filter((pessoa) => String(pessoa.id) !== pessoaId)
                      .map((pessoa) => (
                        <option key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome} ({pessoa.funcao})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Se outra pessoa assume a função, o ferista fica com a vaga dela na viatura.
                    No rádio o ferista cobre sempre quem está de férias.
                  </p>
                </div>
              </fieldset>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input id="observacoes" name="observacoes" />
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

            <Button type="submit" disabled={pendente}>
              <Plus data-icon="inline-start" />
              Registrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="impressao">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bombeiro</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead className="w-40">Período</TableHead>
                <TableHead>Cobertura</TableHead>
                <TableHead className="hidden md:table-cell">Observações</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ausencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma ausência registrada.
                  </TableCell>
                </TableRow>
              ) : (
                ausencias.map((ausencia) => {
                  const pessoa = pessoas.find((p) => p.id === ausencia.pessoaId);
                  return (
                    <TableRow key={ausencia.id}>
                      <TableCell className="font-medium">
                        {pessoa?.nome ?? "—"}
                        {pessoa ? (
                          <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                            {pessoa.funcao}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ROTULOS_AUSENCIA[ausencia.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {formatarDataBR(ausencia.inicio)} a {formatarDataBR(ausencia.fim)}
                      </TableCell>
                      <TableCell className="min-w-40 whitespace-normal text-sm">
                        {ausencia.ferista ? (
                          <>
                            <span className="font-medium">{ausencia.ferista}</span>
                            <span className="text-muted-foreground"> (ferista)</span>
                            <span className="block text-xs text-muted-foreground">
                              {ausencia.cobreFuncaoId
                                ? `${nomeDe(ausencia.cobreFuncaoId)} cobre a função`
                                : "cobre também a função"}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {ausencia.observacoes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <BotaoExcluir id={ausencia.id} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BotaoExcluir({ id }: { id: number }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="sem-impressao text-destructive"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const dados = new FormData();
          dados.set("id", String(id));
          const resultado = await excluirAusenciaAction(null, dados);
          if (resultado.ok) toast.success(resultado.mensagem);
          else toast.error(resultado.erro);
        })
      }
    >
      <Trash2 />
      <span className="sr-only">Excluir ausência</span>
    </Button>
  );
}
