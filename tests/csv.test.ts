import { describe, expect, it } from "vitest";

import { campoCsv, linhaCsv, montarCsv } from "../src/lib/csv";

describe("CSV", () => {
  it("separa campos com ; e termina a linha com CRLF", () => {
    expect(linhaCsv(["Vaga", "Bombeiro", 3])).toBe("Vaga;Bombeiro;3");
    expect(linhaCsv(["Vaga", "Bombeiro", 3]) + "\r\n").toBe("Vaga;Bombeiro;3\r\n");
  });

  it("trata vazio e null como célula em branco", () => {
    expect(linhaCsv(["Vaga", null, undefined, ""])).toBe("Vaga;;;");
  });

  it("não coloca aspas no texto simples", () => {
    expect(campoCsv("Elisa Prado")).toBe("Elisa Prado");
  });

  it("coloca aspas quando há separador, aspas ou quebra de linha", () => {
    expect(campoCsv("F3;MC")).toBe('"F3;MC"');
    expect(campoCsv('Maria "D" Silva')).toBe('"Maria ""D"" Silva"');
    expect(campoCsv("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });

  it("monta o arquivo com BOM no começo e CRLF entre linhas", () => {
    const csv = montarCsv(["Vaga", "Bombeiro"], [["F3-MC", "Elisa Prado"], ["CRS-MC", "Sônia Lima"]]);

    expect(csv).toBe(
      "\uFEFFVaga;Bombeiro\r\nF3-MC;Elisa Prado\r\nCRS-MC;Sônia Lima\r\n",
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
