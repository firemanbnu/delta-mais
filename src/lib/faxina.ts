import type { AnoMes } from "./calendario";
import { mesmoNome, type CoberturaFerias } from "./cobertura";

/**
 * Escala de faxina.
 *
 * Quatro pessoas ficam sempre no mesmo local. As outras seis giram uma vez por
 * mês nesta ordem, e quem está no último local volta ao primeiro:
 *
 *   Vestiário masc. → Corredores → Garagem → Auditório → Alojamento masc. →
 *   WC's piso térreo → Vestiário masc.
 *
 * Os nomes são os mesmos da escala de rádio e não têm cadastro próprio. As
 * férias com ferista são ligadas pelo nome do bombeiro de férias.
 */
export type LocalFaxina = {
  id: string;
  rotulo: string;
  /** Posição no rodízio, 0..5. `null` nos locais fixos. */
  posicaoNoRodizio: number | null;
};

export const LOCAIS_FAXINA: readonly LocalFaxina[] = [
  { id: "cozinha", rotulo: "Cozinha / Refeitório", posicaoNoRodizio: null },
  {
    id: "comunicacao",
    rotulo: "Sala de comunicação / Aloj. fem. / WC fem.",
    posicaoNoRodizio: null,
  },
  { id: "vestiario", rotulo: "Vestiário masc. / WC vest. masc.", posicaoNoRodizio: 0 },
  { id: "corredores", rotulo: "Corredores / Academia", posicaoNoRodizio: 1 },
  { id: "garagem", rotulo: "Garagem", posicaoNoRodizio: 2 },
  { id: "auditorio", rotulo: "Auditório / Sala de TV", posicaoNoRodizio: 3 },
  { id: "alojamento", rotulo: "Alojamento masculino / WC aloj.", posicaoNoRodizio: 4 },
  { id: "wc-terreo", rotulo: "WC's piso térreo / WC auditório", posicaoNoRodizio: 5 },
  { id: "lideranca", rotulo: "Sala e WC liderança", posicaoNoRodizio: null },
  { id: "lixo", rotulo: "Lixo", posicaoNoRodizio: null },
];

/** Quem nunca sai do local. */
export const FIXOS_FAXINA: Record<string, string> = {
  cozinha: "ATAIDE",
  comunicacao: "CATIA",
  lideranca: "ALEXANDRE",
  lixo: "ADALTO",
};

/** Mês em que o rodízio está na posição de partida abaixo. */
export const MES_BASE_FAXINA: AnoMes = { ano: 2026, mes: 10 };

/** Quem está em cada posição do rodízio no mês base (0 = vestiário). */
export const RODIZIO_BASE_FAXINA: readonly string[] = [
  "MASSEN",
  "SERRA",
  "FERNANDO",
  "DOUGLAS",
  "MONTANARO",
  "VANZELLA",
];

export type CelulaFaxina = {
  local: LocalFaxina;
  nome: string;
  fixo: boolean;
  /** Ferista que faz a faxina no lugar de `nome`, que está de férias. */
  cobertura?: { nome: string; descricao: string };
};

function mesesEntre(de: AnoMes, ate: AnoMes): number {
  return (ate.ano - de.ano) * 12 + (ate.mes - de.mes);
}

/** Quem cai na posição do rodízio no mês: a cada mês todos andam uma posição. */
export function nomeNaPosicao(posicao: number, anoMes: AnoMes): string {
  const total = RODIZIO_BASE_FAXINA.length;
  const giro = mesesEntre(MES_BASE_FAXINA, anoMes);
  // Quem está na posição p veio da posição p - giro.
  const origem = (((posicao - giro) % total) + total) % total;
  return RODIZIO_BASE_FAXINA[origem];
}

/** Escala de faxina do mês, com o ferista no lugar de quem está de férias. */
export function montarFaxina(
  anoMes: AnoMes,
  ferias: readonly CoberturaFerias[] = [],
  nomesDoQuadro: ReadonlyMap<string, string> = new Map(),
): CelulaFaxina[] {
  const comFerista = ferias
    .map((f) => ({ ferista: f.ferista.trim(), ausente: nomesDoQuadro.get(f.pessoaId) }))
    .filter((f): f is { ferista: string; ausente: string } => Boolean(f.ferista && f.ausente));

  return LOCAIS_FAXINA.map((local) => {
    const fixo = local.posicaoNoRodizio === null;
    const nome = fixo
      ? (FIXOS_FAXINA[local.id] ?? "—")
      : nomeNaPosicao(local.posicaoNoRodizio ?? 0, anoMes);

    const coberto = comFerista.find((f) => mesmoNome(nome, f.ausente));
    return {
      local,
      nome,
      fixo,
      ...(coberto
        ? {
            cobertura: {
              nome: coberto.ferista,
              descricao: `${coberto.ferista} (ferista) cobre as férias de ${nome}`,
            },
          }
        : {}),
    };
  });
}
