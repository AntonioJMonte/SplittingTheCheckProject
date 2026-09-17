# Estado do Projeto — Splittr

**Última atualização:** 2026-09-17
**Branch:** main
**Etapa atual:** 2 — Bloqueantes (concluída; não commitada)

---

## Concluído (confirmado no código)

- **Domínio:** 6 entidades, 4 VOs (Money, Email, SplitMethod, `ExpenseCategory` com 8 categorias fechadas),
  `DebtMinimizer` guloso O(n log n) puro. `Settlement` ganhou `version`.
- **Aplicação:** 22 use cases (expenses 5, com `CategorizeExpense`) + 5 interfaces de repositório
  + 2 serviços (`PixGenerator`, `ExpenseCategorizer`). DIP respeitada.
- **Infra HTTP:** 23 controllers, 5 arquivos de rotas (+`/health`), error handler central.
- **Swagger:** `/docs`, 6 tags (+Health), `bearerAuth`.
- **Persistência:** 5 repositórios Prisma + 5 in-memory; 3 migrations no repo
  (+`20260917160000_settlement_concurrency_control`), aplicadas no Postgres do compose pelo serviço `migrate`.
- **WebSocket:** auth JWT, rooms, adapter Redis, dedup; novo evento `expense_categorized`.
- **Redis:** cache de saldos + cache de categoria `categoria:v1:<sha256(texto normalizado)>`.
- **Pix:** BR Code EMV + CRC16 manual. **Env:** Zod no startup; `ANTHROPIC_API_KEY` opcional ('' = ausente).
- **LLM (2.1):** regras (palavra/frase inteira; frase mais longa vence) → cache → `claude-haiku-4-5`
  (structured outputs, 128 tokens, 5 s, 1 retry nativo do SDK) → "Outros". Regras+cache síncronos no
  create/PATCH; LLM em background com guarda de descrição. `POST /expenses/:id/categorize`
  (qualquer membro). Logger pino em `infra/logger` (por ora só o LLM usa).
- **Lock otimista (2.2):** CAS por `version` (`updateMany` + `count`) no acknowledge e no cancelamento;
  `pendingKey @unique` impede dois PENDING simultâneos no confirm. Conflito → 409.
- **Docker (2.3):** Dockerfile multi-stage `node:24-bookworm-slim`; compose com `migrate` (target build)
  e `app` (runtime, healthcheck em `/health`); `.dockerignore`; `tsconfig.build.json`; `@prisma/client`
  em `dependencies`; lockfile ressincronizado (D-29). Validado do zero: `down -v` + `up --build --wait`
  → app healthy, `/health` 200 (503 com Redis parado), `/docs` 200.

## Baseline de qualidade (2026-09-17 — fim da Etapa 2)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | limpo (exit 0) |
| `npx vitest run` | 268 testes, 42 arquivos, 100% passando |
| `npm run test:integration` | 6 testes, 1 arquivo, 100% (Postgres do compose, schema `integration_test`) |
| `npm run test:coverage` | 79,39% stmts · 68,42% branch · 75,29% funcs · 80,3% lines |

Por camada (stmts): domínio 90,5% · use cases 96,6% · `infra/llm` 100% · `infra/cache` 50%.
Zeros: `infra/pix` 0% · `infra/websocket/handlers` 0% · `infra/database/prisma` 0,9% (só a integração cobre).

---

## Pendências

### Etapa 3 — Polimento
- **3.1** `GET /groups/:id` não existe. `PATCH`/`DELETE /expenses/:id` sem `verifyMembership` (checado no use case).
- **3.2** `POST /auth/logout` não existe; refresh token sem jti, sem rotação, não persistido.
- **3.3** `fastify()` ainda sem logger; `console.error` em `app.ts`. Reaproveitar `infra/logger`.
- **3.4** Swagger detalhado — por último.

### Etapa 4 — Cobertura
- **4.1** Fechar zeros: `infra/pix` (CRC16) e handlers WebSocket. `DebtMinimizer`: mínimo de 8 casos.

### Backlog (Semana 6)
Frontend, deploy, vídeo demo, README. Lock otimista em `Expense` (D-20: adiado). `categorySource` (D-08 B).

---

## Decisões pendentes

Nenhuma.

## Decisões tomadas

As decisões da Etapa 2 foram apresentadas na sessão como D-01…D-23; aqui estão com +5 para não colidir.

