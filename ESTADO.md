# Estado do Projeto — Splittr

**Última atualização:** 2026-09-25
**Branch:** main
**Etapa atual:** 4 — Cobertura (concluída; não commitada)

---

## Concluído (confirmado no código)

- **Domínio:** 6 entidades, 4 VOs (Money, Email, SplitMethod, `ExpenseCategory`), 2 domain services:
  `DebtMinimizer` (guloso O(n log n)) e `SplitCalculator` (rateio com distribuição de resto).
- **Aplicação:** 24 use cases + 5 interfaces de repositório + 3 serviços
  (`PixGenerator`, `ExpenseCategorizer`, `RefreshTokenRevoker`). DIP respeitada.
- **Infra HTTP:** 25 controllers, 5 arquivos de rotas (+`/health`), error handler central.
- **Persistência:** 5 repositórios Prisma; 3 migrations aplicadas pelo serviço `migrate`.
- **WebSocket:** auth JWT, rooms, adapter Redis, dedup, evento `expense_categorized`.
- **Redis:** cache de saldos, cache de categoria e blacklist de refresh tokens.
- **Pix:** BR Code EMV + CRC16 manual. **Env:** Zod no startup (`ANTHROPIC_API_KEY` opcional, `LOG_LEVEL`).
- **LLM (2.1):** regras → cache → `claude-haiku-4-5` → "Outros"; LLM em background.
- **Lock otimista (2.2):** CAS por `version`; `pendingKey @unique`; conflito → 409.
- **Docker (2.3):** multi-stage `node:24-bookworm-slim`; compose com `migrate` + `app`.
- **Etapa 3:** `GET /groups/:groupId`; `POST /logout` idempotente com blacklist Redis fail-closed;
  `fastify({ loggerInstance })` com `LOG_LEVEL` e redação de 7 campos; OpenAPI detalhado
  (25 operações, `shared.schema.ts`, 204 nos DELETE, 400 onde há validação, exemplos).
- **Etapa 4:** `SplitCalculator` corrige a divisão EQUAL/PERCENTAGE (D-57 — ver Riscos).
  `vitest.config.ts` ganhou bloco `coverage` com include/exclude e thresholds que **falham o build**.
  In-memory repositories viraram dublês em `src/tests/doubles/`; factories em `src/tests/factories/`.
  Zeros fechados: `infra/pix` (CRC16 validado contra o vetor canônico `0x29B1`), handlers WebSocket,
  `event-dedup`, `io`, `auth-middleware`, e 4 controllers que não tinham e2e.
  `DebtMinimizer`: 13 casos, cobrindo os 8 obrigatórios.

## Baseline de qualidade (2026-09-25 — fim da Etapa 4)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | limpo (exit 0) |
| `npx vitest run` | 370 testes, 55 arquivos, 100% (também com `--sequence.shuffle`) |
| `npm run test:integration` | 6 testes, 1 arquivo, 100% (Postgres do compose) |
| `npm run test:coverage` | 85,05% stmts · 72,67% branch · 79,24% funcs · 85,60% lines |

Por glob: `src/domain` 91,6% stmts · `src/application` 96,8% stmts.
O `include` do D-53 passou a listar todo arquivo de `src`, então os números **não são comparáveis**
com os das etapas anteriores (denominador diferente: 1425 statements contra 1527).

---

## Pendências

### D-48 — mover o repositório para fora do OneDrive (aprovado, **não executado**)
O `mv` falhou com `Device or resource busy`: 16 processos do VS Code seguram o workspace, além do
próprio processo da sessão. Comando pronto na seção "Próximo passo".

### Backlog (Semana 6)
Frontend, deploy, vídeo demo, README (resto do arquivo). Lock otimista em `Expense` (D-20).
`categorySource` (D-08 B). Rotação com refresh tokens persistidos (D-34 B).
Integração dos repositórios Prisma (D-55 C adiou). `@fastify/cors` está em `dependencies` mas nunca
é registrado no app HTTP — bloqueia o frontend. Zeros remanescentes: `socket-server.ts`,
`infra/database/prisma` (só a integração cobre).

---

## Decisões pendentes

Nenhuma.

## Decisões tomadas

