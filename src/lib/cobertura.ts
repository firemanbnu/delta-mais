import type { NoiteDeRadio } from "./radio";
import type { EstadoPosts, PessoaResumo, Posto, Problema } from "./rotacao";

/**
 * Cobertura de férias.
 *
 * Cada férias pode trazer um ferista (só o nome) e, opcionalmente, alguém do
 * quadro que assume a função do ausente na viatura. A regra:
 *
 *  - Sem ninguém na função: o ferista entra no lugar do ausente em tudo
 *    (viatura e rádio).
 *  - Com alguém na função: essa pessoa vai para a vaga do ausente e o ferista
 *    fica com a vaga que era dela. No rádio o ferista continua no lugar do
 *    ausente, porque quem cobre a função segue com o próprio rádio.
 *
 * A cobertura vale para o mês inteiro em que as férias tocam. Ela é calculada
 * a cada leitura e nunca grava nada em `assignments`: a vaga continua com o
 * titular, para o rodízio do mês seguinte sair certo, e apagar as férias
 * desfaz a cobertura sozinho.
 */
export type CoberturaFerias = {
  ausenciaId: string;
  /** Quem está de férias. */
  pessoaId: string;
  /** Nome do ferista. Vazio quando as férias não têm ferista definido. */
  ferista: string;
  /** Quem assume a função do ausente na viatura, ou `null` se é o ferista. */
  cobreFuncaoId: string | null;
};

/** Quem trabalha de fato numa vaga no mês, quando não é o titular. */
export type OcupacaoCoberta = {
  nome: string;
  /** Id do quadro quando quem cobre é cadastrado; `null` para o ferista. */
  pessoaId: string | null;
  /** Função mostrada na escala. O ferista não tem função cadastrada. */
  funcao: string | null;
  ferista: boolean;
  /** Frase curta para tela, impressão e CSV. */
  descricao: string;
};

export type CoberturasDaViatura = {
  porVaga: Record<string, OcupacaoCoberta>;
  /** Ausentes cuja vaga ficou coberta: não precisam mais do aviso de ausência. */
  cobertos: string[];
  problemas: Problema[];
};

function vagaDe(estado: EstadoPosts, pessoaId: string): string | null {
  for (const [codigo, ocupante] of Object.entries(estado)) {
    if (ocupante === pessoaId) return codigo;
  }
  return null;
}

