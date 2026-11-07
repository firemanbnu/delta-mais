import { describe, expect, it } from "vitest";

import {
  COMPETENCIAS,
  ESCALA_NOTAS,
  analisarEquipe,
  arredondarExcel,
  classificar,
  classificarMedia,
  eixos9Box,
  combinarNotas,
  mediaDasNotas,
  mediaGeral,
  notasInteiras,
  notasNaVisao,
  prioridades,
  pontosFortes,
  quadrante9Box,
  type Notas,
} from "@/lib/desempenho";
import { MODELO_AVALIACAO_XLSX_BASE64 } from "@/lib/modelos/avaliacao-desempenho-xlsx";
import { gerarPlanilhaDesempenho } from "@/lib/planilha-desempenho";
import { conteudo, lerZip } from "@/lib/zip";

function todas(nota: number): Notas {
  return Object.fromEntries(COMPETENCIAS.map((c) => [String(c.numero), nota]));
}

function arquivo(buf: Buffer, nome: string): string {
  const e = lerZip(buf).find((x) => x.nome === nome);
  if (!e) throw new Error(nome);
  return conteudo(e).toString("utf8");
}

describe("itens da avaliação", () => {
  it("tem os 23 itens da planilha, sem o item 6", () => {
    expect(COMPETENCIAS).toHaveLength(23);
    expect(COMPETENCIAS.map((c) => c.numero)).not.toContain(6);
    expect(COMPETENCIAS[0].numero).toBe(1);
    expect(COMPETENCIAS.at(-1)?.numero).toBe(24);
  });

  it("usa exatamente os textos da planilha da empresa", () => {
    const strings = arquivo(Buffer.from(MODELO_AVALIACAO_XLSX_BASE64, "base64"), "xl/sharedStrings.xml")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
    for (const c of COMPETENCIAS) {
      expect(strings).toContain(`>${c.competencia}<`);
      expect(strings).toContain(`>${c.pergunta}<`);
      expect(strings).toContain(`>${c.comportamento}<`);
    }
    for (const e of ESCALA_NOTAS) expect(strings).toContain(`>${e.rotulo}<`);
  });
});

describe("cálculos", () => {
  it("classifica pela escala e a média com ROUND do Excel", () => {
    expect(classificar(8)).toBe("Muito bom");
    expect(classificar(null)).toBeNull();
    expect(arredondarExcel(7.5)).toBe(8);
    expect(classificarMedia(7.49)).toBe("Bom");
    expect(classificarMedia(7.5)).toBe("Muito bom");
  });

  it("média ignora itens sem nota, como a fórmula da planilha", () => {
    expect(mediaGeral({ "1": 10, "2": 6 })).toBe(8);
    expect(mediaGeral({})).toBeNull();
  });

  it("9-box usa o item 1 como potencial", () => {
    const n = { ...todas(9), "1": 6 };
    expect(eixos9Box(n)).toEqual({ potencial: 6, desempenho: 9 });
    expect(quadrante9Box(n)?.titulo).toBe("Especialista confiável");
    expect(quadrante9Box(todas(10))?.titulo).toBe("Talento-chave");
  });

  it("pontos fortes e prioridades", () => {
    const n = { ...todas(8), "5": 10, "18": 4, "20": 5 };
    expect(pontosFortes(n, 1)[0].competencia.numero).toBe(5);
    expect(prioridades(n).map((p) => p.competencia.numero).slice(0, 2)).toEqual([18, 20]);
    expect(prioridades(todas(9))).toHaveLength(0);
  });

  it("análise da equipe sugere mentor e aprendiz", () => {
    const a = analisarEquipe([
      { id: 1, nome: "A", nomeGuerra: "A", notas: { ...todas(8), "5": 10 } },
      { id: 2, nome: "B", nomeGuerra: "B", notas: { ...todas(8), "5": 4 } },
      { id: 3, nome: "C", nomeGuerra: null, notas: {} },
    ]);
    expect(a.avaliados).toBe(2);
    expect(a.mediaPorCompetencia[5]).toBe(7);
    expect(a.criticas[0].competencia.numero).toBe(5);
    expect(a.duplas[0].mentor.id).toBe(1);
    expect(a.duplas[0].aprendizes.map((x) => x.pessoa.id)).toEqual([2]);
  });
});

