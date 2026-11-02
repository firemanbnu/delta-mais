/**
 * Regras da área de Gestão: efetivo de todas as equipes e controle de
 * vencimento e entrega de documentos.
 *
 * Tudo aqui é puro (sem banco), para poder ser testado e usado na tela.
 */

export const EQUIPES_EFETIVO = [
  "ALFA",
  "BRAVO",
  "CHARLIE",
  "DELTA",
  "FERISTA",
  "EMBAIXADOR",
] as const;
export type EquipeEfetivo = (typeof EQUIPES_EFETIVO)[number];

export const ROTULO_EQUIPE: Record<EquipeEfetivo, string> = {
  ALFA: "Alfa",
  BRAVO: "Bravo",
  CHARLIE: "Charlie",
  DELTA: "Delta",
  FERISTA: "Ferista",
  EMBAIXADOR: "Embaixador",
};

/** Funções como aparecem no SCI NVT. */
export const FUNCOES_EFETIVO = ["BA-CE", "BA-LR", "BA-MC", "BA-RE", "BA-2", "OC", "GS"] as const;
export type FuncaoEfetivo = (typeof FUNCOES_EFETIVO)[number];

export const SITUACOES_EFETIVO = ["ATIVO", "AFASTADO", "DESLIGADO"] as const;
export type SituacaoEfetivo = (typeof SITUACOES_EFETIVO)[number];

export const ROTULO_SITUACAO_EFETIVO: Record<SituacaoEfetivo, string> = {
  ATIVO: "Ativo",
  AFASTADO: "Afastado",
  DESLIGADO: "Desligado",
};

export const GRUPOS_DOCUMENTO = ["TECNICA", "CCR", "MEDMAIS", "RH"] as const;
export type GrupoDocumento = (typeof GRUPOS_DOCUMENTO)[number];

export const ROTULO_GRUPO: Record<GrupoDocumento, string> = {
  TECNICA: "Documentação técnica",
  CCR: "Cursos internos CCR",
  MEDMAIS: "Cursos Medmais",
  RH: "Recursos humanos",
};

/**
 * Como a data do documento é lida:
 * - REALIZACAO: a data é quando foi feito; o vencimento soma a validade.
 * - VENCIMENTO: a data já é o vencimento (CNH, por exemplo).
 * - ENTREGA: não tem data; só importa se foi entregue.
 */
export const FORMAS_DOCUMENTO = ["REALIZACAO", "VENCIMENTO", "ENTREGA"] as const;
export type FormaDocumento = (typeof FORMAS_DOCUMENTO)[number];

export const ROTULO_FORMA: Record<FormaDocumento, string> = {
  REALIZACAO: "Data de realização + validade",
  VENCIMENTO: "Data de vencimento",
  ENTREGA: "Só entrega",
};

/** O que foi registrado para o documento de uma pessoa. */
export const SITUACOES_DOCUMENTO = [
  "ENTREGUE",
  "FALTA",
  "DESATUALIZADO",
  "NAO_POSSUI",
  "NAO_SE_APLICA",
  "CONFERIR",
] as const;
export type SituacaoDocumento = (typeof SITUACOES_DOCUMENTO)[number];

export const ROTULO_SITUACAO_DOCUMENTO: Record<SituacaoDocumento, string> = {
  ENTREGUE: "Entregue",
  FALTA: "Falta",
  DESATUALIZADO: "Desatualizado",
  NAO_POSSUI: "Não possui",
  NAO_SE_APLICA: "Não se aplica",
  CONFERIR: "Conferir",
};

/** Situação calculada que a tela mostra, já com o vencimento. */
export const STATUS_DOCUMENTO = [
  "VENCIDO",
  "FALTA",
  "CONFERIR",
  "VENCE_30",
  "VENCE_90",
  "SEM_VALIDADE",
  "EM_DIA",
  "NAO_SE_APLICA",
] as const;
export type StatusDocumento = (typeof STATUS_DOCUMENTO)[number];

