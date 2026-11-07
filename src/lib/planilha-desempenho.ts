import {
  COMPETENCIAS,
  classificar,
  classificarMedia,
  mediaGeral,
  notaDe,
  type Notas,
} from "./desempenho";
import { MODELO_AVALIACAO_XLSX_BASE64 } from "./modelos/avaliacao-desempenho-xlsx";
import { conteudo, escreverZip, lerZip, substituir } from "./zip";

/**
 * Preenche a planilha original da empresa ("Avaliação de desempenho 2026")
 * sem mexer em textos, formatação, fórmulas ou validações: só entram os nomes
 * (células amarelas de nome) e as notas (coluna E). Classificações e médias
 * continuam sendo fórmulas da planilha; gravamos também o valor já calculado
 * para quem abrir sem recalcular (pré-visualização do Drive, celular).
 */

/** Quantos blocos de colaborador a planilha tem. */
export const BLOCOS_PLANILHA = 12;
const PASSO_BLOCO = 29;
const LINHA_NOME = 17;
const LINHA_PRIMEIRO_ITEM = 19;
const LINHA_MEDIA = 42;
const LINHA_RESUMO = 4;

export type ColaboradorPlanilha = { nome: string; notas: Notas };

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function regexCelula(ref: string): RegExp {
  // <c r="E19" s="22"/>  ou  <c r="F19" s="23" t="str"><f ...>...</f><v/></c>
  return new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>(.*?)</c>)`);
}

function trocarCelula(xml: string, ref: string, montar: (attrs: string, interno: string) => string): string {
  const re = regexCelula(ref);
  const m = re.exec(xml);
  if (!m) throw new Error(`Célula ${ref} não encontrada no modelo.`);
  const attrs = m[1].replace(/\s+t="[^"]*"/, "");
  const interno = m[2] ?? "";
  return xml.slice(0, m.index) + montar(attrs, interno) + xml.slice(m.index + m[0].length);
}

function formula(interno: string): string {
  const m = /<f[^>]*?(?:\/>|>.*?<\/f>)/.exec(interno);
  return m ? m[0] : "";
}

function texto(ref: string, valor: string) {
  return (attrs: string) =>
    `<c r="${ref}"${attrs} t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
}

function numero(ref: string, valor: number) {
  return (attrs: string) => `<c r="${ref}"${attrs}><v>${valor}</v></c>`;
}

/** Mantém a fórmula e grava o resultado (texto ou número). */
function resultado(ref: string, valor: string | number | null) {
  return (attrs: string, interno: string) => {
    const f = formula(interno);
    if (valor === null || valor === "") return `<c r="${ref}"${attrs} t="str">${f}<v></v></c>`;
    if (typeof valor === "number") return `<c r="${ref}"${attrs}>${f}<v>${valor}</v></c>`;
    return `<c r="${ref}"${attrs} t="str">${f}<v>${escaparXml(valor)}</v></c>`;
  };
}

export function preencherAbaAvaliacao(xml: string, colaboradores: ColaboradorPlanilha[]): string {
  let saida = xml;
  colaboradores.forEach((col, i) => {
    const base = i * PASSO_BLOCO;
    saida = trocarCelula(saida, `C${LINHA_NOME + base}`, texto(`C${LINHA_NOME + base}`, col.nome));
    COMPETENCIAS.forEach((c, k) => {
      const linha = LINHA_PRIMEIRO_ITEM + base + k;
      const nota = notaDe(col.notas, c.numero);
      if (nota === null) return;
      saida = trocarCelula(saida, `E${linha}`, numero(`E${linha}`, nota));
      saida = trocarCelula(saida, `F${linha}`, resultado(`F${linha}`, classificar(nota)));
    });
    const media = mediaGeral(col.notas);
    const linhaMedia = LINHA_MEDIA + base;
    saida = trocarCelula(saida, `E${linhaMedia}`, resultado(`E${linhaMedia}`, media));
    saida = trocarCelula(saida, `F${linhaMedia}`, resultado(`F${linhaMedia}`, classificarMedia(media)));
  });
  return saida;
}

export function preencherAbaResumo(xml: string, colaboradores: ColaboradorPlanilha[]): string {
  let saida = xml;
  colaboradores.forEach((col, i) => {
    const linha = LINHA_RESUMO + i;
    const media = mediaGeral(col.notas);
    saida = trocarCelula(saida, `B${linha}`, resultado(`B${linha}`, col.nome));
    saida = trocarCelula(saida, `C${linha}`, resultado(`C${linha}`, media));
    saida = trocarCelula(saida, `D${linha}`, resultado(`D${linha}`, classificarMedia(media)));
  });
  return saida;
}

/** Pede ao Excel para recalcular tudo ao abrir. */
export function forcarRecalculo(workbookXml: string): string {
  if (/fullCalcOnLoad=/.test(workbookXml)) return workbookXml;
  return workbookXml.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
}

export function gerarPlanilhaDesempenho(colaboradores: ColaboradorPlanilha[]): Buffer {
  if (colaboradores.length > BLOCOS_PLANILHA) {
    throw new Error(
      `A planilha da empresa tem ${BLOCOS_PLANILHA} blocos; há ${colaboradores.length} pessoas para exportar.`,
    );
  }
  const entradas = lerZip(Buffer.from(MODELO_AVALIACAO_XLSX_BASE64, "base64"));
  return escreverZip(
    entradas.map((e) => {
      const alterar = (f: (xml: string) => string) =>
        substituir(e, Buffer.from(f(conteudo(e).toString("utf8")), "utf8"));
      switch (e.nome) {
        case "xl/worksheets/sheet1.xml":
          return alterar((xml) => preencherAbaAvaliacao(xml, colaboradores));
        case "xl/worksheets/sheet2.xml":
          return alterar((xml) => preencherAbaResumo(xml, colaboradores));
        case "xl/workbook.xml":
          return alterar(forcarRecalculo);
        default:
          return e;
      }
    }),
  );
}
