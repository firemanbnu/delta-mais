import {
  COMPETENCIAS,
  ESCALA_NOTAS,
  PILARES,
  ROTULO_PILAR,
  type Competencia,
  type Pilar,
} from "./desempenho-itens";

export * from "./desempenho-itens";

/** Notas da avaliação: número do item (como na planilha) → nota de 1 a 10. */
export type Notas = Record<string, number>;

export const NOTA_MIN = 1;
export const NOTA_MAX = 10;

/** Mesmo rótulo da coluna "Classificação" da planilha. */
export function classificar(nota: number | null | undefined): string | null {
  if (nota === null || nota === undefined) return null;
  const inteira = Number.isInteger(nota) ? nota : arredondarExcel(nota);
  return ESCALA_NOTAS.find((e) => e.nota === inteira)?.rotulo ?? null;
}

/** ROUND do Excel (meio para cima), usado na classificação da média. */
export function arredondarExcel(valor: number): number {
  return Math.sign(valor) * Math.round(Math.abs(valor));
}

export function notaDe(notas: Notas, numero: number): number | null {
  const v = notas[String(numero)];
  // Notas do avaliador são inteiras; médias dos colegas podem ter casas decimais.
  return typeof v === "number" && Number.isFinite(v) && v >= NOTA_MIN && v <= NOTA_MAX ? v : null;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Média geral: igual à fórmula da planilha (média das notas preenchidas). */
export function mediaGeral(notas: Notas): number | null {
  return media(COMPETENCIAS.map((c) => notaDe(notas, c.numero)).filter((n): n is number => n !== null));
}

export function classificarMedia(valor: number | null): string | null {
  return valor === null ? null : classificar(arredondarExcel(valor));
}

export function preenchidas(notas: Notas): number {
  return COMPETENCIAS.filter((c) => notaDe(notas, c.numero) !== null).length;
}

export function completa(notas: Notas): boolean {
  return preenchidas(notas) === COMPETENCIAS.length;
}

export function mediasPorPilar(notas: Notas): Record<Pilar, number | null> {
  const saida = {} as Record<Pilar, number | null>;
  for (const pilar of PILARES) {
    saida[pilar] = media(
      COMPETENCIAS.filter((c) => c.pilar === pilar)
        .map((c) => notaDe(notas, c.numero))
        .filter((n): n is number => n !== null),
    );
  }
  return saida;
}

/* ------------------------------------------------- Avaliação pelos colegas */

/**
 * Mínimo de respostas para mostrar a média dos colegas de alguém. Com uma só
 * resposta daria para deduzir quem respondeu.
 */
export const MIN_RESPOSTAS_COLEGAS = 2;

export const VISOES = ["minha", "colegas", "combinada"] as const;
export type Visao = (typeof VISOES)[number];

export const ROTULO_VISAO: Record<Visao, string> = {
  minha: "Minha avaliação",
  colegas: "Média dos colegas",
  combinada: "Combinada",
};

export const DESCRICAO_VISAO: Record<Visao, string> = {
  minha: "Só as notas que você deu.",
  colegas: `Média anônima das notas dadas pelos colegas (mínimo de ${MIN_RESPOSTAS_COLEGAS} respostas por pessoa).`,
  combinada: "Metade sua nota, metade a média dos colegas, item a item.",
};

export function lerVisao(valor: unknown): Visao {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return VISOES.includes(v as Visao) ? (v as Visao) : "minha";
}

/** Média item a item de várias avaliações (ex.: respostas dos colegas). */
export function mediaDasNotas(lista: Notas[]): Notas {
  const saida: Notas = {};
  for (const c of COMPETENCIAS) {
    const valores = lista.map((n) => notaDe(n, c.numero)).filter((v): v is number => v !== null);
    const m = media(valores);
    if (m !== null) saida[String(c.numero)] = m;
  }
  return saida;
}

/** Média simples entre duas avaliações, item a item (usa a que existir). */
export function combinarNotas(a: Notas, b: Notas): Notas {
  const saida: Notas = {};
  for (const c of COMPETENCIAS) {
    const va = notaDe(a, c.numero);
    const vb = notaDe(b, c.numero);
    const m = media([va, vb].filter((v): v is number => v !== null));
    if (m !== null) saida[String(c.numero)] = m;
  }
  return saida;
}

/** Notas de uma pessoa na visão escolhida. */
export function notasNaVisao(minha: Notas, respostasColegas: Notas[], visao: Visao): Notas {
  const colegas = respostasColegas.length >= MIN_RESPOSTAS_COLEGAS ? mediaDasNotas(respostasColegas) : {};
  if (visao === "minha") return minha;
  if (visao === "colegas") return colegas;
  return combinarNotas(minha, colegas);
}

/** Nota inteira para a planilha da empresa (ROUND do Excel). */
export function notasInteiras(notas: Notas): Notas {
  const saida: Notas = {};
  for (const c of COMPETENCIAS) {
    const v = notaDe(notas, c.numero);
    if (v !== null) saida[String(c.numero)] = arredondarExcel(v);
  }
  return saida;
}

/* ----------------------------------------------------------- Matriz 9-box */

export type Faixa = "BAIXO" | "MEDIO" | "ALTO";

/** 1–6 até "Regular" = baixo; 7–8 "Bom/Muito bom" = médio; 9–10 = alto. */
export function faixa(valor: number): Faixa {
  if (valor >= 8.5) return "ALTO";
  if (valor >= 6.5) return "MEDIO";
  return "BAIXO";
}

export const ROTULO_FAIXA: Record<Faixa, string> = { BAIXO: "Baixo", MEDIO: "Médio", ALTO: "Alto" };

/**
 * Potencial = item 1 da planilha ("O quanto este colaborador demonstra
 * potencial para crescimento"). Desempenho = média dos demais itens.
 */
export function eixos9Box(notas: Notas): { desempenho: number | null; potencial: number | null } {
  const potencial = notaDe(notas, 1);
  const desempenho = media(
    COMPETENCIAS.filter((c) => c.numero !== 1)
      .map((c) => notaDe(notas, c.numero))
      .filter((n): n is number => n !== null),
  );
  return { desempenho, potencial };
}

type Quadrante = { titulo: string; orientacao: string };

/** Chave: `${potencial}-${desempenho}`. */
export const QUADRANTES_9BOX: Record<`${Faixa}-${Faixa}`, Quadrante> = {
  "ALTO-ALTO": {
    titulo: "Talento-chave",
    orientacao:
      "Dar desafios maiores: substituir o chefe de equipe em plantões, conduzir instruções e PTR-BA, ser mentor de colegas. Combinar um plano de carreira e reconhecer publicamente.",
  },
  "ALTO-MEDIO": {
    titulo: "Potencial em ascensão",
    orientacao:
      "Tem fôlego para crescer, mas a entrega ainda não acompanha. Metas curtas e claras por plantão, feedback semanal e um mentor experiente aceleram a virada.",
  },
  "ALTO-BAIXO": {
    titulo: "Enigma",
    orientacao:
      "Potencial alto com entrega baixa costuma indicar desalinhamento (função, rotina, motivação ou algo pessoal). Começar por uma conversa 1:1 de escuta antes de cobrar resultado.",
  },
  "MEDIO-ALTO": {
    titulo: "Forte desempenho",
    orientacao:
      "Entrega muito bem. Desenvolver uma competência que amplie o alcance (liderança, comunicação, instrução) e dar autonomia em tarefas de referência da equipe.",
  },
  "MEDIO-MEDIO": {
    titulo: "Mantenedor",
    orientacao:
      "Base sólida da equipe. Escolher uma ou duas competências para subir de nível no ciclo e acompanhar em check-ins mensais.",
  },
  "MEDIO-BAIXO": {
    titulo: "Questionável",
    orientacao:
      "Definir com a pessoa 2 ou 3 entregas objetivas, combinar prazo de 60–90 dias e acompanhar de perto, com apoio prático no posto.",
  },
  "BAIXO-ALTO": {
    titulo: "Especialista confiável",
    orientacao:
      "Referência técnica. Valorizar o conhecimento (instrutor de rotinas, guardião de checklists) sem forçar crescimento para cargos que ela não busca.",
  },
  "BAIXO-MEDIO": {
    titulo: "Eficaz",
    orientacao:
      "Cumpre o esperado. Reforçar reconhecimento, manter o engajamento e oferecer pequenos desafios para não estagnar.",
  },
  "BAIXO-BAIXO": {
    titulo: "Atenção prioritária",
    orientacao:
      "Precisa de plano de recuperação formal: expectativas por escrito, acompanhamento quinzenal, treinamento direcionado e registro da evolução.",
  },
};

export function quadrante9Box(notas: Notas): (Quadrante & { potencial: Faixa; desempenho: Faixa }) | null {
  const { desempenho, potencial } = eixos9Box(notas);
  if (desempenho === null || potencial === null) return null;
  const p = faixa(potencial);
  const d = faixa(desempenho);
  return { ...QUADRANTES_9BOX[`${p}-${d}`], potencial: p, desempenho: d };
}

/* ------------------------------------------------- Sugestões de desenvolvimento */

/**
 * Ações por competência no modelo 70-20-10 (70% prática no trabalho, 20%
 * troca com outras pessoas, 10% formação), adaptadas à rotina do SESCINC.
 */
type Acoes = { pratica: string; troca: string; formacao: string };

export const ACOES_COMPETENCIA: Record<number, Acoes> = {
  1: {
    pratica: "Assumir uma responsabilidade nova no plantão (ex.: conduzir o checklist de uma viatura ou o briefing de início).",
    troca: "Conversa de carreira 1:1: onde quer estar em 2 anos e o que falta para chegar lá.",
    formacao: "Escolher um curso que o aproxime da próxima função (CBA-MC, CBA-CE, instrutor).",
  },
  2: {
    pratica: "Rodar entre postos (CCI, CRS, comunicação) para ganhar repertório em situações diferentes.",
    troca: "Debriefing curto após ocorrências e simulados: o que mudou no cenário e como reagimos.",
    formacao: "Exercícios de tomada de decisão com cenários variados (mesa e campo).",
  },
  3: {
    pratica: "Liderar uma tarefa da equipe do começo ao fim (inspeção, limpeza de viatura, treinamento físico).",
    troca: "Observar e receber feedback do chefe de equipe sobre postura e firmeza na condução.",
    formacao: "Leitura ou curso curto de liderança situacional e comunicação assertiva.",
  },
  4: {
    pratica: "Combinar prazos claros para as tarefas do plantão e conferir a entrega no fim do turno.",
    troca: "Fazer dupla com um colega muito produtivo em checklists e manutenção de primeiro escalão.",
    formacao: "Técnicas simples de organização do tempo (lista de prioridades do turno).",
  },
  5: {
    pratica: "Treino prático semanal no equipamento ou procedimento em que tem menos domínio (CCI, EPR, salvamento).",
    troca: "Mentoria com o colega de maior nota técnica da equipe; ensinar o que aprendeu a outro colega.",
    formacao: "Revisar NRs, manuais da viatura e procedimentos do PCINC; reciclagens em dia.",
  },
  7: {
    pratica: "Praticar a pausa antes de reagir em situações de tensão e nomear a emoção (\"estou irritado porque…\").",
    troca: "Feedback de colegas de confiança sobre como reage sob pressão.",
    formacao: "Conteúdo de inteligência emocional e gestão do estresse em serviço de emergência.",
  },
  8: {
    pratica: "Montar a lista de prioridades do turno e manter o posto, armário e materiais em ordem (5S).",
    troca: "Aprender o método de um colega bem organizado e combinar padrões comuns de guarda de material.",
    formacao: "Noções de 5S e gestão de prioridades (urgente × importante).",
  },
  9: {
    pratica: "Depois de um contratempo, registrar o que aprendeu e o que fará diferente.",
    troca: "Rodas de conversa da equipe após ocorrências difíceis, com espaço seguro para falar.",
    formacao: "Programa de saúde mental e resiliência para equipes de emergência.",
  },
  10: {
    pratica: "Cuidar do descarte correto de resíduos, contenção de vazamentos e uso consciente de LGE e água nos treinos.",
    troca: "Ser o responsável da equipe por um item ambiental (descarte de EPI, óleo, resíduos) e repassar aos colegas.",
    formacao: "Treinamento sobre impacto ambiental de agentes extintores e plano de emergência ambiental do aeroporto.",
  },
  11: {
    pratica: "Participar de ações com a comunidade aeroportuária (visitas, palestras de prevenção).",
    troca: "Ouvir colegas de outras áreas (TWR, APOC, operações) para entender o impacto do nosso serviço.",
    formacao: "Conteúdos de cidadania, diversidade e relacionamento interpessoal.",
  },
  12: {
    pratica: "Deixar algo documentado para a equipe: um procedimento, um checklist melhorado ou um treinamento.",
    troca: "Mentorar um colega mais novo ou recém-chegado.",
    formacao: "Formação de instrutor/multiplicador para transmitir o conhecimento.",
  },
  13: {
    pratica: "Ao errar ou atrasar algo, assumir e propor a correção na hora, sem buscar culpados.",
    troca: "Check-in 1:1 em que a própria pessoa avalia o que entregou e o que ficou devendo.",
    formacao: "Conteúdo sobre autorresponsabilidade e cultura justa (just culture) em segurança operacional.",
  },
  14: {
    pratica: "Oferecer ajuda ativa em tarefas de outros postos quando terminar as suas.",
    troca: "Atividades em dupla ou trio que dependam de todos para fechar (simulados, manutenção).",
    formacao: "Dinâmicas de trabalho em equipe e comunicação em equipes de alto desempenho.",
  },
  15: {
    pratica: "Perguntar e ouvir antes de opinar; perceber como o colega está no início do plantão.",
    troca: "Feedback 360 informal: como os colegas percebem sua forma de tratar as pessoas.",
    formacao: "Comunicação não violenta (CNV) e escuta ativa.",
  },
  16: {
    pratica: "Seguir o procedimento padrão e o checklist mesmo nas tarefas rotineiras; pausar quando o risco subir.",
    troca: "Revisar em dupla as tarefas críticas antes de executar.",
    formacao: "Gestão de risco, fatores humanos e prevenção de fadiga.",
  },
  17: {
    pratica: "Levar propostas de melhoria com fato, benefício e custo, e ouvir as objeções antes de defender.",
    troca: "Participar de reuniões de equipe apresentando uma ideia por mês.",
    formacao: "Técnicas de negociação colaborativa (ganha-ganha) e argumentação.",
  },
  18: {
    pratica: "Uso correto e integral de EPI/EPR, inspeção diária e reporte imediato de condições inseguras.",
    troca: "Ser o \"olho de segurança\" da equipe em treinamentos, com rodízio entre todos.",
    formacao: "Reciclagem das NRs (6, 10, 12, 20, 23, 35) e cultura de segurança.",
  },
  19: {
    pratica: "Ser dono de um resultado da equipe (ex.: tempo-resposta, conservação de uma viatura).",
    troca: "Conversa 1:1 para entender o que motiva e o que desanima no trabalho hoje.",
    formacao: "Conteúdo sobre propósito e engajamento no serviço de salvamento.",
  },
  20: {
    pratica: "Fazer comunicações de rádio e passagens de serviço claras e completas (o quê, onde, quando, quem).",
    troca: "Feedback do chefe de equipe sobre clareza nas comunicações e nos relatórios do LRO.",
    formacao: "Fraseologia, comunicação em emergências e escrita objetiva de relatórios.",
  },
  21: {
    pratica: "Usar e propor ferramentas digitais (SCI NVT, Delta Mais, checklists por QR Code) no dia a dia.",
    troca: "Ensinar um colega a usar uma ferramenta nova ou aprender com quem domina.",
    formacao: "Cursos curtos de ferramentas digitais e melhoria contínua.",
  },
  22: {
    pratica: "Cumprir horários, escala, uniforme e regras do posto sem precisar de lembrete.",
    troca: "Combinar expectativas claras com o chefe de equipe e revisar no check-in mensal.",
    formacao: "Rever normas internas, código de conduta e regulamento do SESCINC.",
  },
  23: {
    pratica: "Definir no início do plantão um objetivo pessoal (treino, estudo, melhoria) e conferir no final.",
    troca: "Combinar metas trimestrais com o chefe de equipe e acompanhar juntos.",
    formacao: "Planejamento pessoal de metas (método SMART).",
  },
  24: {
    pratica: "Antecipar necessidades: conferir materiais, reportar falhas e propor solução antes de ser pedido.",
    troca: "Reconhecer em público quando a pessoa age com iniciativa, para reforçar o comportamento.",
    formacao: "Conteúdo sobre iniciativa, protagonismo e melhoria contínua (kaizen).",
  },
};

export type Destaque = {
  competencia: Competencia;
  nota: number;
  mediaEquipe: number | null;
};

function ordenarPor(notas: Notas, ordem: "asc" | "desc"): Destaque[] {
  return COMPETENCIAS.map((competencia) => ({
    competencia,
    nota: notaDe(notas, competencia.numero),
    mediaEquipe: null as number | null,
  }))
    .filter((d): d is Destaque => d.nota !== null)
    .sort((a, b) => (ordem === "asc" ? a.nota - b.nota : b.nota - a.nota) || a.competencia.numero - b.competencia.numero);
}

export function pontosFortes(notas: Notas, quantos = 3): Destaque[] {
  return ordenarPor(notas, "desc").filter((d) => d.nota >= 7).slice(0, quantos);
}

/**
 * Prioridades de desenvolvimento: as menores notas; em empate, pesa mais a
 * competência em que a pessoa está mais abaixo da média da equipe.
 */
export function prioridades(
  notas: Notas,
  mediasEquipe: Record<number, number | null> = {},
  quantos = 3,
): Destaque[] {
  return COMPETENCIAS.map((competencia) => ({
    competencia,
    nota: notaDe(notas, competencia.numero),
    mediaEquipe: mediasEquipe[competencia.numero] ?? null,
  }))
    .filter((d): d is Destaque => d.nota !== null && d.nota < 9)
    .sort((a, b) => {
      if (a.nota !== b.nota) return a.nota - b.nota;
      const ga = (a.mediaEquipe ?? a.nota) - a.nota;
      const gb = (b.mediaEquipe ?? b.nota) - b.nota;
      return gb - ga || a.competencia.numero - b.competencia.numero;
    })
    .slice(0, quantos);
}

/* ------------------------------------------------------------ Visão da equipe */

export type AvaliacaoPessoa = { id: number; nome: string; nomeGuerra: string | null; notas: Notas };

export type AnaliseEquipe = {
  avaliados: number;
  mediaEquipe: number | null;
  /** Por número do item. */
  mediaPorCompetencia: Record<number, number | null>;
  /** Desvio-padrão por item: alto = equipe desigual nessa competência. */
  desvioPorCompetencia: Record<number, number | null>;
  mediaPorPilar: Record<Pilar, number | null>;
  /** Competências mais fracas da equipe (média), da pior para a melhor. */
  criticas: { competencia: Competencia; media: number; desvio: number }[];
  fortes: { competencia: Competencia; media: number }[];
  /** Para cada competência crítica, quem pode ensinar e quem mais precisa. */
  duplas: { competencia: Competencia; mentor: AvaliacaoPessoa; mentorNota: number; aprendizes: { pessoa: AvaliacaoPessoa; nota: number }[] }[];
};

function desvio(valores: number[]): number | null {
  const m = media(valores);
  if (m === null) return null;
  return Math.sqrt(valores.reduce((a, v) => a + (v - m) ** 2, 0) / valores.length);
}

export function analisarEquipe(avaliacoes: AvaliacaoPessoa[]): AnaliseEquipe {
  const comNotas = avaliacoes.filter((a) => preenchidas(a.notas) > 0);
  const mediaPorCompetencia: Record<number, number | null> = {};
  const desvioPorCompetencia: Record<number, number | null> = {};
  for (const c of COMPETENCIAS) {
    const valores = comNotas.map((a) => notaDe(a.notas, c.numero)).filter((n): n is number => n !== null);
    mediaPorCompetencia[c.numero] = media(valores);
    desvioPorCompetencia[c.numero] = desvio(valores);
  }
  const mediaPorPilar = {} as Record<Pilar, number | null>;
  for (const p of PILARES) {
    mediaPorPilar[p] = media(
      COMPETENCIAS.filter((c) => c.pilar === p)
        .map((c) => mediaPorCompetencia[c.numero])
        .filter((n): n is number => n !== null),
    );
  }
  const ranking = COMPETENCIAS.map((competencia) => ({
    competencia,
    media: mediaPorCompetencia[competencia.numero],
    desvio: desvioPorCompetencia[competencia.numero] ?? 0,
  })).filter((r): r is { competencia: Competencia; media: number; desvio: number } => r.media !== null);

  const criticas = [...ranking].sort((a, b) => a.media - b.media || b.desvio - a.desvio).slice(0, 4);
  const fortes = [...ranking].sort((a, b) => b.media - a.media).slice(0, 3);

  const duplas = criticas
    .map(({ competencia }) => {
      const notas = comNotas
        .map((pessoa) => ({ pessoa, nota: notaDe(pessoa.notas, competencia.numero) }))
        .filter((x): x is { pessoa: AvaliacaoPessoa; nota: number } => x.nota !== null)
        .sort((a, b) => b.nota - a.nota);
      const melhor = notas[0];
      if (!melhor || melhor.nota < 8) return null;
      const aprendizes = notas.filter((x) => x.nota <= Math.min(7, melhor.nota - 2)).reverse().slice(0, 3);
      if (aprendizes.length === 0) return null;
      return { competencia, mentor: melhor.pessoa, mentorNota: melhor.nota, aprendizes };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return {
    avaliados: comNotas.length,
    mediaEquipe: media(comNotas.map((a) => mediaGeral(a.notas)).filter((n): n is number => n !== null)),
    mediaPorCompetencia,
    desvioPorCompetencia,
    mediaPorPilar,
    criticas,
    fortes,
    duplas,
  };
}

/** Ações de equipe por pilar mais fraco (práticas atuais de gestão de pessoas). */
export const ACOES_PILAR: Record<Pilar, string> = {
  POTENCIAL:
    "Mapear com cada pessoa a próxima etapa de carreira (CBA-MC, CBA-CE, instrutor) e montar um plano de sucessão para os postos-chave da equipe.",
  EXCELENCIA:
    "Instituir o After Action Review (debriefing de 10 minutos) depois de cada ocorrência, simulado ou PTR-BA: o que era esperado, o que aconteceu, por quê, o que repetir.",
  ATITUDE:
    "Cuidar da segurança psicológica: abrir o plantão com um check-in rápido de como cada um está e tratar erros como aprendizado, não como punição.",
  LEGADO:
    "Criar a biblioteca da equipe: cada pessoa documenta um procedimento ou checklist por trimestre e ensina aos demais.",
  GRATIDAO:
    "Reconhecimento frequente e específico: destacar no fim do plantão quem fez a diferença e por quê (o reconhecimento pesa mais quando é imediato).",
  PATRIMONIO:
    "Campanha de cuidado com viaturas, EPIs e instalações, com um responsável por item e indicador simples (ex.: avarias no mês).",
  ORGULHO:
    "Mostrar o impacto do trabalho: compartilhar resultados (tempo-resposta, ocorrências atendidas, elogios recebidos) e envolver a equipe em ações com a comunidade aeroportuária.",
  PROPOSITO:
    "Combinar 2 ou 3 objetivos da equipe para o trimestre (OKRs simples) e revisar juntos no início de cada mês.",
};

/** Rotinas recomendadas independentemente do resultado. */
export const ROTINAS_GESTAO = [
  {
    titulo: "Check-ins 1:1 mensais",
    texto: "15 minutos com cada pessoa: como está, o que entregou, o que precisa de apoio. A avaliação anual vira só a consolidação desses encontros.",
  },
  {
    titulo: "Feedback contínuo (modelo SBI)",
    texto: "Situação, comportamento e impacto, logo depois do fato. Elogio em público, correção em particular.",
  },
  {
    titulo: "PDI no modelo 70-20-10",
    texto: "Para cada prioridade: 70% prática no posto, 20% troca com colegas/mentor e 10% curso ou estudo. Uma meta por vez, com prazo.",
  },
  {
    titulo: "Mentoria entre pares",
    texto: "Quem tem nota alta numa competência ensina quem está abaixo; quem ensina também cresce (efeito protégé).",
  },
  {
    titulo: "Reavaliação trimestral",
    texto: "Atualizar as notas a cada trimestre para ver a evolução e ajustar o PDI, sem esperar o próximo ciclo anual.",
  },
] as const;

export function rotuloPilar(p: Pilar): string {
  return ROTULO_PILAR[p];
}

export function formatarNota(valor: number | null, casas = 1): string {
  return valor === null ? "—" : valor.toFixed(casas).replace(".", ",");
}
