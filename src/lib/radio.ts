import {
  ancoraDoCiclo,
  diffDias,
  ehNoiteDeServico,
  formatarDataBR,
  noitesDeServicoNoMes,
  paraISO,
  type AnoMes,
} from "./calendario";
import { ROTULO_NOITE_DE_SERVICO, type NoiteDeServico } from "./dominio";
import type { Problema } from "./rotacao";

/** Quantidade de operadores em cada anel. O rodízio assume os dois com o mesmo tamanho. */
export const OPERADORES_POR_ANEL = 4;

/** Noites até o rodízio repetir: 4 posições × 2 noites cada. */
export const NOITES_POR_CICLO = OPERADORES_POR_ANEL * 2;

/** Vaga do plantão que também atende a central de comunicações. */
export const POSTO_COMUNICACAO = "F3-BA2";

export type BlocoRadio = "A" | "B" | "FIXO";

export type SlotRadio = {
  /** Chave estável: usada na coluna `slot` das exceções e no CSV. */
  id: string;
  inicio: string;
  fim: string;
  bloco: BlocoRadio;
  /** Posição dentro do anel, 0..3. `null` nas faixas fixas. */
  posicaoNoAnel: number | null;
  /** A faixa é coberta pelo bombeiro de plantão em `POSTO_COMUNICACAO`. */
  vagaComunicacao: boolean;
};

/**
 * As 10 faixas de uma noite de rádio.
 *
 * Duas são fixas (entrada e saída da central, cobertas pelo bombeiro do F3-BA2)
 * e as outras oito giram entre os anéis. `A` cobre o primeiro turno da noite,
 * até a meia-noite; `B` cobre o resto, até a entrada do turno seguinte.
 */
export const SLOTS_RADIO: readonly SlotRadio[] = [
  { id: "19-20", inicio: "19:00", fim: "20:00", bloco: "FIXO", posicaoNoAnel: null, vagaComunicacao: true },
  { id: "20-21", inicio: "20:00", fim: "21:00", bloco: "A", posicaoNoAnel: 0, vagaComunicacao: false },
  { id: "21-22", inicio: "21:00", fim: "22:00", bloco: "A", posicaoNoAnel: 1, vagaComunicacao: false },
  { id: "22-23", inicio: "22:00", fim: "23:00", bloco: "A", posicaoNoAnel: 2, vagaComunicacao: false },
  { id: "23-00", inicio: "23:00", fim: "00:00", bloco: "A", posicaoNoAnel: 3, vagaComunicacao: false },
  { id: "00-01:30", inicio: "00:00", fim: "01:30", bloco: "B", posicaoNoAnel: 0, vagaComunicacao: false },
  { id: "01:30-03", inicio: "01:30", fim: "03:00", bloco: "B", posicaoNoAnel: 1, vagaComunicacao: false },
  { id: "03-04:30", inicio: "03:00", fim: "04:30", bloco: "B", posicaoNoAnel: 2, vagaComunicacao: false },
  { id: "04:30-06", inicio: "04:30", fim: "06:00", bloco: "B", posicaoNoAnel: 3, vagaComunicacao: false },
  { id: "06-07", inicio: "06:00", fim: "07:00", bloco: "FIXO", posicaoNoAnel: null, vagaComunicacao: true },
];

/** Faixas que giam entre os anéis. */
export const SLOTS_RODIZIO = SLOTS_RADIO.filter((slot) => slot.bloco !== "FIXO");

/** Faixas cobertas pelo bombeiro do `POSTO_COMUNICACAO`. */
export const SLOTS_FIXOS = SLOTS_RADIO.filter((slot) => slot.vagaComunicacao);

export function rotuloSlot(slot: SlotRadio): string {
  return `${slot.inicio} às ${slot.fim}`;
}

/** Configuração de que a escala de rádio depende. */
export type ConfigRadio = {
  dataAncora: string;
  noiteDeServico: NoiteDeServico;
  radioAncora: string;
};

/** Ids dos operadores de cada anel, já na ordem em que entram. */
export type AneisRadio = Record<1 | 2, string[]>;

export type OperadorRadio = {
  id: string;
  nome: string;
  anel: 1 | 2;
  ordem: number;
  ativo: boolean;
};

export type OrigemCelula = "AUTO" | "MANUAL";

export type CelulaRadio = {
  pessoaId: string;
  origem: OrigemCelula;
};

export type NoiteDeRadio = {
  /** Data no padrão "AAAA-MM-DD". */
  data: string;
  /** Noite 0 é a `radioAncora`. */
  indice: number;
  /** Quantas posições os dois anéis já giraram: 0..3. */
  volta: number;
  /** `true` quando o anel 1 está no turno da noite (bloco A). */
  anelUmNoTurnoA: boolean;
  slots: Record<string, CelulaRadio>;
};

export type ExcecaoRadio = {
  data: string;
  slot: string;
  pessoaId: string;
};

/**
 * Noite zero da escala de rádio: a primeira noite de serviço a partir da
 * âncora do rádio.
 *
 * Passa por `ancoraDoCiclo` para que a virada de paridade ande um dia, igual
 * ao plantão — sem isso a noite zero cairia numa noite de folga e o índice das
 * noites viraria meio número.
 */
