import { describe, expect, it } from "vitest";

import {
  agruparPalavrasEmLinhas,
  encontrarNome,
  normalizarParaBusca,
  payloadDetectarSchema,
  payloadPosicionarSchema,
  pontoDeSoltura,
  resultadoDetectarSchema,
  resultadoPosicionarSchema,
  type LinhaDoDocumento,
} from "../src/lib/automacao";

const PAGINA = { largura: 1000, altura: 1400 };

function linha(texto: string, extra: Partial<LinhaDoDocumento> = {}): LinhaDoDocumento {
  return { texto, pagina: 1, x: 100, y: 1200, largura: 300, altura: 20, ...extra };
}

describe("normalizarParaBusca", () => {
  it("tira acento, caixa e pontuação", () => {
    expect(normalizarParaBusca("José da Silva!")).toBe("jose da silva");
    expect(normalizarParaBusca("  ANA   OLIVEIRA  ")).toBe("ana oliveira");
    expect(normalizarParaBusca("Sônia-Lima")).toBe("sonia lima");
  });
});

describe("encontrarNome", () => {
  it("acha o nome completo sem depender de acento ou caixa", () => {
    const alvo = linha("JOSE DA SILVA", { x: 100 });
    const achado = encontrarNome([linha("Outra pessoa"), alvo], "José da Silva");
    expect(achado?.linha).toBe(alvo);
    expect(achado?.confianca).toBe(1);
  });

  it("não casa nome parcial dentro de outra palavra", () => {
    expect(encontrarNome([linha("Mariana Souza")], "Ana Souza")).toBeNull();
    expect(encontrarNome([linha("Mariana Souza")], "Ana")).toBeNull();
    expect(encontrarNome([linha("Ana Maria")], "Ana")?.linha.texto).toBe("Ana Maria");
  });

  it("cai para primeiro + último token quando o meio não bate", () => {
    const achado = encontrarNome([linha("José A. da Silva")], "José da Silva");
    expect(achado?.confianca).toBe(0.7);
  });

  it("devolve null quando ninguém foi encontrado", () => {
    expect(encontrarNome([linha("Fulano de Tal")], "João Bento")).toBeNull();
  });
});

describe("agruparPalavrasEmLinhas", () => {
  it("junta palavras da mesma linha de base e separa as de baixo", () => {
    const linhas = agruparPalavrasEmLinhas([
      { texto: "Nome", pagina: 1, x: 100, y: 500, largura: 40, altura: 16 },
      { texto: "e", pagina: 1, x: 150, y: 501, largura: 8, altura: 16 },
      { texto: "assinatura", pagina: 1, x: 165, y: 500, largura: 80, altura: 16 },
      { texto: "Rodapé", pagina: 1, x: 100, y: 1300, largura: 50, altura: 16 },
      { texto: "Outra", pagina: 2, x: 100, y: 500, largura: 45, altura: 16 },
    ]);

    expect(linhas).toHaveLength(3);
    expect(linhas[0].texto).toBe("Nome e assinatura");
    expect(linhas[0].largura).toBeGreaterThan(100);
    expect(linhas[1]).toMatchObject({ texto: "Rodapé", pagina: 1 });
    expect(linhas[2]).toMatchObject({ texto: "Outra", pagina: 2 });
  });
});

describe("pontoDeSoltura", () => {
  it("centraliza na linha e desloca conforme o campo", () => {
    const alvo = linha("João Silva", { x: 200, y: 700, largura: 400, altura: 40 });

    const assinatura = pontoDeSoltura(alvo, PAGINA, "ASSINATURA");
    const data = pontoDeSoltura(alvo, PAGINA, "DATA");

    expect(assinatura).toEqual({ pagina: 1, xPct: 40, yPct: 45.4 });
    expect(data).toEqual({ pagina: 1, xPct: 40, yPct: 57.4 });
    expect(assinatura.yPct).toBeLessThan(data.yPct);
  });

  it("limita dentro de 0–100", () => {
    const noCanto = linha("X", { x: 990, y: 1395, largura: 10, altura: 10 });
    const ponto = pontoDeSoltura(noCanto, PAGINA, "DATA", { xPct: 50, yPct: 50 });
    expect(ponto.xPct).toBe(100);
    expect(ponto.yPct).toBe(100);
  });
});

describe("payloads e resultados", () => {
  it("aceita payload de detecção vazio usando os deslocamentos padrão", () => {
    const payload = payloadDetectarSchema.parse({});
    expect(payload.assinatura).toEqual({ xPct: 0, yPct: -6 });
    expect(payload.data).toEqual({ xPct: 0, yPct: 6 });
  });

  it("recusa posição fora do intervalo da página", () => {
    const resultado = payloadPosicionarSchema.safeParse({
      posicoes: [{ id: 1, nome: "Ana", campo: "ASSINATURA", pagina: 1, xPct: 120, yPct: 50 }],
    });
    expect(resultado.success).toBe(false);
  });

  it("valida o resultado do agente", () => {
    const ok = resultadoDetectarSchema.safeParse({
      posicoes: [
        { nome: "Ana", campo: "DATA", pagina: 2, xPct: 10, yPct: 20, fonte: "OCR", confianca: 0.8 },
      ],
      signatarios: ["Ana"],
      avisos: [],
    });
    expect(ok.success).toBe(true);

    const parcial = resultadoPosicionarSchema.parse({ total: 2, feitos: 1, falhas: [] });
    expect(parcial.falhas).toEqual([]);
  });
});