describe("avaliação pelos colegas", () => {
  it("média dos colegas item a item e mínimo de respostas", () => {
    const r1 = { "1": 8, "2": 6 };
    const r2 = { "1": 9 };
    expect(mediaDasNotas([r1, r2])).toEqual({ "1": 8.5, "2": 6 });
    expect(notasNaVisao({ "1": 10 }, [r1], "colegas")).toEqual({});
    expect(notasNaVisao({ "1": 10 }, [r1, r2], "colegas")).toEqual({ "1": 8.5, "2": 6 });
    expect(notasNaVisao({ "1": 10 }, [r1, r2], "minha")).toEqual({ "1": 10 });
  });

  it("combinada é a média simples entre a minha e a dos colegas", () => {
    expect(combinarNotas({ "1": 10, "3": 7 }, { "1": 8.5, "2": 6 })).toEqual({ "1": 9.25, "2": 6, "3": 7 });
    expect(notasInteiras({ "1": 9.25, "2": 6.5 })).toEqual({ "1": 9, "2": 7 });
    expect(classificar(8.5)).toBe("Excepcional");
  });
});

describe("planilha exportada", () => {
  const buf = gerarPlanilhaDesempenho([
    { nome: "CATIA CIRICO", notas: { ...todas(8), "1": 9 } },
    { nome: "JOÃO & <TESTE>", notas: { "2": 7 } },
  ]);

  it("mantém todos os arquivos do modelo", () => {
    const original = lerZip(Buffer.from(MODELO_AVALIACAO_XLSX_BASE64, "base64")).map((e) => e.nome);
    expect(lerZip(buf).map((e) => e.nome)).toEqual(original);
    expect(arquivo(buf, "xl/sharedStrings.xml")).toBe(
      arquivo(Buffer.from(MODELO_AVALIACAO_XLSX_BASE64, "base64"), "xl/sharedStrings.xml"),
    );
  });

  it("preenche nomes, notas e resultados, mantendo as fórmulas", () => {
    const aba = arquivo(buf, "xl/worksheets/sheet1.xml");
    expect(aba).toContain('<c r="C17" s="4" t="inlineStr"><is><t xml:space="preserve">CATIA CIRICO</t></is></c>');
    expect(aba).toContain('<c r="E19" s="22"><v>9</v></c>');
    expect(aba).toMatch(/<c r="F19" s="23" t="str"><f t="shared" ref="F19:F41" si="0">.*?<\/f><v>Excepcional<\/v><\/c>/);
    expect(aba).toContain("JOÃO &amp; &lt;TESTE&gt;");
    expect(aba).toMatch(/<c r="E42" s="29"><f>IF\(COUNT\(E19:E41\)=0,"",AVERAGE\(E19:E41\)\)<\/f><v>8\.04/);
    // Terceiro bloco continua em branco.
    expect(aba).toContain('<c r="C75" s="4"/>');
    const resumo = arquivo(buf, "xl/worksheets/sheet2.xml");
    expect(resumo).toMatch(/<c r="B4"[^>]*t="str"><f>.*?<\/f><v>CATIA CIRICO<\/v>/);
    expect(arquivo(buf, "xl/workbook.xml")).toContain('<calcPr fullCalcOnLoad="1"');
  });

  it("recusa mais pessoas que blocos", () => {
    expect(() =>
      gerarPlanilhaDesempenho(Array.from({ length: 13 }, (_, i) => ({ nome: `P${i}`, notas: {} }))),
    ).toThrow(/12 blocos/);
  });
});
