# Splittr — Plataforma de Rachamento de Contas em Grupo

> API REST + WebSocket para grupos compartilharem despesas e calcularem automaticamente quem deve a quem, usando algoritmo de minimização de transações, sincronização em tempo real e categorização inteligente de despesas via LLM.

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)]()
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933)]()

---

## Índice

- [Sobre o projeto](#sobre-o-projeto)
- [Por que este projeto existe](#por-que-este-projeto-existe)
- [Funcionalidades](#funcionalidades)
- [Stack técnica](#stack-técnica)
- [Arquitetura](#arquitetura)
- [Status de desenvolvimento](#status-de-desenvolvimento)
- [Como rodar localmente](#como-rodar-localmente)
- [Documentação da API](#documentação-da-api)
- [Decisões arquiteturais](#decisões-arquiteturais)
- [Testes](#testes)
- [Roadmap](#roadmap)
- [Sobre o autor](#sobre-o-autor)

---

## Sobre o projeto

**Splittr** é uma API backend para grupos compartilharem despesas continuamente — repúblicas, viagens em grupo, casais, eventos — e resolverem automaticamente os acertos financeiros. O sistema calcula saldos em tempo real conforme despesas são lançadas e usa um algoritmo guloso de minimização para sugerir o **menor número possível de transferências** que zera todas as dívidas do grupo.

A categorização das despesas é híbrida: regras determinísticas resolvem 80% dos casos (ex: "Uber" → Transporte), e a LLM (Claude Haiku) entra apenas como fallback. Isso reduz custo, latência e dependência da API externa.

Para acertos, o sistema gera **Pix copia-e-cola** no padrão EMV/BR Code do Banco Central, permitindo transferência direta entre os membros.

---

## Por que este projeto existe

Grupos que dividem despesas continuamente enfrentam três problemas recorrentes:

1. **Cálculo manual propenso a erro:** somar despesas e cruzar quem pagou o quê é tedioso e gera disputas.
2. **Acertos desnecessariamente complexos:** quando A deve a B, B deve a C e C deve a A, é possível simplificar — mas ninguém calcula isso na mão.
3. **Falta de histórico auditável:** WhatsApp e planilhas não preservam contexto. Despesa lançada hoje precisa ser questionável daqui a 6 meses.

O Splitwise resolve isso, mas é em inglês, não integra com Pix, não é open source e tem limitações na versão gratuita. **Splittr** entrega o núcleo da funcionalidade adaptado ao mercado brasileiro.

---

## Funcionalidades

### Núcleo

- Autenticação JWT com access e refresh tokens
- Criação e gerenciamento de grupos com papéis (OWNER, MEMBER)
- Lançamento de despesas com três métodos de divisão: igualitária, valor fixo e percentual
- Cálculo automático de saldo de cada membro
- Algoritmo de minimização do número de transferências para zerar dívidas
- Histórico imutável e auditável de despesas e acertos

### Tempo real

- Sincronização via WebSocket entre membros conectados ao mesmo grupo
- Eventos: criação, atualização e exclusão de despesas; recálculo de saldos; confirmação de acertos

### Inteligência

- Categorização automática de despesas (Alimentação, Transporte, Moradia, Lazer, etc.)
- Estratégia híbrida: regras determinísticas primeiro, LLM apenas como fallback
- Cache de categorizações em Redis para reduzir chamadas à API

### Brasil

- Geração de Pix copia-e-cola no padrão EMV/BR Code com CRC16-CCITT
- Suporte a chave Pix por usuário para receber acertos

---

## Stack técnica

### Principais

| Tecnologia | Função |
|---|---|
| **TypeScript 5+** | Linguagem principal, com strict mode habilitado |
| **Node.js 20 LTS** | Runtime |
| **Fastify 4+** | Framework HTTP |
| **Prisma ORM 5+** | ORM type-safe com migrations declarativas |
| **PostgreSQL 16** | Banco relacional |
| **Socket.io** | WebSocket com salas e autenticação |
| **Redis** | Cache + pub/sub para WebSocket horizontalmente escalável |
| **Zod** | Validação runtime de payloads |
| **Vitest** | Test runner |
| **decimal.js** | Aritmética decimal precisa para valores monetários |
| **Anthropic SDK** | Cliente Claude API para categorização |
| **Docker + Docker Compose** | Ambiente reproduzível |

### Auxiliares

`bcryptjs` (hash de senha) · `jsonwebtoken` (JWT) · `@fastify/jwt` · `@fastify/cors` · `@fastify/swagger` · `pino` (logger estruturado) · `dayjs` (datas)

---

## Arquitetura

O projeto segue **Clean Architecture** com fortes influências de **Domain-Driven Design**, organizado em camadas com fluxo unidirecional de dependências:

```
┌─────────────────────────────────────────┐
│  infra (HTTP, WebSocket, DB, LLM, Pix)  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│        application (use cases)          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  domain (entities, services, errors)    │
└─────────────────────────────────────────┘
```

**Regra inviolável:** o domínio nunca importa de fora. Use cases podem importar do domínio. A infraestrutura pode importar use cases e domínio. Nada do domínio sabe que existe Fastify, Prisma ou Socket.io.

### Estrutura de pastas

```
src/
├── domain/              # Entidades, value objects, domain services
├── application/         # Use cases + interfaces de repositório
├── infra/
│   ├── database/        # Prisma + implementações de repositório
│   ├── http/            # Fastify, controllers, middlewares, schemas
│   ├── websocket/       # Socket.io e handlers
│   ├── llm/             # Cliente Anthropic + categorizer
│   ├── pix/             # Geração de BR Code + CRC16
│   └── env/             # Validação de variáveis de ambiente
├── shared/              # Erros base e utilitários
└── server.ts            # Bootstrap
```

Documentação detalhada da arquitetura no arquivo [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Status de desenvolvimento

> Este projeto está em desenvolvimento ativo como parte do meu portfólio. O roadmap abaixo é executado em fases iterativas.

### Fase 1 — Fundação e Domínio
- [ ] Setup do projeto (TypeScript, Fastify, Prisma, Postgres em Docker)
- [ ] Schema Prisma (User, Group, Member, Expense, ExpenseShare, Settlement)
- [ ] Entidades de domínio + value objects (Money, Email)
- [ ] Use cases de autenticação (register, login, refresh)
- [ ] Testes unitários da camada de domínio

### Fase 2 — Grupos e Despesas
- [ ] Use cases de grupos (criar, listar, adicionar membro)
- [ ] Use cases de despesas (criar, listar, atualizar, deletar)
- [ ] Middlewares de autenticação e verificação de membership
- [ ] Validação de payloads com Zod
- [ ] Testes de integração HTTP

### Fase 3 — Algoritmo e Acertos
- [ ] Domain service `DebtMinimizer` (algoritmo guloso O(n log n))
- [ ] Cálculo de saldos por membro do grupo
- [ ] Endpoint de sugestão de acertos
- [ ] Cobertura completa de casos de borda do algoritmo

### Fase 4 — Tempo Real e Pix
- [ ] WebSocket com autenticação via JWT
- [ ] Eventos de despesa e saldo em tempo real
- [ ] Geração de Pix copia-e-cola (BR Code + CRC16-CCITT)
- [ ] Validação manual com app bancário real

### Fase 5 — Categorização via LLM
- [ ] Engine de regras determinísticas
- [ ] Integração com Claude Haiku como fallback
- [ ] Cache de categorizações em Redis
- [ ] Processamento assíncrono via worker

### Fase 6 — Polimento
- [ ] Documentação OpenAPI completa
- [ ] Frontend simples para demonstração
- [ ] Deploy (backend + banco + frontend)
- [ ] Vídeo demo

---

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- Uma chave de API da Anthropic (apenas para a Fase 5+)

### Passos

```bash
# Clonar o repositório
git clone https://github.com/AntonioJMonte/splittr.git
cd splittr

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com seus valores

# Subir Postgres e Redis
docker compose up -d

# Rodar migrations
npm run db:migrate

# Iniciar servidor em modo desenvolvimento
npm run dev
```

A API ficará disponível em `http://localhost:3333` e a documentação em `http://localhost:3333/docs`.

### Variáveis de ambiente

Veja [`.env.example`](.env.example) para a lista completa. As principais:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `REDIS_URL` | Connection string do Redis |
| `JWT_SECRET` | Secret para assinatura de tokens |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (categorização) |
| `PORT` | Porta do servidor (padrão 3333) |

---

## Documentação da API

A API é auto-documentada via OpenAPI em `/docs` quando o servidor está rodando. Principais grupos de endpoints:

- `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh`
- `POST /groups` · `GET /groups` · `GET /groups/:id`
- `POST /groups/:id/members` · `DELETE /groups/:id/members/:memberId`
- `POST /groups/:id/expenses` · `GET /groups/:id/expenses` · `PATCH /expenses/:id`
- `GET /groups/:id/balances`
- `POST /groups/:id/settlements/compute` · `POST /settlements`

WebSocket disponível em `ws://localhost:3333` com autenticação via JWT no handshake.

---

## Decisões arquiteturais

### Por que Fastify em vez de Express?

Fastify entrega validação nativa via JSON Schema, plugin system mais robusto, performance superior e tipagem melhor com TypeScript. Express continua sendo mais popular, mas Fastify é a escolha técnica correta para projetos novos em TypeScript em 2026.

### Por que Prisma em vez de TypeORM ou Drizzle?

Prisma oferece o melhor balanço entre type-safety, ergonomia e maturidade. O Prisma Client gera tipos automaticamente do schema, e as migrations declarativas reduzem fricção em iterações rápidas de modelagem.

### Por que decimal.js em vez de números nativos?

Float não é adequado para dinheiro. `0.1 + 0.2 !== 0.3` em JavaScript. Em domínio financeiro, isso causa bugs de auditoria que aparecem em produção. `decimal.js` garante precisão arbitrária e operações associativas.

### Por que algoritmo guloso e não busca exaustiva?

O problema geral de minimização de dívidas é NP-difícil. A heurística gulosa entrega resultado ótimo na grande maioria dos casos práticos com complexidade O(n log n), enquanto busca exaustiva seria O(n!). Para grupos do tamanho real (até ~50 membros), a heurística é a escolha pragmática.

### Por que regras antes de LLM na categorização?

Custo, latência e previsibilidade. 80% das despesas têm palavras-chave óbvias — não preciso de LLM para classificar "Pizza Hut". A LLM entra apenas quando a regra não decide, reduzindo custo em cerca de 80% e melhorando latência média.

---

## Testes

```bash
npm test              # Roda todos os testes
npm run test:watch    # Modo watch
npm run test:coverage # Com relatório de cobertura
```

**Metas de cobertura:**
- Domínio (entidades, services): ≥ 80%
- Use cases: ≥ 70%
- Algoritmo `DebtMinimizer`: 100% com casos de borda explícitos (grupo vazio, empates, valores quebrados, 50+ membros)

---

## Roadmap

Ver [seção Status de desenvolvimento](#status-de-desenvolvimento) para o roadmap detalhado em fases.

**Pós-MVP (futuro):**
- OCR de notas fiscais via Claude Vision (extração automática de despesas a partir de foto)
- Frontend mobile com React Native
- Notificações push para acertos pendentes
- Suporte a múltiplas moedas com conversão automática
- Modo offline com sincronização ao reconectar

---

## Sobre o autor

**Antônio José Monteiro Neto**

Estudante de Ciência da Computação na Universidade Federal do Cariri, focado em desenvolvimento backend com TypeScript e Node.js. Este projeto faz parte do meu portfólio profissional, executado com foco em demonstrar domínio de fundamentos sólidos: arquitetura limpa, modelagem de domínio, algoritmos sobre estruturas de dados, concorrência e integração responsável com IA.

- 🔗 [LinkedIn](https://www.linkedin.com/in/ant%C3%B4nio-jos%C3%A9-monteiro-neto-9a3645300/)
- 💻 [GitHub](https://github.com/AntonioJMonte)
- 📍 Juazeiro do Norte, CE

---

## Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.