export const ROTULO_STATUS: Record<StatusDocumento, string> = {
  VENCIDO: "Vencido",
  FALTA: "Falta",
  CONFERIR: "Conferir",
  VENCE_30: "Vence em até 30 dias",
  VENCE_90: "Vence em até 90 dias",
  SEM_VALIDADE: "Validade não definida",
  EM_DIA: "Em dia",
  NAO_SE_APLICA: "Não se aplica",
};

/** Status que exigem alguma ação: entram em pendências e nos contadores. */
export const STATUS_PENDENTES: readonly StatusDocumento[] = [
  "VENCIDO",
  "FALTA",
  "CONFERIR",
  "VENCE_30",
  "VENCE_90",
];

export type TipoDocumentoRegra = {
  forma: FormaDocumento;
  validadeMeses: number | null;
  /** Funções que precisam do documento. Vazio = todas. */
  funcoesObrigatorias: readonly string[];
};

export type RegistroDocumento = {
  data: string | null;
  situacao: SituacaoDocumento;
};

export type AvaliacaoDocumento = {
  status: StatusDocumento;
  /** Vencimento em "AAAA-MM-DD", quando dá para calcular. */
  vencimento: string | null;
  /** Dias até o vencimento (negativo se já venceu). */
  dias: number | null;
};

/** Soma meses a uma data ISO, ajustando para o último dia do mês quando preciso. */
export function somarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(dia, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

function diasEntre(deISO: string, ateISO: string): number {
  const de = Date.parse(`${deISO}T00:00:00Z`);
  const ate = Date.parse(`${ateISO}T00:00:00Z`);
  return Math.round((ate - de) / 86_400_000);
}

export function documentoExigido(tipo: TipoDocumentoRegra, funcao: string | null): boolean {
  if (tipo.funcoesObrigatorias.length === 0) return true;
  return funcao !== null && tipo.funcoesObrigatorias.includes(funcao);
}

/**
 * Situação de um documento de uma pessoa na data `hojeISO`.
 *
 * Sem registro conta como falta, a não ser que o documento não seja exigido
 * para a função da pessoa.
 */
export function avaliarDocumento(
  tipo: TipoDocumentoRegra,
  registro: RegistroDocumento | null,
  funcao: string | null,
  hojeISO: string,
): AvaliacaoDocumento {
  const vazio = { vencimento: null, dias: null };

  if (registro?.situacao === "NAO_SE_APLICA") return { status: "NAO_SE_APLICA", ...vazio };
  if (!registro) {
    return { status: documentoExigido(tipo, funcao) ? "FALTA" : "NAO_SE_APLICA", ...vazio };
  }
  if (registro.situacao === "CONFERIR") return { status: "CONFERIR", ...vazio };
  if (registro.situacao === "FALTA" || registro.situacao === "NAO_POSSUI") {
    return { status: documentoExigido(tipo, funcao) ? "FALTA" : "NAO_SE_APLICA", ...vazio };
  }
  if (registro.situacao === "DESATUALIZADO") return { status: "VENCIDO", ...vazio };

  // Entregue.
  if (tipo.forma === "ENTREGA") return { status: "EM_DIA", ...vazio };
  if (!registro.data) return { status: "CONFERIR", ...vazio };

  const vencimento =
    tipo.forma === "VENCIMENTO"
      ? registro.data
      : tipo.validadeMeses
        ? somarMeses(registro.data, tipo.validadeMeses)
        : null;

  if (!vencimento) return { status: "SEM_VALIDADE", ...vazio };

  const dias = diasEntre(hojeISO, vencimento);
  const status: StatusDocumento =
    dias < 0 ? "VENCIDO" : dias <= 30 ? "VENCE_30" : dias <= 90 ? "VENCE_90" : "EM_DIA";
  return { status, vencimento, dias };
}

/** Classes de cor de cada status (fundo + texto), iguais na grade e na ficha. */
export const COR_STATUS: Record<StatusDocumento, string> = {
  VENCIDO: "bg-red-500/20 text-red-700 dark:text-red-300",
  FALTA: "bg-red-500/10 text-red-700 dark:text-red-300",
  CONFERIR: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  VENCE_30: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  VENCE_90: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  SEM_VALIDADE: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  EM_DIA: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  NAO_SE_APLICA: "text-muted-foreground",
};