export function noiteZeroDoRadio(config: ConfigRadio): Date {
  return ancoraDoCiclo(config.radioAncora, config.noiteDeServico);
}

/**
 * A âncora do rádio só gera índice inteiro se ela própria for noite de serviço
 * do ciclo do plantão. Sem essa checagem, trocar a data ou a paridade depois
 * deixaria o índice fracionário e o rodízio giraria meio passo em silêncio.
 */
export function ancoraRadioAlinhada(config: ConfigRadio): boolean {
  return ehNoiteDeServico(config.radioAncora, config.dataAncora, config.noiteDeServico);
}

/**
 * Noites de rádio do mês: as noites de serviço do plantão a partir da âncora
 * do rádio. A grade nunca mostra uma noite em que não há equipe.
 */
export function noitesDeRadioNoMes(
  ano: number,
  mes: number,
  config: ConfigRadio,
): Date[] {
  const zero = noiteZeroDoRadio(config);
  return noitesDeServicoNoMes(ano, mes, config.dataAncora, config.noiteDeServico).filter(
    (dia) => diffDias(dia, zero) >= 0,
  );
}

export function temEscalaRadio(anoMes: AnoMes, config: ConfigRadio): boolean {
  return noitesDeRadioNoMes(anoMes.ano, anoMes.mes, config).length > 0;
}

/**
 * Distância em noites entre a noite zero e a data. Só faz sentido para noites
 * de serviço: o ciclo de 48h garante que a distância é sempre par.
 */
export function indiceNoite(data: Date | string, config: ConfigRadio): number {
  return diffDias(data, noiteZeroDoRadio(config)) / 2;
}

/** Volta do rodízio: a cada duas noites os dois anéis avançam uma posição. */
export function voltaDoAnel(noite: number): number {
  return (((Math.floor(noite / 2) % OPERADORES_POR_ANEL) + OPERADORES_POR_ANEL) % OPERADORES_POR_ANEL);
}

/** Os anéis trocam de turno a cada noite. */
export function anelUmNoTurnoA(noite: number): boolean {
  return ((noite % 2) + 2) % 2 === 0;
}

/** Anel que cobre a faixa: o inverso do turno quando a noite é ímpar. */
export function anelDoSlot(slot: SlotRadio, noite: number): 1 | 2 {
  const base: 1 | 2 = slot.bloco === "A" ? 1 : 2;
  return anelUmNoTurnoA(noite) ? base : base === 1 ? 2 : 1;
}

/** Operador que cai na posição `posicaoNoAnel` do anel na volta `volta`. */
export function operadorDaPosicao(
  anel: 1 | 2,
  posicaoNoAnel: number,
  volta: number,
  aneis: AneisRadio,
): string | null {
  const lista = aneis[anel] ?? [];
  if (lista.length === 0) return null;
  const tamanho = lista.length;
  return lista[(posicaoNoAnel + volta) % tamanho] ?? null;
}

/** Monta as oito faixas que giram numa noite, já com o operador automático. */
export function slotsDaNoite(noite: number, aneis: AneisRadio): Record<string, CelulaRadio> {
  const volta = voltaDoAnel(noite);
  const slots: Record<string, CelulaRadio> = {};

  for (const slot of SLOTS_RODIZIO) {
    const pessoaId = operadorDaPosicao(
      anelDoSlot(slot, noite),
      slot.posicaoNoAnel ?? 0,
      volta,
      aneis,
    );
    if (pessoaId !== null) slots[slot.id] = { pessoaId, origem: "AUTO" };
  }

  return slots;
}

/** Todas as noites de rádio do mês já montadas, com as exceções aplicadas. */
export function montarGradeDoMes(
  anoMes: AnoMes,
  config: ConfigRadio,
  aneis: AneisRadio,
  excecoes: readonly ExcecaoRadio[] = [],
): NoiteDeRadio[] {
  const excecaoPorCelula = new Map(excecoes.map((e) => [`${e.data}|${e.slot}`, e.pessoaId]));

  return noitesDeRadioNoMes(anoMes.ano, anoMes.mes, config).map((dia) => {
    const data = paraISO(dia);
    const noite = indiceNoite(dia, config);
    const slots = slotsDaNoite(noite, aneis);

    for (const slot of SLOTS_RADIO) {
      const troca = excecaoPorCelula.get(`${data}|${slot.id}`);
      if (troca === undefined) continue;
      if (slot.bloco === "FIXO") continue;
      slots[slot.id] = { pessoaId: troca, origem: "MANUAL" };
    }

    return {
      data,
      indice: noite,
      volta: voltaDoAnel(noite),
      anelUmNoTurnoA: anelUmNoTurnoA(noite),
      slots,
    };
  });
}

/**
 * Erros que impedem a escala de rádio de rodar.
 *
 * A âncora desalinhada é o mais importante: sem ela o índice da noite não é
 * inteiro e o rodízio gira meio passo, errando a escala em silêncio.
 */
