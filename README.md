# Delta Mais

Escala de plantão noturno 12x36. Cada noite de serviço é uma data-âncora; a
rotação de 12 dias de serviço e 36 de folga sai da âncora configurada em
Configurações, junto com a escolha de dias pares ou ímpares do mês.

O app monta a escala do mês, deixa o bombeiro ocupar cada vaga, publica o mês
e exporta para CSV ou para impressão. Junto do plantão ele monta a escala de
rádio da central, com rodízio entre dois anéis.

## Stack

- Next.js 16 (App Router, Server Actions) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Drizzle ORM sobre Postgres
- Vitest

## Banco de dados

O app resolve o banco em `src/db/index.ts`:

| Situação | Driver | Onde os dados ficam |
| --- | --- | --- |
| `DATABASE_URL` definida | `@neondatabase/serverless` via `drizzle-orm/neon-http` | Neon (produção) |
| `DATABASE_URL` ausente | PGlite embarcado | `.data/escala` (ignorado pelo git) |

Os dois caminhos compartilham o mesmo tipo (`Database`) e o mesmo schema, então
as queries são idênticas. Em produção a variável é obrigatória: se a Vercel subir
sem `DATABASE_URL`, o app falha em vez de tentar criar um banco efêmero.

Como o driver HTTP do Neon não suporta transações, nada no repositório usa
`db.transaction`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Sem `.env.local`, o app sobe o PGlite em `.data/escala` e não pede credencial
nenhuma. Para pointer o dev para o Neon:

```bash
vercel env pull .env.local --yes
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `start` | Build e execução em produção |
| `npm run lint` / `typecheck` | ESLint e `tsc --noEmit` |
| `npm run test` / `test:watch` | Vitest (PGlite em memória, não toca em `.data`) |
| `npm run db:generate` | Gera SQL em `drizzle/` a partir de `src/db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações de `drizzle/` no banco de `DATABASE_URL` |
| `npm run db:push` | Sincroniza o schema sem histórico (só para PGlite local) |
| `npm run db:seed` | Semeia a equipe, as 10 vagas, os dois anéis de rádio e as configurações |

`drizzle-kit` não lê `.env.local`, então `db:migrate` passa pelo `dotenv-cli`.
`db:push` e `db:generate` devem ser rodados com a variável no ambiente.

## Deploy

O projeto não tem `vercel.json`: a Vercel detecta o Next.js sozinha e todas as
rotas são `force-dynamic`, então o build nunca toca o banco. O schema do Neon é
aplicado à mão, uma vez, e depois de cada mudança em `drizzle/`.

```bash
# 1. provisionar o Postgres (Marketplace) e puxar as variáveis
vercel integration add neon
vercel env pull .env.local --yes

# 2. aplicar schema e seed no Neon
npm run db:migrate
npm run db:seed

# 3. publicar
vercel --prod
```

Depois do primeiro deploy, `vercel git connect` passa a publicar a cada push em
`main`, e cada pull request ganha uma preview.

### Previews

A integração do Neon injeta `DATABASE_URL` em todos os ambientes, então preview
e produção apontam para o mesmo banco por padrão. Para isolar, crie um segundo
projeto no Neon e sobrescreva a variável apenas para preview:

```bash
vercel env add DATABASE_URL preview
npm run db:migrate   # com o .env.local apontando para o banco de preview
```

O app continua lendo `process.env.DATABASE_URL`; não há código de branching.

### Paridade das noites de serviço

`settings.noite_de_servico` guarda `IMPAR` ou `PAR`: em que dias do mês a equipe
entra de plantão. O 12x36 continua um ciclo de 48h, então quando a paridade
escolhida não bate com a da data-âncora, `ancoraDoCiclo()` anda a âncora um dia
(`src/lib/calendario.ts`). Assim as noites caem sempre nos dias pedidos sem
nunca dar duas noites seguidas.

A paridade é do ciclo, não do calendário: como o ciclo anda de dois em dois dias,
quem cai no dia 30 de outubro volta a cair no dia 1 de novembro. Ou seja, com a
âncora em `2026-10-02` e noites pares, outubro vai de 2 a 30, novembro de 1 a 29
e dezembro de 1 a 31. Para voltar aos dias pares em janeiro é preciso mudar a
âncora em Configurações.

### Escala de rádio

A escala de rádio acompanha o mês do plantão, com uma diferença: ela só mostra as
noites em que há equipe, nunca as noites inversas.

- Dois anéis de 4 operadores. A cada noite os anéis trocam de turno e a cada duas
  noites avançam uma posição; o ciclo fecha em 8 noites (16 dias).
- As faixas de 19:00 às 20:00 e de 06:00 às 07:00 são fixas: quem atende a central
  é o bombeiro escalado no `F3-BA2` do mês.
- `settings.radio_ancora` marca a noite zero do rádio. Ela precisa cair numa noite
  de serviço do plantão, senão o índice da noite sai quebrado e o rodízio gira
  meio passo; o formulário de Configurações avisa e mostra as primeiras noites
  antes de salvar.
- Só as trocas manuais são gravadas, em `radio_excecao`. O rodízio é recalculado a
  cada leitura, então mudar a âncora ou a equipe não apaga o que foi trocado.
- Numa noite cheia as oito faixas já têm alguém. Escolher outro operador no seletor
  troca as posições dos dois, e devolver a faixa ao rodízio desfaz a troca pareada.
- A impressão sai em folha separada (a grade é larga) e o CSV do rádio fica em
  `/escala/[ano]/[mes]/exportar/radio`, para não mudar o formato do CSV de
  plantão.

A edição da composição dos anéis pela interface ficou fora da primeira versão: os
anéis são semeados por `db:seed`.

### Observações de produção

- O app não tem autenticação: quem tiver a URL edita a escala.
  `vercel project protection` resolve sem escrever código.
- `@electric-sql/pglite` fica em `dependencies` porque `serverExternalPackages`
  o mantém como require externo; a Vercel instala o WASM (~10 MB) mesmo sem usá-lo.
- `semearPostos()` roda a cada request das páginas, o que gera uma escrita por
  visita. É idempotente, mas não é gratuito.
