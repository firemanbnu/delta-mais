export const FUNCOES = ["CE", "LR", "MC", "BA", "RE"] as const;
export type Funcao = (typeof FUNCOES)[number];

export const GRUPOS_POSTO = ["MC", "BA_RE", "FIXO"] as const;
export type GrupoPosto = (typeof GRUPOS_POSTO)[number];

export const UNIDADES = ["F2", "F3", "CRS"] as const;
export type Unidade = (typeof UNIDADES)[number];

export const TIPOS_AUSENCIA = [
  "FERIAS",
  "ATESTADO",
  "DISPENSA",
] as const;
export type TipoAusencia = (typeof TIPOS_AUSENCIA)[number];

export const ROTULOS_AUSENCIA: Record<TipoAusencia, string> = {
  FERIAS: "Férias",
  ATESTADO: "Atestado",
  DISPENSA: "Dispensa",
};

export type DefinicaoPosto = {
  codigo: string;
  unidade: Unidade;
  rotulo: string;
  grupo: GrupoPosto;
  posicaoNoCiclo: number | null;
  ordem: number;
  comunicacao: boolean;
  funcoes: readonly Funcao[];
};

/**
 * As 10 vagas do plantão noturno.
 *
 * A rotação é feita dentro de dois ciclos independentes:
 *  - grupo MC    -> 3 vagas, ciclo de 3 meses (F2-MC -> F3-MC -> CRS-MC)
 *  - grupo BA_RE -> 5 vagas, ciclo de 5 meses
 *      (F2-BA -> F3-BA1 -> F3-BA2 -> CRS-RE1 -> CRS-RE2)
 *
 * O grupo FIXO nunca sai do lugar: o CE fica no F2 e o LR fica no CRS.
 */
export const POSTOS_PADRAO: DefinicaoPosto[] = [
  {
    codigo: "F2-MC",
    unidade: "F2",
    rotulo: "MC",
    grupo: "MC",
    posicaoNoCiclo: 0,
    ordem: 0,
    comunicacao: false,
    funcoes: ["MC"],
  },
  {
    codigo: "F2-CE",
    unidade: "F2",
    rotulo: "CE",
    grupo: "FIXO",
    posicaoNoCiclo: null,
    ordem: 1,
    comunicacao: false,
    funcoes: ["CE"],
  },
  {
    codigo: "F2-BA",
    unidade: "F2",
    rotulo: "BA",
    grupo: "BA_RE",
    posicaoNoCiclo: 0,
    ordem: 2,
    comunicacao: false,
    funcoes: ["BA", "RE"],
  },
  {
    codigo: "F3-MC",
    unidade: "F3",
    rotulo: "MC",
    grupo: "MC",
    posicaoNoCiclo: 1,
    ordem: 3,
    comunicacao: false,
    funcoes: ["MC"],
  },
  {
    codigo: "F3-BA1",
    unidade: "F3",
    rotulo: "BA 1",
    grupo: "BA_RE",
    posicaoNoCiclo: 1,
    ordem: 4,
    comunicacao: false,
    funcoes: ["BA", "RE"],
  },
  {
    codigo: "F3-BA2",
    unidade: "F3",
    rotulo: "BA 2",
    grupo: "BA_RE",
    posicaoNoCiclo: 2,
    ordem: 5,
    comunicacao: true,
    funcoes: ["BA", "RE"],
  },
  {
    codigo: "CRS-MC",
    unidade: "CRS",
    rotulo: "MC",
    grupo: "MC",
    posicaoNoCiclo: 2,
    ordem: 6,
    comunicacao: false,
    funcoes: ["MC"],
  },
  {
    codigo: "CRS-LR",
    unidade: "CRS",
    rotulo: "LR",
    grupo: "FIXO",
    posicaoNoCiclo: null,
    ordem: 7,
    comunicacao: false,
    funcoes: ["LR"],
  },
  {
    codigo: "CRS-RE1",
    unidade: "CRS",
    rotulo: "RE 1",
    grupo: "BA_RE",
    posicaoNoCiclo: 3,
    ordem: 8,
    comunicacao: false,
    funcoes: ["BA", "RE"],
  },
  {
    codigo: "CRS-RE2",
    unidade: "CRS",
    rotulo: "RE 2",
    grupo: "BA_RE",
    posicaoNoCiclo: 4,
    ordem: 9,
    comunicacao: false,
    funcoes: ["BA", "RE"],
  },
];

export const GRUPOS_RODANTES = ["MC", "BA_RE"] as const;

export const ROTULO_GRUPO: Record<GrupoPosto, string> = {
  MC: "MC",
  BA_RE: "BA / RE",
  FIXO: "Posto fixo",
};

export const ROTULO_UNIDADE: Record<Unidade, string> = {
  F2: "Viatura F2",
  F3: "Viatura F3",
  CRS: "Viatura CRS",
};

export function aceitoNoPosto(
  funcao: Funcao,
  posto: Pick<DefinicaoPosto, "funcoes">,
): boolean {
  return posto.funcoes.includes(funcao);
}

/** Funções que o grupo inteiro comporta (usado em filtros e na UI). */
export const FUNCOES_DO_GRUPO: Record<GrupoPosto, readonly Funcao[]> = {
  MC: ["MC"],
  BA_RE: ["BA", "RE"],
  FIXO: ["CE", "LR"],
};
