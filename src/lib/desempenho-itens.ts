/**
 * Avaliação de desempenho: itens, textos e escala idênticos à planilha
 * "Avaliação de desempenho 2026" enviada à empresa. Não altere os textos:
 * a exportação preenche a planilha original e o formulário precisa bater com ela.
 */

export const TEXTOS_PLANILHA = {
  titulo: "AVALIAÇÃO DE DESEMPENHO 2026",
  instrucao: "Cada colaborador tem seu próprio bloco abaixo (12 no total). Preencha o nome e as notas de 1 a 10 nas células amarelas; classificação e média são automáticas.",
  escalaTitulo: "ESCALA DE NOTAS",
  nomeRotulo: "Nome do(a) colaborador(a):",
  cabecalho: ["Nº", "Competência", "Pergunta / descrição da competência", "Comportamento esperado", "Nota (1–10)", "Classificação"] as const,
  observacao: "Obs.: a numeração dos itens segue o PDF original, que não possui o item 6. Texto do item 8 corrigido (\"apacidade\" → \"Capacidade\").",
  resumoTitulo: "RESUMO DA AVALIAÇÃO 2026",
  resumoCabecalho: ["Nº", "Colaborador", "Média geral", "Classificação"] as const,
};

export const ESCALA_NOTAS = [
  { nota: 1, rotulo: "Péssimo" },
  { nota: 2, rotulo: "Insatisfatório" },
  { nota: 3, rotulo: "Abaixo do esperado" },
  { nota: 4, rotulo: "Mediano" },
  { nota: 5, rotulo: "Em desenvolvimento" },
  { nota: 6, rotulo: "Regular" },
  { nota: 7, rotulo: "Bom" },
  { nota: 8, rotulo: "Muito bom" },
  { nota: 9, rotulo: "Excepcional" },
  { nota: 10, rotulo: "Especialista valioso" },
] as const;

/** Grupos pelo "Comportamento esperado" (valores da empresa), usados só nos painéis. */
export const PILARES = [
  "POTENCIAL",
  "EXCELENCIA",
  "ATITUDE",
  "LEGADO",
  "GRATIDAO",
  "PATRIMONIO",
  "ORGULHO",
  "PROPOSITO",
] as const;
export type Pilar = (typeof PILARES)[number];

export const ROTULO_PILAR: Record<Pilar, string> = {
  POTENCIAL: "Potencial",
  EXCELENCIA: "Excelência",
  ATITUDE: "Atitude positiva",
  LEGADO: "Legado",
  GRATIDAO: "Gratidão",
  PATRIMONIO: "Patrimônio e sustentabilidade",
  ORGULHO: "Orgulho de pertencer",
  PROPOSITO: "Propósito",
};

export type Competencia = {
  numero: number;
  competencia: string;
  pergunta: string;
  comportamento: string;
  pilar: Pilar;
};

