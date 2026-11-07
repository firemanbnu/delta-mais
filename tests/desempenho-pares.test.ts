import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Cookies em memória no lugar do next/headers.
const jarra = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (jarra.has(nome) ? { name: nome, value: jarra.get(nome) } : undefined),
    set: (nome: string, valor: string) => void jarra.set(nome, valor),
    delete: (op: string | { name: string }) => void jarra.delete(typeof op === "string" ? op : op.name),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/acesso-gestao", () => ({ exigirGestao: async () => undefined }));

import {
  abrirConviteAction,
  enviarRespostasParesAction,
  novoLinkAction,
  salvarRodadaAction,
} from "@/app/acoes/desempenho-pares";
import { listarConvites, respostasColegas } from "@/db/desempenho-pares";
import { avaliacoesParesConvites, avaliacoesParesNotas, avaliacoesParesRodadas, efetivo } from "@/db/schema";
import { criarBancoDeTeste, type BancoDeTeste } from "./helpers/banco";

let banco: BancoDeTeste;
let ids: number[] = [];

beforeAll(async () => {
  banco = await criarBancoDeTeste();
});

beforeEach(async () => {
  jarra.clear();
  await banco.db.delete(avaliacoesParesNotas);
  await banco.db.delete(avaliacoesParesConvites);
  await banco.db.delete(avaliacoesParesRodadas);
  await banco.db.delete(efetivo);
  const linhas = await banco.db
    .insert(efetivo)
    .values(["ANA", "BRUNO", "CARLA", "DIEGO"].map((nome) => ({ nome, equipe: "DELTA" as const })))
    .returning({ id: efetivo.id });
  ids = linhas.map((l) => l.id);
  const r = await salvarRodadaAction({ ciclo: 2026, avaliados: ids, respondentes: ids });
  expect(r.ok).toBe(true);
});

async function tokenDe(id: number): Promise<{ token: string; conviteId: number }> {
  const c = (await listarConvites(2026)).find((x) => x.pessoa.id === id)!;
  return { token: c.convite.token, conviteId: c.convite.id };
}

describe("avaliação pelos colegas", () => {
  it("gera um link por respondente", async () => {
    expect(await listarConvites(2026)).toHaveLength(4);
  });

  it("prende o link ao primeiro aparelho", async () => {
    const { token } = await tokenDe(ids[0]);
    expect(await abrirConviteAction(token)).toEqual({ ok: true });
    expect(await abrirConviteAction(token)).toEqual({ ok: true }); // mesmo aparelho
    jarra.clear(); // outro aparelho
    const outro = await abrirConviteAction(token);
    expect(outro.ok).toBe(false);
  });

  it("aceita uma única resposta, sem avaliar a si mesmo, e grava sem identificar quem respondeu", async () => {
    const { token } = await tokenDe(ids[0]);
    await abrirConviteAction(token);

    const propria = await enviarRespostasParesAction(token, { [ids[0]]: { "1": 9 } });
    expect(propria.ok).toBe(false);

    const ok = await enviarRespostasParesAction(token, {
      [ids[1]]: { "1": 8, "2": 7 },
      [ids[2]]: { "1": 10 },
      [ids[3]]: {},
    });
    expect(ok.ok).toBe(true);

    const de_novo = await enviarRespostasParesAction(token, { [ids[1]]: { "1": 1 } });
    expect(de_novo.ok).toBe(false);

    const notas = await banco.db.select().from(avaliacoesParesNotas);
    expect(notas).toHaveLength(2);
    expect(Object.keys(notas[0]).sort()).toEqual(["avaliadoId", "ciclo", "id", "notas"]);
    const mapa = await respostasColegas(2026);
    expect(mapa.get(ids[1])).toEqual([{ "1": 8, "2": 7 }]);
  });

  it("não aceita envio de outro aparelho nem nota inválida", async () => {
    const { token } = await tokenDe(ids[1]);
    await abrirConviteAction(token);
    expect((await enviarRespostasParesAction(token, { [ids[0]]: { "1": 11 } })).ok).toBe(false);
    jarra.clear();
    expect((await enviarRespostasParesAction(token, { [ids[0]]: { "1": 8 } })).ok).toBe(false);
  });

  it("novo link invalida o anterior", async () => {
    const { token, conviteId } = await tokenDe(ids[2]);
    await abrirConviteAction(token);
    expect((await novoLinkAction(conviteId)).ok).toBe(true);
    expect((await abrirConviteAction(token)).ok).toBe(false);
    const novo = await tokenDe(ids[2]);
    expect(novo.token).not.toBe(token);
    jarra.clear();
    expect((await abrirConviteAction(novo.token)).ok).toBe(true);
  });
});
