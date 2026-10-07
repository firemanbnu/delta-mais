import { z } from "zod";

/** Tipos de comando que a página pode enfileirar para o agente local. */
export const TIPOS_TAREFA = ["CONECTAR", "DETECTAR", "POSICIONAR", "FECHAR"] as const;
export const STATUS_TAREFA = ["PENDENTE", "EXECUTANDO", "CONCLUIDO", "FALHOU"] as const;
export const CAMPOS_AUTOMACAO = ["ASSINATURA", "DATA"] as const;
export const FONTES_AUTOMACAO = ["TEXTO", "OCR", "MANUAL"] as const;

export type TipoTarefa = (typeof TIPOS_TAREFA)[number];
export type CampoAutomacao = (typeof CAMPOS_AUTOMACAO)[number];
export type FonteAutomacao = (typeof FONTES_AUTOMACAO)[number];

/** Retângulo em pixels, com origem no canto superior esquerdo da página. */
export type Retangulo = { x: number; y: number; largura: number; altura: number };

/** Uma linha de texto encontrada no documento (camada de texto ou OCR). */
export type LinhaDoDocumento = Retangulo & { texto: string; pagina: number };

/** Ponto de soltura em percentual da página (0–100), como o Autentique usa. */
export type Ponto = { pagina: number; xPct: number; yPct: number };

export type PosicaoDetectada = {
  nome: string;
  campo: CampoAutomacao;
  pagina: number;
  xPct: number;
  yPct: number;
  fonte: FonteAutomacao;
  confianca: number | null;
};

/**
 * Minúsculas, sem acentos e sem pontuação — "José da Silva" e "JOSE DA SILVA!"
 * viram a mesma chave de busca.
 */
export function normalizarParaBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Procura `nome` nas linhas do documento. Tenta o nome completo e, se não
 * achar, o primeiro + último token (o documento pode abreviar o meio).
 * A comparação é por palavra inteira: "Ana" não casa em "Mariana".
 */
export function encontrarNome(
  linhas: LinhaDoDocumento[],
  nome: string,
): { linha: LinhaDoDocumento; confianca: number } | null {
  const completo = normalizarParaBusca(nome);
  if (!completo) return null;
  const tokens = completo.split(" ");
  const reduzido = tokens.length >= 3 ? tokens : [];

  for (const linha of linhas) {
    const texto = ` ${normalizarParaBusca(linha.texto)} `;
    if (texto.includes(` ${completo} `)) return { linha, confianca: 1 };
  }
  if (reduzido.length > 0) {
    for (const linha of linhas) {
      const texto = ` ${normalizarParaBusca(linha.texto)} `;
      const todos = reduzido.every((token) => texto.includes(` ${token} `));
      if (todos) return { linha, confianca: 0.7 };
    }
  }
  return null;
}

/**
 * Agrupa palavras soltas (OCR) em linhas: palavras da mesma página com a
 * mesma linha de base (tolerância de metade da altura) entram juntas.
 */
export function agruparPalavrasEmLinhas(
  palavras: (Retangulo & { texto: string; pagina: number })[],
): LinhaDoDocumento[] {
  const porPagina = new Map<number, (Retangulo & { texto: string })[]>();
  for (const palavra of palavras) {
    const lista = porPagina.get(palavra.pagina) ?? [];
    lista.push(palavra);
    porPagina.set(palavra.pagina, lista);
  }

  const linhas: LinhaDoDocumento[] = [];
  for (const [pagina, words] of porPagina) {
    const restantes = [...words].sort((a, b) => a.y - b.y || a.x - b.x);
    while (restantes.length > 0) {
      const semente = restantes.shift()!;
      const base = semente.y + semente.altura / 2;
      const grupo = [semente];
      let fim = semente.x + semente.largura;

      for (let i = 0; i < restantes.length; ) {
        const candidata = restantes[i];
        const linhaDaCandidata = candidata.y + candidata.altura / 2;
        const mesmaLinha = Math.abs(linhaDaCandidata - base) <= Math.max(semente.altura, candidata.altura) * 0.6;
        if (!mesmaLinha) {
          i++;
          continue;
        }
        restantes.splice(i, 1);
        grupo.push(candidata);
        fim = Math.max(fim, candidata.x + candidata.largura);
      }

      const x = Math.min(...grupo.map((p) => p.x));
      const y = Math.min(...grupo.map((p) => p.y));
      const altura = Math.max(...grupo.map((p) => p.y + p.altura)) - y;
      const texto = [...grupo]
        .sort((a, b) => a.x - b.x)
        .map((p) => p.texto)
        .join(" ");
      linhas.push({ texto, pagina, x, y, largura: fim - x, altura });
    }
  }
  return linhas.sort((a, b) => a.pagina - b.pagina || a.y - b.y);
}

