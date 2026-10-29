import type { AnoMes } from "./calendario";
import { mesmoNome, type CoberturaFerias } from "./cobertura";
import type { CelulaFaxina, LocalFaxina } from "./faxina";

/**
 * Escala de abastecimento das viaturas: uma pessoa por mês para o EPRA e uma
 * para o RTI. Cada lista gira um nome por mês, a partir de novembro de 2026, e
 * volta ao primeiro depois do último. Antes de novembro de 2026 não há escala.
 *
 * As células usam o mesmo formato da faxina para aproveitar a mesma grade na
 * tela e a mesma regra de férias: o ferista cobre quem está de férias.
 */
export type RodizioAbastecimento = {
  local: LocalFaxina;
  ordem: readonly string[];
};

export const MES_BASE_ABASTECIMENTO: AnoMes = { ano: 2026, mes: 11 };

export const RODIZIOS_ABASTECIMENTO: readonly RodizioAbastecimento[] = [
  {
    local: { id: "epra", rotulo: "Abastecimento EPRA", posicaoNoRodizio: 0 },
    ordem: ["Fernando", "Massen", "Montanaro", "Serra", "Catia"],
  },
  {
    local: { id: "rti", rotulo: "Abastecimento RTI", posicaoNoRodizio: 0 },
    ordem: ["Serra", "Montanaro", "Massen", "Catia", "Fernando"],
  },
];

function mesesEntre(de: AnoMes, ate: AnoMes): number {
  return (ate.ano - de.ano) * 12 + (ate.mes - de.mes);
}

/** Quem abastece no mês, ou `null` antes do início da escala. */
export function responsavelNoMes(ordem: readonly string[], anoMes: AnoMes): string | null {
  const giro = mesesEntre(MES_BASE_ABASTECIMENTO, anoMes);
  if (giro < 0 || ordem.length === 0) return null;
  return ordem[giro % ordem.length];
}

/** Escala de abastecimento do mês; vazia antes de novembro de 2026. */
export function montarAbastecimento(
  anoMes: AnoMes,
  ferias: readonly CoberturaFerias[] = [],
  nomesDoQuadro: ReadonlyMap<string, string> = new Map(),
): CelulaFaxina[] {
  const comFerista = ferias
    .map((f) => ({ ferista: f.ferista.trim(), ausente: nomesDoQuadro.get(f.pessoaId) }))
    .filter((f): f is { ferista: string; ausente: string } => Boolean(f.ferista && f.ausente));

  const celulas: CelulaFaxina[] = [];
  for (const { local, ordem } of RODIZIOS_ABASTECIMENTO) {
    const nome = responsavelNoMes(ordem, anoMes);
    if (!nome) continue;

    const coberto = comFerista.find((f) => mesmoNome(nome, f.ausente));
    celulas.push({
      local,
      nome,
      fixo: false,
      ...(coberto
        ? {
            cobertura: {
              nome: coberto.ferista,
              descricao: `${coberto.ferista} (ferista) cobre as férias de ${nome}`,
            },
          }
        : {}),
    });
  }
  return celulas;
}
