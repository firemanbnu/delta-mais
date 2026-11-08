import { describe, expect, it } from "vitest";

import { cortesDePagina, montarPdf } from "@/lib/pdf-imagens";

describe("PDF de imagens", () => {
  it("monta um PDF A4 com uma página por imagem e xref válido", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = montarPdf(
      [
        { jpeg, largura: 100, altura: 141 },
        { jpeg, largura: 100, altura: 141 },
      ],
      { titulo: "Relatório (teste)" },
    );
    const texto = new TextDecoder("latin1").decode(pdf);
    expect(texto.startsWith("%PDF-1.4")).toBe(true);
    expect(texto).toContain("/Count 2");
    expect(texto).toContain("/MediaBox [0 0 595.28 841.89]");
    expect(texto).toContain("/Title (Relatorio teste)");
    // Cada entrada do xref aponta para o início do objeto.
    const xref = Number(/startxref\n(\d+)/.exec(texto)![1]);
    const linhas = texto.slice(xref).split("\n").slice(3, 13);
    linhas.forEach((l, i) => {
      const pos = Number(l.slice(0, 10));
      expect(texto.slice(pos, pos + 8)).toBe(`${i + 1} 0 obj`.padEnd(8, "\n").slice(0, 8));
    });
  });

  it("deitado troca largura e altura", () => {
    const pdf = montarPdf([{ jpeg: new Uint8Array([1]), largura: 10, altura: 7 }], { paisagem: true });
    expect(new TextDecoder("latin1").decode(pdf)).toContain("/MediaBox [0 0 841.89 595.28]");
  });

  it("corta nas quebras sem deixar página quase vazia", () => {
    expect(cortesDePagina(2500, 1000, [400, 950, 990, 1200, 1900, 2100])).toEqual([990, 1900]);
    expect(cortesDePagina(800, 1000, [400])).toEqual([]);
    expect(cortesDePagina(2500, 1000, [100])).toEqual([1000, 2000]);
  });
});
