import { asc, eq } from "drizzle-orm";

import { getDb } from "./index";
import { documentosPessoa, efetivo, tiposDocumento } from "./schema";
import type { DocumentoPessoa, Efetivo, TipoDocumento } from "./schema";
import {
  avaliarDocumento,
  STATUS_PENDENTES,
  type AvaliacaoDocumento,
  type EquipeEfetivo,
  type FormaDocumento,
  type GrupoDocumento,
  type StatusDocumento,
} from "../lib/gestao";

/**
 * Catálogo inicial: as colunas da planilha "Controle de documentos digitais".
 * A validade fica em branco de propósito: ela é preenchida na tela de
 * catálogo. A CNH já vem com a data de vencimento, então funciona sem validade.
 */
export const CATALOGO_INICIAL: readonly {
  codigo: string;
  nome: string;
  grupo: GrupoDocumento;
  forma: FormaDocumento;
}[] = [
  { codigo: "FORMACAO", nome: "Formação", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "CAP_BA", nome: "CAP BA", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "CBA_AT", nome: "CBA AT", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "CBA_CE", nome: "CBA CE", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "CBA_MC", nome: "CBA MC", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "CNH", nome: "CNH", grupo: "TECNICA", forma: "VENCIMENTO" },
  { codigo: "CVE", nome: "CVE", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "X6", nome: "X6", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "PS", nome: "P.S", grupo: "TECNICA", forma: "REALIZACAO" },
  { codigo: "APAM", nome: "APAM", grupo: "CCR", forma: "REALIZACAO" },
  { codigo: "AVSEC", nome: "AVSEC", grupo: "CCR", forma: "REALIZACAO" },
  { codigo: "CVA", nome: "CVA", grupo: "CCR", forma: "REALIZACAO" },
  { codigo: "SGSO", nome: "SGSO", grupo: "CCR", forma: "REALIZACAO" },
  { codigo: "INTEGRACAO", nome: "Integração", grupo: "CCR", forma: "REALIZACAO" },
  { codigo: "RISCO_FAUNA", nome: "Risco fauna", grupo: "CCR", forma: "REALIZACAO" },
  { codigo: "NR6", nome: "NR 6", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR10", nome: "NR 10", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR12", nome: "NR 12", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR17", nome: "NR 17", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR18", nome: "NR 18", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR20", nome: "NR 20", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR20II", nome: "NR 20 II", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR23", nome: "NR 23", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR32", nome: "NR 32", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR33", nome: "NR 33", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "NR35", nome: "NR 35", grupo: "MEDMAIS", forma: "REALIZACAO" },
  { codigo: "CADASTRO", nome: "Cadastro", grupo: "RH", forma: "ENTREGA" },
  { codigo: "ASO_ADMISSIONAL", nome: "ASO admissional", grupo: "RH", forma: "ENTREGA" },
  { codigo: "CTPS", nome: "CTPS", grupo: "RH", forma: "ENTREGA" },
  { codigo: "ASO_VIGENTE", nome: "ASO vigente", grupo: "RH", forma: "ENTREGA" },
  { codigo: "BPC_FORMACAO", nome: "BPC formação", grupo: "RH", forma: "ENTREGA" },
  { codigo: "BPC_ATUALIZACAO", nome: "BPC atualização", grupo: "RH", forma: "ENTREGA" },
  { codigo: "COMPROVANTE_RESIDENCIA", nome: "Comprovante de residência", grupo: "RH", forma: "ENTREGA" },
  { codigo: "ESCOLARIDADE", nome: "Escolaridade", grupo: "RH", forma: "ENTREGA" },
  { codigo: "FICHA_EPI", nome: "Ficha de EPI", grupo: "RH", forma: "ENTREGA" },
];

/** Cria os tipos do catálogo que ainda não existem. Não mexe nos já editados. */
export async function semearTiposDocumento() {
  const db = getDb();
  const existentes = await db.select({ codigo: tiposDocumento.codigo }).from(tiposDocumento);
  const jaTem = new Set(existentes.map((t) => t.codigo));
  const faltando = CATALOGO_INICIAL.map((tipo, ordem) => ({ ...tipo, ordem })).filter(
    (tipo) => !jaTem.has(tipo.codigo),
  );
  if (faltando.length > 0) await db.insert(tiposDocumento).values(faltando);
}

export async function listarEfetivo(): Promise<Efetivo[]> {
  return getDb().select().from(efetivo).orderBy(asc(efetivo.nome));
}

export async function listarTiposDocumento(): Promise<TipoDocumento[]> {
  return getDb()
    .select()
    .from(tiposDocumento)
    .orderBy(asc(tiposDocumento.ordem), asc(tiposDocumento.nome));
}

export type CelulaDocumento = {
  tipo: TipoDocumento;
  registro: DocumentoPessoa | null;
  avaliacao: AvaliacaoDocumento;
};

export type LinhaDocumentos = {
  pessoa: Efetivo;
  celulas: CelulaDocumento[];
  pendentes: number;
};

export type QuadroDocumentos = {
  tipos: TipoDocumento[];
  linhas: LinhaDocumentos[];
  contagem: Record<StatusDocumento, number>;
};

export function hojeISO(): string {
  // Data de Brasília, para o vencimento virar no dia certo.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/**
 * Monta o quadro de documentos: uma linha por pessoa e uma célula por tipo,
 * já com a situação calculada. Só entra quem está ativo: afastados e
 * desligados não aparecem nem contam, até voltarem ao trabalho. A ficha de
 * uma pessoa (efetivoId) mostra qualquer situação.
 */
export async function montarQuadroDocumentos(filtro: {
  equipe?: EquipeEfetivo | null;
  efetivoId?: number;
} = {}): Promise<QuadroDocumentos> {
  await semearTiposDocumento();
  const db = getDb();
  const [pessoas, tipos, registros] = await Promise.all([
    listarEfetivo(),
    listarTiposDocumento(),
    filtro.efetivoId
      ? db.select().from(documentosPessoa).where(eq(documentosPessoa.efetivoId, filtro.efetivoId))
      : db.select().from(documentosPessoa),
  ]);

  const tiposAtivos = tipos.filter((t) => t.ativo);
  const porChave = new Map(registros.map((r) => [`${r.efetivoId}|${r.tipoId}`, r]));
  const hoje = hojeISO();

  const contagem = Object.fromEntries(
    ["VENCIDO", "FALTA", "CONFERIR", "VENCE_30", "VENCE_90", "SEM_VALIDADE", "EM_DIA", "NAO_SE_APLICA"].map(
      (s) => [s, 0],
    ),
  ) as Record<StatusDocumento, number>;

  const linhas = pessoas
    .filter((p) => (filtro.efetivoId ? p.id === filtro.efetivoId : true))
    .filter((p) => filtro.efetivoId || p.situacao === "ATIVO")
    .filter((p) => !filtro.equipe || p.equipe === filtro.equipe)
    .map((pessoa) => {
      const celulas = tiposAtivos.map((tipo) => {
        const registro = porChave.get(`${pessoa.id}|${tipo.id}`) ?? null;
        const avaliacao = avaliarDocumento(
          {
            forma: tipo.forma,
            validadeMeses: tipo.validadeMeses,
            funcoesObrigatorias: tipo.funcoesObrigatorias,
          },
          registro ? { data: registro.data, situacao: registro.situacao } : null,
          pessoa.funcao,
          hoje,
        );
        if (pessoa.situacao === "ATIVO") contagem[avaliacao.status] += 1;
        return { tipo, registro, avaliacao };
      });
      const pendentes =
        pessoa.situacao === "ATIVO"
          ? celulas.filter((c) => STATUS_PENDENTES.includes(c.avaliacao.status)).length
          : 0;
      return { pessoa, celulas, pendentes };
    });

  return { tipos: tiposAtivos, linhas, contagem };
}
