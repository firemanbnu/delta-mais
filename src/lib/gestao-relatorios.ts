/**
 * Relatórios da documentação: leitura dos filtros da URL e seleção dos itens.
 *
 * Puro (sem banco), para ser testado. Recebe as linhas do quadro de
 * documentos, que já trazem só quem está ativo.
 */
import {
  EQUIPES_EFETIVO,
  FUNCOES_EFETIVO,
  GRUPOS_DOCUMENTO,
  STATUS_DOCUMENTO,
  STATUS_PENDENTES,
  compararNomes,
  type EquipeEfetivo,
  type GrupoDocumento,
  type StatusDocumento,
} from "./gestao";

export const MODELOS_RELATORIO = [
  "pendencias",
  "vencimentos",
  "situacao",
  "resumo",
  "documento",
  "individual",
] as const;
export type ModeloRelatorio = (typeof MODELOS_RELATORIO)[number];

export const ROTULO_MODELO: Record<ModeloRelatorio, string> = {
  pendencias: "Pendências",
  vencimentos: "Vencimentos no período",
  situacao: "Situação por pessoa (grade)",
  resumo: "Resumo por equipe",
  documento: "Por documento",
  individual: "Fichas individuais",
};

export const DESCRICAO_MODELO: Record<ModeloRelatorio, string> = {
  pendencias: "Quem tem documento vencido, faltando, vencendo ou para conferir, pessoa por pessoa.",
  vencimentos: "Documentos que vencem entre duas datas, do mais próximo ao mais distante.",
  situacao: "Grade com todas as pessoas e documentos, com a situação de cada um (folha deitada).",
  resumo: "Números e barras por equipe e por categoria de documento.",
  documento: "Para cada documento, quem está em dia, vencendo, vencido ou faltando.",
  individual: "Uma ficha por pessoa com todos os documentos, uma por página.",
};

export type FiltrosRelatorio = {
  modelo: ModeloRelatorio;
  equipe: EquipeEfetivo | null;
  grupo: GrupoDocumento | null;
  tipoId: number | null;
  funcao: string | null;
  pessoaId: number | null;
  /** Situações escolhidas; vazio = padrão do modelo. */
  status: StatusDocumento[];
  de: string | null;
  ate: string | null;
};

type Busca = Record<string, string | string[] | undefined>;

