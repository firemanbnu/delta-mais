/**
 * Números do painel da Gestão, calculados a partir do quadro de documentos.
 *
 * Puro (sem banco), para ser testado. O quadro já vem só com quem está ativo.
 */
import {
  EQUIPES_EFETIVO,
  GRUPOS_DOCUMENTO,
  type EquipeEfetivo,
  type GrupoDocumento,
  type StatusDocumento,
} from "./gestao";

/** Ordem das faixas nas barras empilhadas: do bom para o ruim. */
export const ORDEM_FAIXAS: readonly StatusDocumento[] = [
  "EM_DIA",
  "SEM_VALIDADE",
  "VENCE_90",
  "VENCE_30",
  "CONFERIR",
  "FALTA",
  "VENCIDO",
];

export type Distribuicao = Record<StatusDocumento, number>;

/** O mínimo do quadro que o painel usa. */
export type LinhaPainel = {
  pessoa: { id: number; nome: string; nomeGuerra: string | null; equipe: EquipeEfetivo | null };
  celulas: {
    tipo: { id: number; nome: string; grupo: GrupoDocumento };
    avaliacao: { status: StatusDocumento; vencimento: string | null; dias: number | null };
  }[];
};

export type Painel = {
  pessoas: number;
  geral: Distribuicao;
  /** Documentos exigidos (tudo menos "não se aplica"). */
  exigidos: number;
  /** % dos exigidos que valem hoje (não vencidos, não faltando, nada a conferir). */
  conformidade: number;
  porEquipe: { equipe: EquipeEfetivo; pessoas: number; dist: Distribuicao; conformidade: number }[];
  porGrupo: { grupo: GrupoDocumento; dist: Distribuicao; conformidade: number }[];
  atencao: {
    id: number;
    nome: string;
    equipe: EquipeEfetivo | null;
    vencidos: number;
    faltas: number;
    vencendo: number;
  }[];
  proximos: {
    id: number;
    nome: string;
    documento: string;
    vencimento: string;
    dias: number;
  }[];
  documentosCriticos: { nome: string; vencidos: number; faltas: number }[];
};

function vazia(): Distribuicao {
  return {
    VENCIDO: 0,
    FALTA: 0,
    CONFERIR: 0,
    VENCE_30: 0,
    VENCE_90: 0,
    SEM_VALIDADE: 0,
    EM_DIA: 0,
    NAO_SE_APLICA: 0,
  };
}

export function totalExigido(d: Distribuicao): number {
  return ORDEM_FAIXAS.reduce((soma, s) => soma + d[s], 0);
}

/** % dos exigidos que valem hoje: tudo menos vencido, falta e conferir. */
export function percentualEmDia(d: Distribuicao): number {
  const total = totalExigido(d);
  if (total === 0) return 0;
  const ok = total - d.VENCIDO - d.FALTA - d.CONFERIR;
  return Math.round((ok / total) * 100);
}

export function montarPainel(linhas: readonly LinhaPainel[], limite = 10): Painel {
  const geral = vazia();
  const equipes = new Map<EquipeEfetivo, { pessoas: number; dist: Distribuicao }>();
  const grupos = new Map<GrupoDocumento, Distribuicao>();
  const criticos = new Map<string, { vencidos: number; faltas: number }>();
  const atencao: Painel["atencao"] = [];
  const proximos: Painel["proximos"] = [];

  for (const linha of linhas) {
    const { pessoa } = linha;
    const eq = pessoa.equipe ? equipes.get(pessoa.equipe) ?? { pessoas: 0, dist: vazia() } : null;
    if (eq && pessoa.equipe) {
      eq.pessoas += 1;
      equipes.set(pessoa.equipe, eq);
    }
    let vencidos = 0;
    let faltas = 0;
    let vencendo = 0;

    for (const { tipo, avaliacao } of linha.celulas) {
      const s = avaliacao.status;
      geral[s] += 1;
      if (eq) eq.dist[s] += 1;
      const g = grupos.get(tipo.grupo) ?? vazia();
      g[s] += 1;
      grupos.set(tipo.grupo, g);

      if (s === "VENCIDO") vencidos += 1;
      if (s === "FALTA") faltas += 1;
      if (s === "VENCE_30") vencendo += 1;
      if (s === "VENCIDO" || s === "FALTA") {
        const c = criticos.get(tipo.nome) ?? { vencidos: 0, faltas: 0 };
        if (s === "VENCIDO") c.vencidos += 1;
        else c.faltas += 1;
        criticos.set(tipo.nome, c);
      }
      if ((s === "VENCE_30" || s === "VENCE_90") && avaliacao.vencimento && avaliacao.dias !== null) {
        proximos.push({
          id: pessoa.id,
          nome: pessoa.nome,
          documento: tipo.nome,
          vencimento: avaliacao.vencimento,
          dias: avaliacao.dias,
        });
      }
    }
    if (vencidos + faltas + vencendo > 0) {
      atencao.push({
        id: pessoa.id,
        nome: pessoa.nome,
        equipe: pessoa.equipe,
        vencidos,
        faltas,
        vencendo,
      });
    }
  }

  const exigidos = totalExigido(geral);
  return {
    pessoas: linhas.length,
    geral,
    exigidos,
    conformidade: percentualEmDia(geral),
    porEquipe: EQUIPES_EFETIVO.filter((e) => equipes.has(e)).map((equipe) => {
      const { pessoas, dist } = equipes.get(equipe)!;
      return { equipe, pessoas, dist, conformidade: percentualEmDia(dist) };
    }),
    porGrupo: GRUPOS_DOCUMENTO.filter((g) => grupos.has(g)).map((grupo) => {
      const dist = grupos.get(grupo)!;
      return { grupo, dist, conformidade: percentualEmDia(dist) };
    }),
    atencao: atencao
      .sort(
        (a, b) =>
          b.vencidos + b.faltas + b.vencendo - (a.vencidos + a.faltas + a.vencendo) ||
          b.vencidos - a.vencidos ||
          a.nome.localeCompare(b.nome),
      )
      .slice(0, limite),
    proximos: proximos.sort((a, b) => a.dias - b.dias || a.nome.localeCompare(b.nome)).slice(0, limite),
    documentosCriticos: [...criticos.entries()]
      .map(([nome, c]) => ({ nome, ...c }))
      .sort((a, b) => b.vencidos + b.faltas - (a.vencidos + a.faltas) || a.nome.localeCompare(b.nome))
      .slice(0, 8),
  };
}
