/**
 * CSV no formato que o Excel em português abre sem configuração: separador ";",
 * BOM UTF-8 e quebras CRLF.
 */
const SEPARADOR = ";";
const BOM = "\uFEFF";

export type CampoCsv = string | number | null | undefined;

/** Coloca entre aspas o que tem separador, aspas ou quebra de linha. */
export function campoCsv(valor: CampoCsv): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function linhaCsv(campos: CampoCsv[]): string {
  return campos.map(campoCsv).join(SEPARADOR);
}

export function montarCsv(cabecalhos: CampoCsv[], linhas: CampoCsv[][]): string {
  const corpo = [linhaCsv(cabecalhos), ...linhas.map(linhaCsv)].join("\r\n");
  return `${BOM}${corpo}\r\n`;
}