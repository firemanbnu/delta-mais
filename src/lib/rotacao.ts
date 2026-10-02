import {
  GRUPOS_RODANTES,
  POSTOS_PADRAO,
  aceitoNoPosto,
  type DefinicaoPosto,
  type Funcao,
  type GrupoPosto,
} from "./dominio";

export type Posto = Pick<
  DefinicaoPosto,
  | "codigo"
  | "unidade"
  | "rotulo"
  | "grupo"
  | "posicaoNoCiclo"
  | "comunicacao"
  | "funcoes"
>;

export type PessoaResumo = {
  id: string;
  nome: string;
  funcao: Funcao;
};

export type EstadoPosts = Record<string, string | null>;

export type Severidade = "erro" | "aviso";

export type Problema = {
  severidade: Severidade;
  posto: string | null;
  mensagem: string;
};

export function ordenarCiclo(
  postos: readonly Posto[],
  grupo: GrupoPosto,
): string[] {
  return postos
    .filter((p) => p.grupo === grupo && p.posicaoNoCiclo !== null)
    .sort((a, b) => (a.posicaoNoCiclo ?? 0) - (b.posicaoNoCiclo ?? 0))
    .map((p) => p.codigo);
}

/**
 * Dá a volta de um ciclo de rodízio: quem está na posição i passa para a
 * posição i+1 e quem está na última volta para a primeira.
 *
 * Postos do grupo FIXO (F2-CE, CRS-LR) ficam onde estão.
 */
export function avancarRodizio(
  estado: EstadoPosts,
  postos: readonly Posto[] = POSTOS_PADRAO,
): EstadoPosts {
  const proximo: EstadoPosts = {};

  for (const posto of postos) {
    proximo[posto.codigo] = null;
  }

  for (const posto of postos) {
    if (posto.grupo === "FIXO" || posto.posicaoNoCiclo === null) {
      proximo[posto.codigo] = estado[posto.codigo] ?? null;
    }
  }

  for (const grupo of GRUPOS_RODANTES) {
    const ciclo = ordenarCiclo(postos, grupo);
    const tamanho = ciclo.length;
    if (tamanho === 0) continue;
    ciclo.forEach((codigo, i) => {
      const anterior = ciclo[(i - 1 + tamanho) % tamanho];
      proximo[codigo] = estado[anterior] ?? null;
    });
  }

  return proximo;
}

/** Aplica o rodízio `meses` vezes de uma vez. */
export function avancarMeses(
  estado: EstadoPosts,
  meses: number,
  postos: readonly Posto[] = POSTOS_PADRAO,
): EstadoPosts {
  let atual = estado;
  for (let i = 0; i < Math.max(0, meses); i++) {
    atual = avancarRodizio(atual, postos);
  }
  return atual;
}

export type EstadoComPessoas = Record<string, PessoaResumo | null>;

/**
 * Mesma lógica de `avancarRodizio`, mas preservando os dados da pessoa
 * (nome/função) em vez de só o id. É o que a tela realmente consome.
 */
export function avancarRodizioComPessoas(
  estado: EstadoComPessoas,
  postos: readonly Posto[] = POSTOS_PADRAO,
): EstadoComPessoas {
  const proximo: EstadoComPessoas = {};

  for (const posto of postos) {
    proximo[posto.codigo] = null;
  }

  for (const posto of postos) {
    if (posto.grupo === "FIXO" || posto.posicaoNoCiclo === null) {
      proximo[posto.codigo] = estado[posto.codigo] ?? null;
    }
  }

  for (const grupo of GRUPOS_RODANTES) {
    const ciclo = ordenarCiclo(postos, grupo);
    const tamanho = ciclo.length;
    if (tamanho === 0) continue;
    ciclo.forEach((codigo, i) => {
      const anterior = ciclo[(i - 1 + tamanho) % tamanho];
      proximo[codigo] = estado[anterior] ?? null;
    });
  }

  return proximo;
}

export function validarComposicao(
  estado: EstadoPosts,
  pessoas: readonly PessoaResumo[],
  postos: readonly Posto[] = POSTOS_PADRAO,
  indisponiveis: readonly string[] = [],
): Problema[] {
  const problemas: Problema[] = [];
  const porId = new Map(pessoas.map((p) => [p.id, p]));
  const postoPorCodigo = new Map(postos.map((p) => [p.codigo, p]));

  const ocupacao = new Map<string, string[]>();
  for (const posto of postos) {
    const pessoaId = estado[posto.codigo];
    if (!pessoaId) {
      problemas.push({
        severidade: "erro",
        posto: posto.codigo,
        mensagem: `Vaga ${posto.codigo} (${posto.rotulo}) está vazia.`,
      });
      continue;
    }

    const lista = ocupacao.get(pessoaId) ?? [];
    lista.push(posto.codigo);
    ocupacao.set(pessoaId, lista);

    const pessoa = porId.get(pessoaId);
    if (!pessoa) {
      problemas.push({
        severidade: "erro",
        posto: posto.codigo,
        mensagem: `A pessoa escalada em ${posto.codigo} não existe mais no quadro.`,
      });
      continue;
    }

    if (!aceitoNoPosto(pessoa.funcao, posto)) {
      problemas.push({
        severidade: "erro",
        posto: posto.codigo,
        mensagem: `${pessoa.nome} é ${pessoa.funcao} e não pode ocupar a vaga ${posto.codigo} (${posto.rotulo}).`,
      });
    }

    if (indisponiveis.includes(pessoaId)) {
      problemas.push({
        severidade: "aviso",
        posto: posto.codigo,
        mensagem: `${pessoa.nome} consta como ausente (férias, atestado ou dispensa) neste mês.`,
      });
    }
  }

  for (const [pessoaId, lista] of ocupacao) {
    if (lista.length > 1) {
      const nome = porId.get(pessoaId)?.nome ?? pessoaId;
      problemas.push({
        severidade: "erro",
        posto: lista[0],
        mensagem: `${nome} está escalado em mais de uma vaga: ${lista.join(", ")}.`,
      });
    }
  }

  if (!postoPorCodigo.has("F2-CE") || !postoPorCodigo.has("CRS-LR")) {
    problemas.push({
      severidade: "erro",
      posto: null,
      mensagem: "Cadastro de postos incompleto: F2-CE e CRS-LR são obrigatórios.",
    });
  }

  return problemas;
}

/**
 * Quem está disponível para ocupar a vaga, respeitando a qualificação.
 * Não tenta substituir sozinho: a escolha é do comandante.
 */
export function sugerirParaPosto(
  posto: Posto,
  estado: EstadoPosts,
  pessoas: readonly PessoaResumo[],
  indisponiveis: readonly string[] = [],
): PessoaResumo[] {
  const jaEscalados = new Set(
    Object.values(estado).filter((v): v is string => Boolean(v)),
  );
  return pessoas
    .filter((p) => aceitoNoPosto(p.funcao, posto))
    .filter((p) => !jaEscalados.has(p.id))
    .filter((p) => !indisponiveis.includes(p.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
