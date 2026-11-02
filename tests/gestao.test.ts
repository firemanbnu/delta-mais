import { describe, expect, it } from "vitest";

import { avaliarDocumento, documentoExigido, somarMeses, type TipoDocumentoRegra } from "@/lib/gestao";

const NR35: TipoDocumentoRegra = { forma: "REALIZACAO", validadeMeses: 24, funcoesObrigatorias: [] };
const CNH: TipoDocumentoRegra = { forma: "VENCIMENTO", validadeMeses: null, funcoesObrigatorias: [] };
const CBA_CE: TipoDocumentoRegra = { forma: "REALIZACAO", validadeMeses: null, funcoesObrigatorias: ["BA-CE"] };
const CTPS: TipoDocumentoRegra = { forma: "ENTREGA", validadeMeses: null, funcoesObrigatorias: [] };
const HOJE = "2026-11-02";

describe("somarMeses", () => {
  it("soma meses e ajusta o fim do mês", () => {
    expect(somarMeses("2025-11-20", 24)).toBe("2027-11-20");
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2024-02-29", 12)).toBe("2025-02-28");
  });
});

describe("avaliarDocumento", () => {
  it("calcula o vencimento a partir da realização", () => {
    expect(avaliarDocumento(NR35, { data: "2025-11-20", situacao: "ENTREGUE" }, "BA-2", HOJE)).toEqual({
      status: "EM_DIA",
      vencimento: "2027-11-20",
      dias: 383,
    });
  });

  it("separa vencido, vence em 30 e vence em 90 dias", () => {
    expect(avaliarDocumento(NR35, { data: "2024-10-01", situacao: "ENTREGUE" }, null, HOJE).status).toBe("VENCIDO");
    expect(avaliarDocumento(NR35, { data: "2024-11-20", situacao: "ENTREGUE" }, null, HOJE).status).toBe("VENCE_30");
    expect(avaliarDocumento(NR35, { data: "2025-01-15", situacao: "ENTREGUE" }, null, HOJE).status).toBe("VENCE_90");
  });

  it("usa a data como vencimento na CNH", () => {
    const cnh = avaliarDocumento(CNH, { data: "2026-11-10", situacao: "ENTREGUE" }, null, HOJE);
    expect(cnh).toEqual({ status: "VENCE_30", vencimento: "2026-11-10", dias: 8 });
  });

  it("avisa quando falta a validade no catálogo", () => {
    const sem = { ...NR35, validadeMeses: null };
    expect(avaliarDocumento(sem, { data: "2025-11-20", situacao: "ENTREGUE" }, null, HOJE).status).toBe(
      "SEM_VALIDADE",
    );
  });

  it("só cobra o documento de quem tem a função", () => {
    expect(documentoExigido(CBA_CE, "BA-CE")).toBe(true);
    expect(documentoExigido(CBA_CE, "BA-2")).toBe(false);
    expect(avaliarDocumento(CBA_CE, null, "BA-2", HOJE).status).toBe("NAO_SE_APLICA");
    expect(avaliarDocumento(CBA_CE, null, "BA-CE", HOJE).status).toBe("FALTA");
  });

  it("trata entrega, falta, desatualizado e conferência", () => {
    expect(avaliarDocumento(CTPS, { data: null, situacao: "ENTREGUE" }, null, HOJE).status).toBe("EM_DIA");
    expect(avaliarDocumento(CTPS, { data: null, situacao: "FALTA" }, null, HOJE).status).toBe("FALTA");
    expect(avaliarDocumento(CTPS, { data: null, situacao: "DESATUALIZADO" }, null, HOJE).status).toBe("VENCIDO");
    expect(avaliarDocumento(CTPS, { data: null, situacao: "CONFERIR" }, null, HOJE).status).toBe("CONFERIR");
    expect(avaliarDocumento(CTPS, { data: null, situacao: "NAO_SE_APLICA" }, null, HOJE).status).toBe(
      "NAO_SE_APLICA",
    );
    expect(avaliarDocumento(NR35, { data: null, situacao: "ENTREGUE" }, null, HOJE).status).toBe("CONFERIR");
  });
});
