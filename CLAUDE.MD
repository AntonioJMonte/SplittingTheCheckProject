# Projeto: Plataforma de Rachamento de Contas em Grupo

## Visão geral
API REST + WebSocket para grupos compartilharem despesas.
Calcula automaticamente quem deve a quem usando algoritmo de
minimização de transações. Categoriza despesas via LLM como fallback.

## Stack
- TypeScript 5+ / Node.js 20 LTS
- Fastify 4+ (HTTP)
- Prisma ORM 5+ / PostgreSQL 16
- Socket.io (WebSocket)
- Redis (cache + pub/sub)
- Zod (validação)
- Vitest (testes)
- decimal.js (aritmética monetária)
- Anthropic SDK (categorização)
- Docker Compose (ambiente local)

## Arquitetura
DDD + Clean Architecture em camadas. Regra inviolável:
domínio NUNCA importa de fora. Direção de dependência:
infra → application → domain.

Estrutura:
- src/domain/        → entidades, value objects, services puros
- src/application/   → use cases + interfaces de repositório
- src/infra/         → Prisma, HTTP, WebSocket, LLM, Pix
- src/shared/        → erros, utils
- tests/             → unit, integration, factories

## Padrões obrigatórios
- SOLID: cada arquivo tem UMA responsabilidade
- Repositórios são interfaces em /application,
  implementações concretas em /infra/database/repositories
- Validação de payloads com Zod nos controllers
- Erros de domínio extendem DomainError
- Aritmética monetária SEMPRE com decimal.js, nunca float
- Variáveis de ambiente validadas com Zod no startup
- Testes unitários para domain services e use cases

## Convenções de código
- TypeScript strict mode
- Sem comentários óbvios; documentar apenas decisões não-triviais
- Nomes em inglês no código, mensagens de erro em português
- Imports ordenados: libs externas → internos
- Sem console.log em código de produção; usar pino

## Comandos comuns
- npm run dev         → servidor com hot reload
- npm test            → roda testes
- npm run test:watch  → testes em watch mode
- npm run db:migrate  → aplica migrations
- docker compose up   → sobe Postgres + Redis

## Glossário do domínio
- Group: agregado raiz, contém membros e despesas
- Member: vínculo User-Group com papel (OWNER ou MEMBER)
- Expense: despesa lançada por um pagador, dividida entre membros
- ExpenseShare: parte de uma despesa atribuída a um membro
- Settlement: acerto sugerido entre dois membros
- DebtMinimizer: domain service que calcula transferências mínimas

## O que NÃO fazer
- Não usar Express (escolha foi Fastify)
- Não usar TypeORM (escolha foi Prisma)
- Não criar arquivos com mais de uma responsabilidade
- Não retornar dados brutos do Prisma para HTTP — sempre passar
  pela camada de aplicação
- Não usar float para dinheiro
- Não chamar LLM antes de tentar regras determinísticas