### Etapa 2 — 2026-09-17 (D-01…D-29)
Todas na opção **A**, exceto **D-09** (B — regras+cache síncronos, LLM em background) e **D-23** (B — Node 24 LTS).
Temas: D-01…D-05 limpeza de branches/worktrees; D-06…D-16 categorização por LLM; D-17…D-21 lock
otimista; D-22…D-29 Docker (Debian slim, Node 24, serviço `migrate`, `/health`, resync do lockfile).

### Etapa 3 — 2026-09-24 (D-30…D-47, D-50)
Todas na opção **A**, exceto **D-35** (B — `sha256` do token, sem `jti`) e **D-39** (B — reaproveitar
a instância de `infra/logger`). Temas: D-30…D-33 `GET /groups/:id` e auditoria de rotas; D-34…D-38
logout com blacklist no Redis; D-39…D-42 logging com pino; D-43…D-47 Swagger detalhado;
D-50 refresh token sem claim `exp`.

### Etapa 4 — 2026-09-25 (D-48, D-49, D-51…D-57)
| ID | Tema | Escolha |
|----|------|---------|
| D-48 | Repositório em pasta do OneDrive | B — mover para `C:\dev\ProjetoRachamentoDeContas` (pendente) |
| D-49 | Cópias de conflito dentro do `.git/` | A — apagadas |
| D-51 | Provider de cobertura | A — manter `@vitest/coverage-v8` |
| D-52 | Thresholds | A — por glob, falhando o build, calibrados abaixo do medido |
| D-53 | include/exclude do relatório | A — `src/**/*.ts` menos `src/tests/**` e `src/server.ts` |
| D-54 | Repositórios in-memory | B — movidos para `src/tests/doubles/` |
| D-55 | Testes de integração | C — manter o compose, não ampliar agora |
| D-56 | Factories | A — `src/tests/factories/`, migração incremental |
| D-57 | Divisão EQUAL/PERCENTAGE | A — `SplitCalculator` no domínio, com distribuição de resto |

---

## Riscos e observações

- **D-57 mudou comportamento da API:** `splitMethod` deixou de ser rótulo. Em `EQUAL` os valores por
  parte enviados pelo cliente passam a ser ignorados e recalculados; em `PERCENTAGE`, percentuais que
  não somam 100 agora respondem 400. Antes, `POST /expenses` com valor não divisível (R$100 entre 3)
  respondia **400** — o caso de uso central do produto estava quebrado.
- **Baseline de cobertura reiniciada** pelo D-53: comparar com etapas anteriores exige recalcular.
- **Thresholds falham o build** (D-52). Baixá-los exige aprovação explícita (CLAUDE.md §3).
- **Logout não invalida o access token** (D-36): a sessão morre de fato em até 15 min.
- **Fail-closed é intencional** (D-37): Redis fora ⇒ `/refresh` responde 401.
- **Nome do recebedor no Pix pode sair com espaço à direita**: o `trim()` roda antes do `slice(0, 25)`.
  Não invalida o BR Code (o tamanho declarado acompanha); fixado em teste.
- **Projeto ainda no OneDrive** até o D-48 ser executado. Em 24/09 o `userRoutes.ts` foi revertido
  fora do processo duas vezes, e uma delas entrou em 4 commits. **Rodar `tsc` antes de todo commit.**
- **Lockfile gerado com npm 11.19.0** (D-29): npm local é 11.6.2; conferir com `docker compose build`.
- **Categorização em background é em memória**: perde-se em crash; recuperável via `POST /categorize`.
- **`vitest.config.ts` define `ANTHROPIC_API_KEY: ''` de propósito**: mantém a chave real fora dos testes.
- **Compose usa segredos do `.env` local** por interpolação.
- **Sem linter** (eslint/prettier/biome). **`CLAUDE.MD` maiúsculo** e não commitado desde antes de 24/09.

## Próximo passo

Commitar a Etapa 4 (mensagens sugeridas na sessão de 2026-09-25). Depois, com o VS Code **fechado**:

    Move-Item "C:\Users\Antônio José\OneDrive\Documentos\Projetos\Projeto Rachamento de Contas\ProjetoRachamentoDeContas" "C:\dev\ProjetoRachamentoDeContas"

e reabrir o projeto em `C:\dev\ProjetoRachamentoDeContas`.
