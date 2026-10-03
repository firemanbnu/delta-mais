import { Info } from "lucide-react";

import { CelulaRadio, type OperadorEscolhivel } from "@/components/radio/celula-radio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DIAS_SEMANA, formatarDataBR } from "@/lib/calendario";
import {
  POSTO_COMUNICACAO,
  SLOTS_RADIO,
  NOITES_POR_CICLO,
  rotuloSlot,
  type NoiteDeRadio,
} from "@/lib/radio";

export type PropsGradeRadio = {
  ano: number;
  mes: number;
  noites: NoiteDeRadio[];
  operadores: OperadorEscolhivel[];
  ausentes: string[];
  comunicacao: { pessoaId: string; nome: string } | null;
  legendas?: boolean;
};

export function GradeRadio({
  ano,
  mes,
  noites,
  operadores,
  ausentes,
  comunicacao,
  legendas = true,
}: PropsGradeRadio) {
  if (noites.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table className="min-w-[64rem]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Noite</TableHead>
              {SLOTS_RADIO.map((slot) => (
                <TableHead key={slot.id} className="whitespace-nowrap text-xs font-normal">
                  <span className="font-mono">{slot.inicio}</span>
                  <span className="block opacity-60">
                    {slot.bloco === "FIXO" ? POSTO_COMUNICACAO : `anel ${slot.posicaoNoAnel! + 1}`}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {noites.map((noite) => {
              const dia = new Date(`${noite.data}T12:00:00`);
              const idsNaNoite = Object.values(noite.slots).map((celula) => celula.pessoaId);

              return (
                <TableRow key={noite.data}>
                  <TableCell className="align-top">
                    <span className="block font-mono text-xs">{formatarDataBR(noite.data)}</span>
                    <span className="block text-[10px] uppercase text-muted-foreground">
                      {DIAS_SEMANA[dia.getDay()]} · noite {noite.indice}
                    </span>
                  </TableCell>

                  {SLOTS_RADIO.map((slot) => {
                    if (slot.bloco === "FIXO") {
                      return (
                        <TableCell key={slot.id} className="bg-muted/40 align-middle">
                          <span className="block text-xs font-medium">{comunicacao?.nome ?? "—"}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {rotuloSlot(slot)}
                          </span>
                        </TableCell>
                      );
                    }

                    const celula = noite.slots[slot.id];
                    const ausente = celula ? ausentes.includes(celula.pessoaId) : false;

                    return (
                      <TableCell
                        key={slot.id}
                        className={ausente ? "bg-amber-500/10 align-middle" : "align-middle"}
                      >
                        <CelulaRadio
                          ano={ano}
                          mes={mes}
                          data={noite.data}
                          slot={slot.id}
                          rotuloSlot={rotuloSlot(slot)}
                          pessoaId={celula?.pessoaId ?? null}
                          origem={celula?.origem ?? "AUTO"}
                          operadores={operadores}
                          idsOcupados={
                            celula
                              ? idsNaNoite.filter((id) => id !== celula.pessoaId)
                              : idsNaNoite
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {legendas ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Info className="size-3" aria-hidden />
            {noites.length} noites de rádio · ciclo de {NOITES_POR_CICLO} noites
          </span>
          <span>
            Anel 1:{" "}
            {operadores
              .filter((operador) => operador.anel === 1)
              .map((operador) => operador.nome)
              .join(" → ")}
          </span>
          <span>
            Anel 2:{" "}
            {operadores
              .filter((operador) => operador.anel === 2)
              .map((operador) => operador.nome)
              .join(" → ")}
          </span>
        </div>
      ) : null}
    </div>
  );
}
