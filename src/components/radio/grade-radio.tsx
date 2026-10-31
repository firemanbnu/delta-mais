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
import { DIAS_SEMANA, DIAS_SEMANA_CURTO, formatarDataBR } from "@/lib/calendario";
import {
  POSTO_COMUNICACAO,
  SLOTS_RADIO,
  NOITES_POR_CICLO,
  rotuloSlot,
  type LayoutRadio,
  type NoiteDeRadio,
  type SlotRadio,
} from "@/lib/radio";

export type PropsGradeRadio = {
  ano: number;
  mes: number;
  noites: NoiteDeRadio[];
  operadores: OperadorEscolhivel[];
  ausentes: string[];
  comunicacao: { pessoaId: string; nome: string; descricao?: string } | null;
  layout?: LayoutRadio;
  legendas?: boolean;
};

/** Linhas alternadas: uma sem fundo, a seguinte laranja clarinho. */
export function faixaDaLinha(indice: number): string {
  return indice % 2 === 1 ? "bg-orange-50 dark:bg-orange-500/10" : "";
}

function diaDe(noite: NoiteDeRadio): Date {
  return new Date(`${noite.data}T12:00:00`);
}

export function GradeRadio({
  ano,
  mes,
  noites,
  operadores,
  ausentes,
  comunicacao,
  layout = "horizontal",
  legendas = true,
}: PropsGradeRadio) {
  if (noites.length === 0) return null;

  const nomeDoOperador = (id: string) =>
    operadores.find((operador) => operador.id === id)?.nome ?? "—";

  /** Conteúdo de uma faixa numa noite; igual nos dois modelos. */
  function celula(noite: NoiteDeRadio, slot: SlotRadio) {
    if (slot.bloco === "FIXO") {
      return (
        <TableCell key={`${noite.data}-${slot.id}`} className="align-middle">
          <span className="block text-xs font-medium" title={comunicacao?.descricao}>
            {comunicacao?.nome ?? "—"}
          </span>
          <span className="block text-[10px] text-muted-foreground">{POSTO_COMUNICACAO}</span>
        </TableCell>
      );
    }

    const atual = noite.slots[slot.id];
    const ausente = atual ? ausentes.includes(atual.pessoaId) : false;
    const idsNaNoite = Object.values(noite.slots).map((c) => c.pessoaId);

    // Faixa coberta por ferista: mostra quem trabalha de fato. A troca manual
    // fica bloqueada aqui; para mudar, edite as férias.
    if (atual?.cobertura) {
      return (
        <TableCell
          key={`${noite.data}-${slot.id}`}
          className="bg-sky-500/10 align-middle"
          title={atual.cobertura.descricao}
        >
          <span className="block text-xs font-medium">{atual.cobertura.nome}</span>
          <span className="block text-[10px] text-muted-foreground">
            ferista · {nomeDoOperador(atual.pessoaId)}
          </span>
        </TableCell>
      );
    }

    return (
      <TableCell
        key={`${noite.data}-${slot.id}`}
        className={ausente ? "bg-amber-500/10 align-middle" : "align-middle"}
      >
        <CelulaRadio
          ano={ano}
          mes={mes}
          data={noite.data}
          slot={slot.id}
          rotuloSlot={rotuloSlot(slot)}
          pessoaId={atual?.pessoaId ?? null}
          origem={atual?.origem ?? "AUTO"}
          operadores={operadores}
          idsOcupados={atual ? idsNaNoite.filter((id) => id !== atual.pessoaId) : idsNaNoite}
        />
      </TableCell>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        {layout === "vertical" ? (
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Horário</TableHead>
                {noites.map((noite) => (
                  <TableHead key={noite.data} className="min-w-32 text-xs font-normal">
                    <span className="block font-mono font-medium">
                      {formatarDataBR(noite.data).slice(0, 5)}
                    </span>
                    <span className="block uppercase opacity-60">
                      {DIAS_SEMANA_CURTO[diaDe(noite).getDay()]}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SLOTS_RADIO.map((slot, indice) => (
                <TableRow key={slot.id} className={faixaDaLinha(indice)}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {rotuloSlot(slot)}
                  </TableCell>
                  {noites.map((noite) => celula(noite, slot))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
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
              {noites.map((noite, indice) => (
                <TableRow key={noite.data} className={faixaDaLinha(indice)}>
                  <TableCell className="align-top">
                    <span className="block font-mono text-xs">{formatarDataBR(noite.data)}</span>
                    <span className="block text-[10px] uppercase text-muted-foreground">
                      {DIAS_SEMANA[diaDe(noite).getDay()]}
                    </span>
                  </TableCell>
                  {SLOTS_RADIO.map((slot) => celula(noite, slot))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
