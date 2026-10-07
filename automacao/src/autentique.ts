import type { Page } from "playwright-core";

import { agruparPalavrasEmLinhas, type LinhaDoDocumento } from "../../src/lib/automacao";

/**
 * Seletores do editor de posicionamento do Autentique, centralizados aqui
 * para o caso de a interface mudar. Preenchidos/corrigidos na Etapa 2
 * (reconhecimento ao vivo); os valor abaixo são palpites iniciais a confirmar.
 */
export const SELETORES = {
  /** Palco onde o documento é renderizado (páginas). */
  palco: [
    '[class*="document-viewer"]',
    '[class*="documentViewer"]',
    '[class*="footer-container"] main',
    "main",
  ],
  /** Elemento de uma página do PDF (PDF.js usa canvases por página). */
  pagina: [
    '[class*="pdf-page"]',
    ".page",
    'div[role="main"] canvas',
    "canvas",
  ],
  /** Camada de texto do PDF.js: spans com o texto e a posição. */
  camadaDeTexto: [
    '[class*="text-layer"]',
    '.textLayer',
    '[class*="textLayer"]',
  ],
  /** Item arrastável na paleta (campo de assinatura/data por signatário). */
  campoDaPaleta: [
    '[draggable="true"]',
    '[class*="sig-field"]',
    '[class*="widget"]',
  ],
} as const;

async function primeiroSelector(
  pagina: Page,
  candidatos: readonly string[],
): Promise<string | null> {
  for (const seletor of candidatos) {
    const total = await pagina.locator(seletor).count();
    if (total > 0) return seletor;
  }
  return null;
}

export async function seletorDoPalco(pagina: Page): Promise<string | null> {
  return primeiroSelector(pagina, SELETORES.palco);
}

export async function seletorDaPagina(pagina: Page): Promise<string | null> {
  return primeiroSelector(pagina, SELETORES.pagina);
}

export async function seletorDaCamadaDeTexto(pagina: Page): Promise<string | null> {
  return primeiroSelector(pagina, SELETORES.camadaDeTexto);
}

/** Lista os signatários que aparecem na paleta do editor. */
export async function listarSignatarios(pagina: Page): Promise<string[]> {
  const texto = await pagina.evaluate(() => document.body.innerText);
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return [...new Set(linhas)];
}

type Palavra = { texto: string; x: number; y: number; largura: number; altura: number; pagina: number };

/** Lê a camada de texto do PDF.js e agrupa os spans em linhas do documento. */
export async function lerCamadaDeTexto(
  pagina: Page,
  paginaElemento: string,
): Promise<LinhaDoDocumento[]> {
  const palavras = await pagina.evaluate((seletorPagina) => {
    const alvos: Palavra[] = [];
    const camadas = Array.from(
      document.querySelectorAll<HTMLElement>('[class*="text-layer"], .textLayer'),
    );
    if (camadas.length === 0) return alvos;

    const paginas = Array.from(document.querySelectorAll<HTMLElement>(seletorPagina));
    camadas.forEach((camada, i) => {
      const ref = paginas[i] ?? camada;
      const rect = ref.getBoundingClientRect();
      camada.querySelectorAll<HTMLElement>("span, div").forEach((span) => {
        const r = span.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        alvos.push({
          texto: span.textContent?.trim() ?? "",
          x: r.left - rect.left,
          y: r.top - rect.top,
          largura: r.width,
          altura: r.height,
          pagina: i + 1,
        });
      });
    });
    return alvos;
  }, paginaElemento);

  return agruparPalavrasEmLinhas(palavras.filter((p) => p.texto.length > 0));
}

/** Dimensões renderizadas de cada página (intervalo do elemento no DOM). */
export async function dimensoesDasPaginas(
  pagina: Page,
  paginaElemento: string,
): Promise<{ largura: number; altura: number }[]> {
  const total = await pagina.locator(paginaElemento).count();
  if (total === 0) return [];
  return pagina.$$eval(paginaElemento, (els) =>
    els.map((el) => ({
      largura: el.getBoundingClientRect().width,
      altura: el.getBoundingClientRect().height,
    })),
  );
}

export async function estamosNoEditorDePosicionamento(pagina: Page): Promise<boolean> {
  const url = pagina.url();
  if (!url.includes("autentique")) return false;
  const palco = await seletorDoPalco(pagina);
  const paginaEl = await seletorDaPagina(pagina);
  return palco !== null && paginaEl !== null;
}

export type AlvoDeDrag = { x: number; y: number };

/**
 * Procura na página o elemento draggable que representa o campo. Assim que o
 * reconhecimento da Etapa 2 confirmar a estrutura real da paleta, a função
 * ganha uma forma de localizar o campo pelo nome do signatário e pelo tipo.
 */
export async function localizarCampoDaPaleta(pagina: Page, _campo: string) {
  for (const seletor of SELETORES.campoDaPaleta) {
    const elementos = pagina.locator(seletor);
    const total = await elementos.count();
    if (total === 0) continue;
    const visiveis = [];
    for (let i = 0; i < total; i++) {
      const el = elementos.nth(i);
      if (await el.isVisible()) visiveis.push(el);
    }
    if (visiveis.length > 0) return visiveis[0];
  }
  return null;
}

/**
 * Arrasta o primeiro campo da paleta até as coordenadas (x, y) em pixels.
 * Como a maioria dos apps usa DnD próprio via pointer events, a sequência de
 * mouse do Playwright normalmente basta; se o Autentique usar DnD nativo do
 * HTML5, trocamos por dragTo/eventos sintéticos após o reconhecimento.
 */
export async function arrastarCampo(
  pagina: Page,
  origem: AlvoDeDrag,
  alvo: AlvoDeDrag,
): Promise<void> {
  await pagina.mouse.move(origem.x, origem.y);
  await pagina.mouse.down();
  const passos = 12;
  for (let i = 1; i <= passos; i++) {
    const t = i / passos;
    await pagina.mouse.move(
      origem.x + (alvo.x - origem.x) * t,
      origem.y + (alvo.y - origem.y) * t,
    );
  }
  await pagina.mouse.up();
}

/** Centro do elemento arrastável em pixels de tela. */
export async function centroDoCampo(
  pagina: Page,
  elemento: ReturnType<Page["locator"]>,
): Promise<{ x: number; y: number }> {
  const caixa = await elemento.boundingBox();
  if (!caixa) throw new Error("Campo da paleta sem posição visível.");
  return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };
}

/** Ponto na página-alvo a partir do percentual da página. */
export async function pontoNaPagina(
  pagina: Page,
  paginaElemento: string,
  indice: number,
  xPct: number,
  yPct: number,
): Promise<{ x: number; y: number }> {
  const caixa = await pagina.locator(paginaElemento).nth(indice).boundingBox();
  if (!caixa) throw new Error(`Página ${indice + 1} sem posição visível.`);
  return {
    x: caixa.x + (caixa.width * xPct) / 100,
    y: caixa.y + (caixa.height * yPct) / 100,
  };
}