function um(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function lista(valor: string | string[] | undefined): string[] {
  if (!valor) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function dataValida(valor: string | undefined): string | null {
  return valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
}

function inteiro(valor: string | undefined): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Lê os filtros da URL, ignorando o que não for válido. */
export function lerFiltros(busca: Busca): FiltrosRelatorio {
  const modelo = um(busca.modelo);
  const equipe = um(busca.equipe);
  const grupo = um(busca.grupo);
  const funcao = um(busca.funcao);
  return {
    modelo: MODELOS_RELATORIO.includes(modelo as ModeloRelatorio)
      ? (modelo as ModeloRelatorio)
      : "pendencias",
    equipe: EQUIPES_EFETIVO.includes(equipe as EquipeEfetivo) ? (equipe as EquipeEfetivo) : null,
    grupo: GRUPOS_DOCUMENTO.includes(grupo as GrupoDocumento) ? (grupo as GrupoDocumento) : null,
    tipoId: inteiro(um(busca.tipo)),
    funcao: FUNCOES_EFETIVO.includes(funcao as (typeof FUNCOES_EFETIVO)[number]) ? funcao! : null,
    pessoaId: inteiro(um(busca.pessoa)),
    status: lista(busca.status).filter((s): s is StatusDocumento =>
      STATUS_DOCUMENTO.includes(s as StatusDocumento),
    ),
    de: dataValida(um(busca.de)),
    ate: dataValida(um(busca.ate)),
  };
}

/** Soma dias a uma data "AAAA-MM-DD". */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Situações que o modelo mostra quando nenhuma foi marcada. */
export function statusPadrao(modelo: ModeloRelatorio): readonly StatusDocumento[] {
  switch (modelo) {
    case "pendencias":
      return STATUS_PENDENTES;
    case "vencimentos":
      return ["VENCIDO", "VENCE_30", "VENCE_90", "EM_DIA"];
    default:
      return STATUS_DOCUMENTO.filter((s) => s !== "NAO_SE_APLICA");
  }
}

/** Período padrão de vencimentos: de hoje a 90 dias. */
export function periodo(filtros: FiltrosRelatorio, hoje: string): { de: string; ate: string } {
  const de = filtros.de ?? hoje;
  const ate = filtros.ate ?? somarDias(de, 90);
  return de <= ate ? { de, ate } : { de: ate, ate: de };
}

// Formato mínimo do quadro que os relatórios usam.
export type PessoaRelatorio = {
  id: number;
  nome: string;
  equipe: EquipeEfetivo | null;
  funcao: string | null;
};
export type TipoRelatorio = { id: number; nome: string; grupo: GrupoDocumento };
export type CelulaRelatorio = {
  tipo: TipoRelatorio;
  registro: { data: string | null; observacao?: string | null } | null;
  avaliacao: { status: StatusDocumento; vencimento: string | null; dias: number | null };
};
export type LinhaRelatorio<P extends PessoaRelatorio = PessoaRelatorio, C extends CelulaRelatorio = CelulaRelatorio> = {
  pessoa: P;
  celulas: C[];
};

/** Aplica pessoa, função, categoria e documento (não mexe nas situações). */
export function recortar<L extends LinhaRelatorio>(linhas: readonly L[], filtros: FiltrosRelatorio): L[] {
  return linhas
    .filter((l) => !filtros.equipe || l.pessoa.equipe === filtros.equipe)
    .filter((l) => !filtros.funcao || l.pessoa.funcao === filtros.funcao)
    .filter((l) => !filtros.pessoaId || l.pessoa.id === filtros.pessoaId)
    .map(
      (l): L => ({
        ...l,
        celulas: l.celulas.filter(
          (c) =>
            (!filtros.grupo || c.tipo.grupo === filtros.grupo) &&
            (!filtros.tipoId || c.tipo.id === filtros.tipoId),
        ),
      }),
    )
    .sort((a, b) => compararNomes(a.pessoa.nome, b.pessoa.nome));
}

export type ItemRelatorio<P extends PessoaRelatorio, C extends CelulaRelatorio> = {
  pessoa: P;
  celula: C;
};

const GRAVIDADE: readonly StatusDocumento[] = [
  "VENCIDO",
  "FALTA",
  "VENCE_30",
  "CONFERIR",
  "VENCE_90",
  "SEM_VALIDADE",
  "EM_DIA",
  "NAO_SE_APLICA",
];

export function ordemGravidade(s: StatusDocumento): number {
  return GRAVIDADE.indexOf(s);
}

/** Pendências: por pessoa (só quem tem algo), itens do mais grave ao mais leve. */
export function relatorioPendencias<P extends PessoaRelatorio, C extends CelulaRelatorio>(
  linhas: readonly LinhaRelatorio<P, C>[],
  status: readonly StatusDocumento[],
): { pessoa: P; itens: C[] }[] {
  return linhas
    .map((l) => ({
      pessoa: l.pessoa,
      itens: l.celulas
        .filter((c) => status.includes(c.avaliacao.status))
        .sort(
          (a, b) =>
            ordemGravidade(a.avaliacao.status) - ordemGravidade(b.avaliacao.status) ||
            (a.avaliacao.dias ?? 0) - (b.avaliacao.dias ?? 0),
        ),
    }))
    .filter((p) => p.itens.length > 0);
}

/** Vencimentos entre duas datas, do mais próximo ao mais distante. */
export function relatorioVencimentos<P extends PessoaRelatorio, C extends CelulaRelatorio>(
  linhas: readonly LinhaRelatorio<P, C>[],
  status: readonly StatusDocumento[],
  de: string,
  ate: string,
): ItemRelatorio<P, C>[] {
  return linhas
    .flatMap((l) => l.celulas.map((celula) => ({ pessoa: l.pessoa, celula })))
    .filter(
      ({ celula }) =>
        status.includes(celula.avaliacao.status) &&
        celula.avaliacao.vencimento !== null &&
        celula.avaliacao.vencimento >= de &&
        celula.avaliacao.vencimento <= ate,
    )
    .sort(
      (a, b) =>
        a.celula.avaliacao.vencimento!.localeCompare(b.celula.avaliacao.vencimento!) ||
        compararNomes(a.pessoa.nome, b.pessoa.nome),
    );
}

/** Por documento: para cada tipo, as pessoas agrupadas pela situação. */
export function relatorioPorDocumento<P extends PessoaRelatorio, C extends CelulaRelatorio>(
  linhas: readonly LinhaRelatorio<P, C>[],
  tipos: readonly TipoRelatorio[],
  status: readonly StatusDocumento[],
): { tipo: TipoRelatorio; grupos: { status: StatusDocumento; itens: ItemRelatorio<P, C>[] }[] }[] {
  return tipos
    .map((tipo) => {
      const itens = linhas.flatMap((l) =>
        l.celulas
          .filter((c) => c.tipo.id === tipo.id && status.includes(c.avaliacao.status))
          .map((celula) => ({ pessoa: l.pessoa, celula })),
      );
      const grupos = GRAVIDADE.filter((s) => status.includes(s))
        .map((s) => ({ status: s, itens: itens.filter((i) => i.celula.avaliacao.status === s) }))
        .filter((g) => g.itens.length > 0);
      return { tipo, grupos };
    })
    .filter((d) => d.grupos.length > 0);
}

/** Grade: só pessoas com ao menos uma célula nas situações escolhidas. */
export function relatorioSituacao<L extends LinhaRelatorio>(
  linhas: readonly L[],
  status: readonly StatusDocumento[],
  todas: boolean,
): L[] {
  if (todas) return [...linhas];
  return linhas.filter((l) => l.celulas.some((c) => status.includes(c.avaliacao.status)));
}