/** Os 23 itens, na ordem da planilha (a numeração original não tem o item 6). */
export const COMPETENCIAS: readonly Competencia[] = [
  {
    numero: 1,
    competencia: "Performance",
    pergunta: "O quanto este colaborador demonstra potencial para crescimento dentro da empresa?",
    comportamento: "Avaliação do potencial de desenvolvimento do colaborador.",
    pilar: "POTENCIAL",
  },
  {
    numero: 2,
    competencia: "Adaptabilidade",
    pergunta: "Aptidão para se encaixar às situações apresentadas no dia-a-dia, tomando as melhores ações.",
    comportamento: "Buscar constantemente a excelência e resultados excepcionais em todas as atividades.",
    pilar: "EXCELENCIA",
  },
  {
    numero: 3,
    competencia: "Autoridade",
    pergunta: "Indique o nível de alinhamento da pessoa colaboradora a esta competência:",
    comportamento: "Buscar constantemente a excelência e resultados excepcionais em todas as atividades.",
    pilar: "EXCELENCIA",
  },
  {
    numero: 4,
    competencia: "Produtividade",
    pergunta: "Capacidade de produzir e construir as demandas dentro dos prazos e tempo estipulado.",
    comportamento: "Buscar constantemente a excelência e resultados excepcionais em todas as atividades.",
    pilar: "EXCELENCIA",
  },
  {
    numero: 5,
    competencia: "Conhecimento Técnico",
    pergunta: "O colaborador demonstra domínio dos conhecimentos técnicos necessários para executar suas atividades com qualidade, segurança e excelência, aplicando boas práticas e atualizações da sua área.",
    comportamento: "Buscar constantemente a excelência e resultados excepcionais em todas as atividades.",
    pilar: "EXCELENCIA",
  },
  {
    numero: 7,
    competencia: "Inteligência emocional",
    pergunta: "Capacidade de identificar e lidar com as emoções e sentimentos pessoais e de outros.",
    comportamento: "Manter uma atitude positiva e determinada diante dos desafios, inspirando confiança em si mesmo e nos outros.",
    pilar: "ATITUDE",
  },
  {
    numero: 8,
    competencia: "Organização",
    pergunta: "Capacidade de ordenar, por prioridade, demandas e ações para o melhor andamento do serviço e dos resultados.",
    comportamento: "Manter uma atitude positiva e determinada diante dos desafios, inspirando confiança em si mesmo e nos outros.",
    pilar: "ATITUDE",
  },
  {
    numero: 9,
    competencia: "Resiliência",
    pergunta: "Capacidade de se adaptar as mudanças difíceis de forma a aprender com a situação.",
    comportamento: "Manter uma atitude positiva e determinada diante dos desafios, inspirando confiança em si mesmo e nos outros.",
    pilar: "ATITUDE",
  },
  {
    numero: 10,
    competencia: "Respeito ao Meio Ambiente",
    pergunta: "Capacidade de demonstrar respeito às riquezas naturais e preocupação efetiva com a preservação do meio ambiente.",
    comportamento: "Construir o legado que deseja deixar no mundo e na vida das pessoas ao seu redor, buscando sempre contribuir para um mundo melhor com consciência sustentável e coletiva.",
    pilar: "LEGADO",
  },
  {
    numero: 11,
    competencia: "Visão Social",
    pergunta: "Aptidão de ver o padrão de comportamento do individuo com a sociedade que ocorre por meio de suas relações com a sociedade",
    comportamento: "Construir o legado que deseja deixar no mundo e na vida das pessoas ao seu redor, buscando sempre contribuir para um mundo melhor com consciência sustentável e coletiva.",
    pilar: "LEGADO",
  },
  {
    numero: 12,
    competencia: "Legado",
    pergunta: "A palavra legar é o ato de fazer um legado, de deixar uma marca",
    comportamento: "Construir o legado que deseja deixar no mundo e na vida das pessoas ao seu redor, buscando sempre contribuir para um mundo melhor com consciência sustentável e coletiva.",
    pilar: "LEGADO",
  },
  {
    numero: 13,
    competencia: "Autorresponsabilidade",
    pergunta: "Capacidade de enxergar suas próprias responsabilidades e assumir (negativa ou positivamente) seus resultados.",
    comportamento: "Manifestar gratidão sincera diariamente, reconhecendo as muitas coisas positivas que acontecem ao nosso redor.",
    pilar: "GRATIDAO",
  },
  {
    numero: 14,
    competencia: "Cooperação",
    pergunta: "Atitude de colaborar na construção coletiva para atingir objetivos definidos.",
    comportamento: "Manifestar gratidão sincera diariamente, reconhecendo as muitas coisas positivas que acontecem ao nosso redor.",
    pilar: "GRATIDAO",
  },
  {
    numero: 15,
    competencia: "Empatia",
    pergunta: "Capacidade de interagir e entender o sentimento dos outros para construir melhores relações interpessoais.",
    comportamento: "Manifestar gratidão sincera diariamente, reconhecendo as muitas coisas positivas que acontecem ao nosso redor.",
    pilar: "GRATIDAO",
  },
  {
    numero: 16,
    competencia: "Assertividade",
    pergunta: "Fazer as coisas de forma correta, evitando riscos, exaustão, estresse e primando pelo equilíbrio no ambiente.",
    comportamento: "Respeitar o patrimônio da empresa, adotando práticas sustentáveis no dia a dia que beneficiem não apenas a empresa, mas também contribuam positivamente para o meio ambiente e o mundo.",
    pilar: "PATRIMONIO",
  },
  {
    numero: 17,
    competencia: "Negociação",
    pergunta: "Capacidade de interagir, apresentando ideias e avaliando propostas, trocando informações para o melhor andamento do processo de trabalho.",
    comportamento: "Respeitar o patrimônio da empresa, adotando práticas sustentáveis no dia a dia que beneficiem não apenas a empresa, mas também contribuam positivamente para o meio ambiente e o mundo.",
    pilar: "PATRIMONIO",
  },
  {
    numero: 18,
    competencia: "Segurança",
    pergunta: "Atitudes que levam à ações certas para o bem pessoal e organizacional da empresa",
    comportamento: "Respeitar o patrimônio da empresa, adotando práticas sustentáveis no dia a dia que beneficiem não apenas a empresa, mas também contribuam positivamente para o meio ambiente e o mundo.",
    pilar: "PATRIMONIO",
  },
  {
    numero: 19,
    competencia: "Comprometimento",
    pergunta: "Capacidade de se envolver com algo, se responsabilizando e se engajando para melhores resultados.",
    comportamento: "Sentir orgulho e satisfação em representar a empresa, valorizando seu papel e contribuindo positivamente com colegas e clientes.",
    pilar: "ORGULHO",
  },
  {
    numero: 20,
    competencia: "Comunicação",
    pergunta: "Forma de interagir com as pessoas e com o meio, usando também as ferramentas de comunicação da empresa.",
    comportamento: "Sentir orgulho e satisfação em representar a empresa, valorizando seu papel e contribuindo positivamente com colegas e clientes.",
    pilar: "ORGULHO",
  },
  {
    numero: 21,
    competencia: "Inovação",
    pergunta: "Estar aberto à novas ideias, à novos processos e à novas mudanças, principalmente tecnológicas e digitais, no cenário atual da Med+.",
    comportamento: "Sentir orgulho e satisfação em representar a empresa, valorizando seu papel e contribuindo positivamente com colegas e clientes.",
    pilar: "ORGULHO",
  },
  {
    numero: 22,
    competencia: "Disciplina",
    pergunta: "Capacidade de se subordinar e se integrar às regras e condutas da empresa.",
    comportamento: "Amar o que faz, alinhando suas ações com os valores da Med Mais e buscando impactar positivamente a vida das pessoas. O propósito é o combustível que impulsiona a realização da sua missão.",
    pilar: "PROPOSITO",
  },
  {
    numero: 23,
    competencia: "Foco",
    pergunta: "Entenda como objetivo claro sobre a sua missão profissional.",
    comportamento: "Amar o que faz, alinhando suas ações com os valores da Med Mais e buscando impactar positivamente a vida das pessoas. O propósito é o combustível que impulsiona a realização da sua missão.",
    pilar: "PROPOSITO",
  },
  {
    numero: 24,
    competencia: "Proatividade",
    pergunta: "Capacidade de fazer acontecer, tomar para si a atitude de fazer algo sem esperar.",
    comportamento: "Amar o que faz, alinhando suas ações com os valores da Med Mais e buscando impactar positivamente a vida das pessoas. O propósito é o combustível que impulsiona a realização da sua missão.",
    pilar: "PROPOSITO",
  },
];