| ID | Data | Tema | Escolha |
|----|------|------|---------|
| D-01 | 2026-09-17 | Worktree órfão | A — `git worktree prune` + remoção manual |
| D-02 | 2026-09-17 | Branch `claude/xenodochial-diffie-048c20` | A — `branch -D` |
| D-03 | 2026-09-17 | 3 branches `claude/*` mergeadas | A — `branch -d` |
| D-04 | 2026-09-17 | `.gitignore` p/ worktrees | A — manter `.claude/` |
| D-05 | 2026-09-17 | `/src/generated/prisma` duplicado | A — remover |
| D-06 | 2026-09-17 | Categorizador (DIP) | A — interface em application, impl. em infra |
| D-07 | 2026-09-17 | Lista de categorias | A — VO de domínio + `z.enum` (400 fora da lista) |
| D-08 | 2026-09-17 | Manual × automática | A — manual prevalece; sem `categorySource` |
| D-09 | 2026-09-17 | Execução | B — regras+cache síncronos, LLM em background + `expense_categorized` |
| D-10 | 2026-09-17 | Casamento das regras | A — palavra/frase inteira, sem keyword numérica |
| D-11 | 2026-09-17 | Chave de cache | A — `categoria:v1:<sha256>`; não cacheia fallback |
| D-12 | 2026-09-17 | Parsing | A — structured outputs (`messages.parse` + Zod) |
| D-13 | 2026-09-17 | `ANTHROPIC_API_KEY` | A — opcional |
| D-14 | 2026-09-17 | Modelo/timeout | A — Haiku 4.5, 128 tokens, temp 0, 5 s, 1 retry nativo |
| D-15 | 2026-09-17 | Logger | A — `infra/logger` pino já na 2.1 |
| D-16 | 2026-09-17 | `POST /expenses/:id/categorize` | A — qualquer membro, síncrono |
| D-17 | 2026-09-17 | Campo de versão | A — `version Int @default(0)` |
| D-18 | 2026-09-17 | Implementação do lock | A — `updateMany`+`count`, erro no use case (409) |
| D-19 | 2026-09-17 | Corrida no confirm | A — `pendingKey String? @unique` |
| D-20 | 2026-09-17 | Lock em Expense | A — não estender agora |
| D-21 | 2026-09-17 | Teste de concorrência | A — unitário + integração com Postgres real |
| D-22 | 2026-09-17 | Imagem base | A — Debian slim multi-stage |
| D-23 | 2026-09-17 | Versão do Node | B — Node 24 LTS |
| D-24 | 2026-09-17 | Prisma em runtime | A — `@prisma/client` em `dependencies` |
| D-25 | 2026-09-17 | `migrate deploy` | A — serviço `migrate` one-shot |
| D-26 | 2026-09-17 | `/health` | A — checa Postgres e Redis, 503 se cair |
| D-27 | 2026-09-17 | Envs do compose | A — `environment` explícito com nomes de serviço |
| D-28 | 2026-09-17 | Build sem testes | A — `tsconfig.build.json` |
| D-29 | 2026-09-17 | Lockfile dessincronizado desde o HEAD | A — resync com o npm da imagem `node:24` (11.19.0) |

---

## Riscos e observações

- **Lockfile gerado com npm 11.19.0** (D-29): npm local é 11.6.2 e resolve peers opcionais diferente;
  `npm install` com ele pode voltar a quebrar o `npm ci` do Docker. Conferir com `docker compose build`.
- **Pix sem teste (0%)**: CRC16-CCITT manual sem rede de proteção.
- **Rotas de auth divergem do PDF** (`/register`, `/auth`, `/refresh`). Não renomear sem aprovação.
- **Categorização em background é em memória**: perde-se em crash; recuperável via `POST /categorize`.
- **Categorias livres antigas** (fora da lista) são lidas como "sem categoria"; banco local não tinha dados.
- **`vitest.config.ts` define `ANTHROPIC_API_KEY: ''` de propósito**: o dotenv não sobrescreve variável
  definida, então isso impede que a chave real do `.env` chegue aos testes.
- **Compose usa segredos do `.env` local** por interpolação: com chave Anthropic real, despesas sem regra
  chamam a API de verdade no container.
- **Sem linter** (eslint/prettier/biome). **`CLAUDE.MD` maiúsculo**: FS case-sensitive não acha `CLAUDE.md`.
- **Working tree sujo**: Etapa 2 inteira + `M .gitignore`, `M CLAUDE.MD`, `D src/infra/pix/.gitkeep`, `?? ESTADO.md`.

## Próximo passo

Commitar a Etapa 2 (mensagens sugeridas na sessão de 2026-09-17) → Etapa 3.1 (diagnóstico + lista D-XX).
