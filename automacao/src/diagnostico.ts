import fs from "node:fs/promises";
import path from "node:path";

import { abrirNavegador, fecharNavegador, paginaAtiva } from "./navegador";

const SAIDA = path.join(process.cwd(), "..", ".data", "diagnostico");

/**
 * Mapeia a interface do Autentique: despeja a área de texto visível, lista
 * candidatos a "campo arrastável" e tira um print. Rode com uma aba do editor
 * de posicionamento aberta no Chrome do agente.
 */
async function main(): Promise<void> {
  const pagina = await abrirNavegador();
  await pagina.bringToFront();
  await pagina.waitForTimeout(1500);

  await fs.mkdir(SAIDA, { recursive: true });
  const base = new Date().toISOString().replace(/[:.]/g, "-");

  await pagina.screenshot({ path: path.join(SAIDA, `${base}.png`), fullPage: false });

  const url = pagina.url();
  const titulo = await pagina.title();

  const texto = await pagina.evaluate(() => document.body.innerText);

  const arrastaveis = await pagina.$$eval('[draggable="true"]', (els) =>
    els.slice(0, 40).map((el) => ({
      texto: (el.textContent ?? "").trim().slice(0, 80),
      classe: (el as HTMLElement).className,
      tag: el.tagName,
      visivel: !!(el as HTMLElement).offsetWidth,
    })),
  );

  const seletorPalcoCandidato = [
    '[class*="text-layer"]',
    '[class*="textLayer"]',
    '[class*="pdf"]',
    "canvas",
    '[class*="page"]',
  ];

  const contexto = await pagina.evaluate((candidatos) => {
    const saída: Record<string, number> = {};
    for (const seletor of candidatos) {
      saída[seletor] = document.querySelectorAll(seletor).length;
    }
    return saída;
  }, seletorPalcoCandidato);

  const relatorio = {
    url,
    titulo,
    texto: texto.slice(0, 4000),
    arrastaveis,
    ocorrencias: contexto,
  };
  await fs.writeFile(path.join(SAIDA, `${base}.json`), JSON.stringify(relatorio, null, 2), "utf8");

  console.log(`URL: ${url}`);
  console.log(`Título: ${titulo}`);
  console.log("Ocorrências por seletor:", contexto);
  console.log(`Campos arrastáveis: ${arrastaveis.length}`);
  console.log(`Salvo em: ${SAIDA}`);

  await fecharNavegador();
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});