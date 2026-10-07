import path from "node:path";

import type { Page } from "playwright-core";
import { createWorker } from "tesseract.js";

import { agruparPalavrasEmLinhas, type LinhaDoDocumento } from "../../src/lib/automacao";

const CACHE_OCR = path.join(process.cwd(), "..", ".data", "ocr");

/**
 * OCR de fallback: quando o PDF.js não expõe camada de texto no DOM, tira
 * print de cada página, reconhece o texto com padrão de português e agrupa as
 * palavras em linhas com coordenadas relativas à página.
 */
export async function reconhecerPorOcr(
  pagina: Page,
  paginaElemento: string,
  dimensoes: { largura: number; altura: number }[],
): Promise<LinhaDoDocumento[]> {
  const worker = await createWorker("por", 1, {
    cachePath: CACHE_OCR,
  });

  try {
    const linhas: LinhaDoDocumento[] = [];
    const total = dimensoes.length;
    for (let i = 0; i < total; i++) {
      const el = pagina.locator(paginaElemento).nth(i);
      const screenshot = await el.screenshot({ scale: "css" });
      const { data } = await worker.recognize(screenshot);
      const palavras = (data.blocks ?? [])
        .flatMap((bloco) => bloco.paragraphs)
        .flatMap((paragrafo) => paragrafo.lines)
        .flatMap((linha) => linha.words)
        .map((palavra) => ({
          texto: palavra.text.trim(),
          pagina: i + 1,
          x: palavra.bbox.x0,
          y: palavra.bbox.y0,
          largura: palavra.bbox.x1 - palavra.bbox.x0,
          altura: palavra.bbox.y1 - palavra.bbox.y0,
        }));
      linhas.push(...agruparPalavrasEmLinhas(palavras.filter((p) => p.texto.length > 0)));
    }
    return linhas;
  } finally {
    await worker.terminate();
  }
}