/** Aplica as coberturas de férias do mês por cima da escala de viaturas. */
export function coberturasDaViatura(
  estado: EstadoPosts,
  coberturas: readonly CoberturaFerias[],
  pessoas: readonly PessoaResumo[],
  postos: readonly Posto[],
): CoberturasDaViatura {
  const porId = new Map(pessoas.map((p) => [p.id, p]));
  const postoPorCodigo = new Map(postos.map((p) => [p.codigo, p]));
  const nomeDe = (id: string) => porId.get(id)?.nome ?? "—";

  const porVaga: Record<string, OcupacaoCoberta> = {};
  const cobertos = new Set<string>();
  const problemas: Problema[] = [];

  const ocupar = (codigo: string, ocupacao: OcupacaoCoberta) => {
    if (porVaga[codigo]) {
      problemas.push({
        severidade: "aviso",
        posto: codigo,
        mensagem:
          `Duas coberturas de férias caem na vaga ${codigo}: ` +
          `${porVaga[codigo].nome} e ${ocupacao.nome}. Vale a segunda; confira as férias.`,
      });
    }
    porVaga[codigo] = ocupacao;
  };

  for (const cobertura of coberturas) {
    const ferista = cobertura.ferista.trim();
    if (!ferista) continue;

    const ausente = nomeDe(cobertura.pessoaId);
    const vagaAusente = vagaDe(estado, cobertura.pessoaId);
    // Fora da escala de viaturas neste mês: a cobertura só vale para o rádio.
    if (!vagaAusente) continue;

    const substitutoId =
      cobertura.cobreFuncaoId && cobertura.cobreFuncaoId !== cobertura.pessoaId
        ? cobertura.cobreFuncaoId
        : null;

    if (!substitutoId) {
      ocupar(vagaAusente, {
        nome: ferista,
        pessoaId: null,
        funcao: null,
        ferista: true,
        descricao: `${ferista} (ferista) cobre as férias de ${ausente}`,
      });
      cobertos.add(cobertura.pessoaId);
      continue;
    }

    const substituto = porId.get(substitutoId);
    const nomeSubstituto = substituto?.nome ?? "—";
    const posto = postoPorCodigo.get(vagaAusente);
    if (substituto && posto && !posto.funcoes.includes(substituto.funcao)) {
      problemas.push({
        severidade: "aviso",
        posto: vagaAusente,
        mensagem:
          `${nomeSubstituto} é ${substituto.funcao} e cobre a função de ${ausente} na vaga ` +
          `${vagaAusente} (${posto.rotulo}), que pede ${posto.funcoes.join(" ou ")}.`,
      });
    }

    ocupar(vagaAusente, {
      nome: nomeSubstituto,
      pessoaId: substitutoId,
      funcao: substituto?.funcao ?? null,
      ferista: false,
      descricao: `${nomeSubstituto} cobre a função de ${ausente} (férias)`,
    });
    cobertos.add(cobertura.pessoaId);

    const vagaSubstituto = vagaDe(estado, substitutoId);
    if (!vagaSubstituto) {
      problemas.push({
        severidade: "aviso",
        posto: vagaAusente,
        mensagem:
          `${nomeSubstituto} cobre a função de ${ausente}, mas não está escalado em nenhuma ` +
          `vaga neste mês: o ferista ${ferista} fica sem vaga de viatura.`,
      });
      continue;
    }

    ocupar(vagaSubstituto, {
      nome: ferista,
      pessoaId: null,
      funcao: null,
      ferista: true,
      descricao: `${ferista} (ferista) fica no lugar de ${nomeSubstituto}, que cobre ${ausente}`,
    });
  }

  return { porVaga, cobertos: [...cobertos], problemas };
}

/** Ferista que cobre cada operador de rádio no mês, por id do operador. */
export type CoberturasDoRadio = Map<string, { nome: string; descricao: string }>;

function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * No rádio o ferista sempre fica no lugar de quem saiu de férias.
 *
 * Os operadores de rádio são cadastros separados dos bombeiros das viaturas
 * (equipe de rádio do seed). Até os cadastros serem unificados, o operador é
 * ligado às férias pelo id ou, se não bater, pelo mesmo nome.
 */
export function coberturasDoRadio(
  coberturas: readonly CoberturaFerias[],
  nomesDoQuadro: ReadonlyMap<string, string>,
  operadores: readonly { id: string; nome: string }[],
): CoberturasDoRadio {
  const resultado: CoberturasDoRadio = new Map();

  for (const cobertura of coberturas) {
    const ferista = cobertura.ferista.trim();
    if (!ferista) continue;

    const nomeAusente = nomesDoQuadro.get(cobertura.pessoaId);
    const chave = nomeAusente ? normalizar(nomeAusente) : null;

    for (const operador of operadores) {
      const mesmo =
        operador.id === cobertura.pessoaId || (chave !== null && normalizar(operador.nome) === chave);
      if (!mesmo) continue;
      resultado.set(operador.id, {
        nome: ferista,
        descricao: `${ferista} (ferista) cobre as férias de ${operador.nome}`,
      });
    }
  }

  return resultado;
}

/** Marca nas noites de rádio as faixas que o ferista cobre. Não altera o rodízio. */
export function aplicarCoberturasNoRadio(
  noites: readonly NoiteDeRadio[],
  coberturas: CoberturasDoRadio,
): NoiteDeRadio[] {
  if (coberturas.size === 0) return [...noites];

  return noites.map((noite) => {
    const slots: NoiteDeRadio["slots"] = {};
    for (const [slot, celula] of Object.entries(noite.slots)) {
      const cobertura = coberturas.get(celula.pessoaId);
      slots[slot] = cobertura ? { ...celula, cobertura } : celula;
    }
    return { ...noite, slots };
  });
}
