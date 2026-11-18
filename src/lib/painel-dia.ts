import { type NoiteDeServico } from "./dominio";
import { ehNoiteDeServico, paraISO, somarDias } from "./calendario";

/** Fuso do SESCINC SBNF: o servidor da Vercel roda em UTC. */
export const FUSO_PLANTAO = "America/Sao_Paulo";

/** Data (AAAA-MM-DD) e minutos do dia no fuso do plantão. */
export function agoraNoFuso(agora: Date = new Date(), fuso = FUSO_PLANTAO) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  return {
    dataISO: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

function minutosDe(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export type SituacaoPlantao = "EM_ANDAMENTO" | "HOJE" | "PROXIMO";

export type PlantaoDoPainel = {
  /** Data em que o plantão começa (a noite). */
  data: string;
  situacao: SituacaoPlantao;
};

/**
 * Plantão atual e os seguintes.
 *
 * O plantão vai das 19h às 7h do dia seguinte. Antes das 7h, o plantão em
 * andamento é o que começou na noite anterior.
 */
export function plantoesDoPainel(opcoes: {
  dataISO: string;
  minutos: number;
  ancora: string;
  noite: NoiteDeServico;
  turnoInicio: string;
  turnoFim: string;
  quantidade?: number;
}): PlantaoDoPainel[] {
  const { dataISO, minutos, ancora, noite } = opcoes;
  const quantidade = opcoes.quantidade ?? 4;
  const inicio = minutosDe(opcoes.turnoInicio);
  const fim = minutosDe(opcoes.turnoFim);
  const servico = (d: Date | string) => ehNoiteDeServico(d, ancora, noite);

  const ontem = somarDias(dataISO, -1);
  let primeiro: Date;
  let situacao: SituacaoPlantao;
  if (minutos < fim && servico(ontem)) {
    primeiro = ontem;
    situacao = "EM_ANDAMENTO";
  } else if (servico(dataISO)) {
    primeiro = somarDias(dataISO, 0);
    situacao = minutos >= inicio ? "EM_ANDAMENTO" : "HOJE";
  } else {
    primeiro = somarDias(dataISO, 1);
    situacao = "PROXIMO";
  }
  return Array.from({ length: quantidade }, (_, i) => ({
    data: paraISO(somarDias(primeiro, i * 2)),
    situacao: i === 0 ? situacao : "PROXIMO",
  }));
}

export const ROTULO_SITUACAO_PLANTAO: Record<SituacaoPlantao, string> = {
  EM_ANDAMENTO: "Plantão atual",
  HOJE: "Hoje à noite",
  PROXIMO: "Próximo",
};

/** Horário de cada PTR-BA no SCI NVT: 1ª 20h, 2ª 21h, 3ª (ou atividade física) 22h. */
export const HORARIOS_PTRBA = ["20h às 21h", "21h às 22h", "22h às 23h"] as const;

export type LinhaPtrba = { ordem: number; assunto: string; instrutor: string | null };

export type ProgramaPtrba = {
  instrucoes: { horario: string; assunto: string; instrutor: string | null }[];
  atividadeFisica: string | null;
};

/**
 * Monta o programa da noite. Quando não há 3ª instrução, a atividade física
 * ocupa o horário das 22h, como no SCI NVT.
 */
export function programaPtrba(linhas: readonly LinhaPtrba[]): ProgramaPtrba {
  const instr = linhas
    .filter((l) => l.ordem >= 1 && l.ordem <= 3)
    .sort((a, b) => a.ordem - b.ordem);
  const atividadeFisica = linhas.find((l) => l.ordem === 0)?.assunto ?? null;
  const instrucoes = instr.map((l, i) => ({
    horario: HORARIOS_PTRBA[i] ?? "",
    assunto: l.assunto,
    instrutor: l.instrutor,
  }));
  if (instrucoes.length < 3) {
    instrucoes.push({
      horario: HORARIOS_PTRBA[instrucoes.length],
      assunto: atividadeFisica ? `Atividade física: ${atividadeFisica}` : "Atividade física",
      instrutor: null,
    });
  }
  return { instrucoes, atividadeFisica };
}

/** Ausência que alcança a noite `data` (inclusive). */
export function ausenteNaNoite(a: { inicio: string; fim: string }, data: string): boolean {
  return a.inicio <= data && a.fim >= data;
}

/**
 * Blocos do painel. Para criar um novo, acrescente aqui e faça o cartão na
 * página `/dia`; os marcados como "planejado" aparecem como espaço reservado.
 */
export const MODULOS_PAINEL = [
  { id: "plantoes", titulo: "Plantões e trocas de serviço", estado: "ativo" },
  { id: "ptrba", titulo: "Programação de PTR-BA", estado: "ativo" },
  { id: "atestados", titulo: "Atestados e afastamentos", estado: "ativo" },
  { id: "emails", titulo: "E-mails", estado: "ativo" },
] as const;