export function validarConfigRadio(config: ConfigRadio): Problema[] {
  const problemas: Problema[] = [];

  if (!ancoraRadioAlinhada(config)) {
    problemas.push({
      severidade: "erro",
      posto: null,
      mensagem:
        `A data de início da escala de rádio (${formatarDataBR(config.radioAncora)}) não é noite de ` +
        `serviço do plantão (${ROTULO_NOITE_DE_SERVICO[config.noiteDeServico].toLowerCase()}). ` +
        "Escolha uma data que caia numa noite de serviço, senão o rodízio gira meio passo.",
    });
  }

  return problemas;
}

/** Lista os operadores dos dois anéis na ordem em que eles entram. */
export function validarAneis(aneis: AneisRadio, operadores: readonly OperadorRadio[]): Problema[] {
  const problemas: Problema[] = [];

  for (const anel of [1, 2] as const) {
    const lista = aneis[anel] ?? [];
    if (lista.length !== OPERADORES_POR_ANEL) {
      problemas.push({
        severidade: "erro",
        posto: `Anel ${anel}`,
        mensagem: `O anel ${anel} tem ${lista.length} operador(es) e o rodízio exige ${OPERADORES_POR_ANEL}.`,
      });
    }
  }

  const cadastrados = new Set(operadores.map((o) => o.id));
  for (const anel of [1, 2] as const) {
    for (const pessoaId of aneis[anel] ?? []) {
      if (!cadastrados.has(pessoaId)) {
        problemas.push({
          severidade: "erro",
          posto: `Anel ${anel}`,
          mensagem: "Operador de rádio sem cadastro no quadro.",
        });
      }
    }
  }

  const repetidos = new Set<string>();
  for (const pessoaId of [...aneis[1], ...aneis[2]]) {
    if (repetidos.has(pessoaId)) {
      problemas.push({
        severidade: "erro",
        posto: null,
        mensagem: "O mesmo operador está nos dois anéis. Cada pessoa entra uma vez só.",
      });
    }
    repetidos.add(pessoaId);
  }

  return problemas;
}

/** Confere cada noite montada: faixa vazia, duplicidade e ausência. */
export function validarGradeRadio(
  noites: readonly NoiteDeRadio[],
  nomesPorId: ReadonlyMap<string, string>,
  ausentes: readonly string[] = [],
): Problema[] {
  const problemas: Problema[] = [];

  for (const noite of noites) {
    for (const slot of SLOTS_RODIZIO) {
      const celula = noite.slots[slot.id];
      const local = `${formatarDataBR(noite.data)} ${slot.inicio}`;

      if (!celula) {
        problemas.push({
          severidade: "erro",
          posto: local,
          mensagem: `Faixa ${rotuloSlot(slot)} sem operador.`,
        });
        continue;
      }

      const nome = nomesPorId.get(celula.pessoaId);
      if (nome && ausentes.includes(celula.pessoaId)) {
        problemas.push({
          severidade: "aviso",
          posto: local,
          mensagem: `${nome} consta como ausente neste mês.`,
        });
      }
    }

    const porPessoa = new Map<string, string[]>();
    for (const slot of SLOTS_RODIZIO) {
      const celula = noite.slots[slot.id];
      if (!celula) continue;
      const lista = porPessoa.get(celula.pessoaId) ?? [];
      lista.push(slot.id);
      porPessoa.set(celula.pessoaId, lista);
    }

    for (const [pessoaId, slots] of porPessoa) {
      if (slots.length <= 1) continue;
      const nome = nomesPorId.get(pessoaId) ?? pessoaId;
      problemas.push({
        severidade: "erro",
        posto: formatarDataBR(noite.data),
        mensagem: `${nome} está em mais de uma faixa na mesma noite: ${slots.join(", ")}.`,
      });
    }
  }

  return problemas;
}

/** Descrição curta da regra, usada na tela e na impressão. */
export function resumoDaRegra(): string {
  return (
    `Dois anéis de ${OPERADORES_POR_ANEL} operadores. A cada noite os anéis trocam de turno e a ` +
    `cada duas noites avançam uma posição; o ciclo fecha em ${NOITES_POR_CICLO} noites. ` +
    `As faixas 19:00-20:00 e 06:00-07:00 são fixas no ${POSTO_COMUNICACAO}.`
  );
}

/** Operadores que o seed cria, na ordem em que entram no rodízio. */
export const OPERADORES_RADIO_PADRAO: readonly {
  nome: string;
  anel: 1 | 2;
  ordem: number;
}[] = [
  { nome: "Vanzella", anel: 1, ordem: 0 },
  { nome: "Fernando", anel: 1, ordem: 1 },
  { nome: "Catia", anel: 1, ordem: 2 },
  { nome: "Serra", anel: 1, ordem: 3 },
  { nome: "Massen", anel: 2, ordem: 0 },
  { nome: "Douglas", anel: 2, ordem: 1 },
  { nome: "Ataide", anel: 2, ordem: 2 },
  { nome: "Montanaro", anel: 2, ordem: 3 },
];

export const TIME_RADIO = "Equipe de Rádio";
