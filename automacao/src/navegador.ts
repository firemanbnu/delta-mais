import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright-core";

const DIRETORIO_PERFIL = path.join(process.cwd(), "..", ".data", "perfil-autentique");

type Estado = {
  contexto: BrowserContext | null;
  pagina: Page | null;
};

const estado: Estado = { contexto: null, pagina: null };

/**
 * Abre o Chrome do sistema (não baixa navegador) com um perfil persistente,
 * para o login no Autentique sobreviver entre execuções do agente.
 */
export async function abrirNavegador(): Promise<Page> {
  if (estado.contexto) {
    return estado.contexto.pages()[0] ?? (await estado.contexto.newPage());
  }

  estado.contexto = await chromium.launchPersistentContext(DIRETORIO_PERFIL, {
    channel: "chrome",
    headless: false,
    args: ["--start-maximized"],
  });

  const abas = estado.contexto.pages();
  const autentique = abas.find((aba) => aba.url().includes("autentique"));
  estado.pagina = autentique ?? abas[0] ?? (await estado.contexto.newPage());
  return estado.pagina;
}

export async function paginaAtiva(): Promise<Page | null> {
  if (!estado.contexto) return null;
  const abas = estado.contexto.pages();
  return abas[abas.length - 1] ?? null;
}

/** Página aberta no domínio do Autentique (se houver). */
export async function paginaAutentique(): Promise<Page | null> {
  if (!estado.contexto) return null;
  for (const aba of estado.contexto.pages()) {
    if (aba.url().includes("autentique")) return aba;
  }
  return null;
}

export function navegadorAberto(): boolean {
  return estado.contexto !== null;
}

export async function fecharNavegador(): Promise<void> {
  if (estado.contexto) await estado.contexto.close();
  estado.contexto = null;
  estado.pagina = null;
}