/** Deslocamento padrão do ponto de soltura, em % da página. */
export const DESLOCAMENTO_PADRAO: Record<CampoAutomacao, { xPct: number; yPct: number }> = {
  ASSINATURA: { xPct: 0, yPct: -6 },
  DATA: { xPct: 0, yPct: 6 },
};

/**
 * Converte o retângulo de uma linha do documento num ponto de soltura em
 * percentual, centralizado na linha e deslocado conforme o campo.
 */
export function pontoDeSoltura(
  linha: LinhaDoDocumento,
  pagina: { largura: number; altura: number },
  campo: CampoAutomacao,
  deslocamento = DESLOCAMENTO_PADRAO[campo],
): Ponto {
  const centroX = (linha.x + linha.largura / 2) / pagina.largura;
  const centroY = (linha.y + linha.altura / 2) / pagina.altura;
  return {
    pagina: linha.pagina,
    xPct: limitar(centroX * 100 + deslocamento.xPct),
    yPct: limitar(centroY * 100 + deslocamento.yPct),
  };
}

function limitar(valor: number): number {
  return Math.round(Math.min(100, Math.max(0, valor)) * 10) / 10;
}

const deslocamentoSchema = z.object({
  xPct: z.coerce.number().min(-50).max(50).default(0),
  yPct: z.coerce.number().min(-50).max(50).default(0),
});

export const payloadDetectarSchema = z.object({
  assinatura: deslocamentoSchema.default(DESLOCAMENTO_PADRAO.ASSINATURA),
  data: deslocamentoSchema.default(DESLOCAMENTO_PADRAO.DATA),
});

export const posicaoSchema = z.object({
  id: z.coerce.number().int().positive(),
  nome: z.string().trim().min(1, "Informe o nome."),
  campo: z.enum(CAMPOS_AUTOMACAO),
  pagina: z.coerce.number().int().min(1).default(1),
  xPct: z.coerce.number().min(0).max(100),
  yPct: z.coerce.number().min(0).max(100),
});

export const payloadPosicionarSchema = z.object({
  posicoes: z.array(posicaoSchema).min(1, "Nenhuma posição para posicionar."),
});

export const posicaoDetectadaSchema = z.object({
  nome: z.string(),
  campo: z.enum(CAMPOS_AUTOMACAO),
  pagina: z.number().int().min(1),
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  fonte: z.enum(FONTES_AUTOMACAO),
  confianca: z.number().min(0).max(1).nullable(),
});

export const resultadoDetectarSchema = z.object({
  posicoes: z.array(posicaoDetectadaSchema),
  signatarios: z.array(z.string()),
  avisos: z.array(z.string()).default([]),
});

export const resultadoPosicionarSchema = z.object({
  total: z.number().int().min(0),
  feitos: z.number().int().min(0),
  falhas: z
    .array(
      z.object({
        nome: z.string(),
        campo: z.enum(CAMPOS_AUTOMACAO),
        erro: z.string(),
      }),
    )
    .default([]),
});

export type PayloadDetectar = z.infer<typeof payloadDetectarSchema>;
export type PayloadPosicionar = z.infer<typeof payloadPosicionarSchema>;
export type ResultadoDetectar = z.infer<typeof resultadoDetectarSchema>;
export type ResultadoPosicionar = z.infer<typeof resultadoPosicionarSchema>;
