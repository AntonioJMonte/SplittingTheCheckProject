# Estado do Projeto — Splittr

**Última atualização:** 2026-10-03
**Branch:** main (sincronizada com `origin/main`; D-63, D-64, D-83, D-84 **não commitados**)
**Etapa atual:** 5 — Segurança, auditoria e desbloqueio do frontend (**commitada e enviada**; falta o Bloco 4)

---

## Concluído (confirmado no código em 03/10)

- **Domínio:** 6 entidades, 5 VOs (Money, Email, `Phone`, SplitMethod, ExpenseCategory), 2 domain services
  (`DebtMinimizer` guloso O(n log n) e `SplitCalculator` com distribuição de resto).
- **Aplicação:** 25 use cases + 5 interfaces de repositório + 3 serviços. DIP respeitada.
- **Infra HTTP:** 26 rotas/controllers (incl. `/health`), 5 arquivos de rotas, error handler central, OpenAPI.
- **Persistência:** 5 repositórios Prisma; **6 migrations**.
- **WebSocket:** auth JWT no handshake, rooms, adapter Redis, dedup, 9 eventos de grupo.
- **Redis:** cache de saldos, cache de categoria, blacklist de refresh tokens e store do rate limit.
- **LLM (2.1):** regras → cache → `claude-haiku-4-5` → "Outros". Validado em runtime em 26/09; testes 100% mockados.
- **Etapas 2–4:** lock otimista em `Settlement`, Docker, logging pino, Swagger detalhado,
  `SplitCalculator` (D-57), cobertura com thresholds que falham o build.

### Etapa 5 — commitado
| Entrega | Decisões | Commit |
|---|---|---|
| CORS por allowlist, cookie por ambiente, Socket.io alinhado | D-58…D-60 | `cc59d3b` |
| API sobrevive sem Redis (503 no `/health`, 401 no `/refresh`) | D-61, D-62 | `34b2b8f` |
| helmet + CSP, rate limit em Redis, bcrypt 12, Swagger fora de produção | D-66…D-70 | `d100475` |
| Convite por `{email}` ou `{phone}`, VO `Phone` E.164, `PATCH /users/phone` | D-71, D-75…D-77 | `f40a9ab` |
| Soft delete em `Expense`/`Member` com `deletedBy`, reativação | D-72, D-73, D-78, D-79 | `f74ebad` |
| `DomainPermissionError` → 403 | D-74 | `0516229` |
| `ExpenseRevision` + `Expense.version` com CAS e 409 | D-80…D-82 | `7f3a816` |
| README corrigido + LICENSE MIT | — | `0ac392d` |

## Baseline de qualidade (2026-10-03, reverificado)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | limpo |
| `npx vitest run` | 460 testes, 67 arquivos, 100% |
| `npx vitest run --coverage` | **instável:** 3 a 9 timeouts por rodada desde o spec do D-63 (ver D-85). Sem ele: 445/445 · 85,54% stmts · 72,97% branch · 79,75% funcs · 85,99% lines |
| `npm run test:integration` | **não reverificado** (Docker parado em 03/10). Último: 6 testes, 1 arquivo |
| `npm audit` | **0 vulnerabilidades** (eram 20; D-83 e D-84, não commitados) |

---

## Pendências

### Bloco 4 — cobertura com zeros reais (**próximo**)
Os 5 repositórios Prisma estão em 0–4% e `socket-server.ts` em 0%. O único teste de integração
cobre `PrismaSettlementRepository`. Sem cobertura contra Postgres real: `findByPhone`, `updatePhone`,
`softDelete`, `reactivate`, `findRemovedByUserAndGroup`, `updateWithRevision`, filtros de `deletedAt`.
Também baixo: `group-balances-cache.ts` (35%).

### Não commitado (03/10)
- **D-83/D-84:** `npm audit fix` + `vitest`/`@vitest/coverage-v8` ^4.1.11, `tsx` ^4.23.15, `@fastify/swagger-ui`
  ^6.1.1 (fastify 5.12.5, `fast-jwt` 6.3.3, `ws` 8.21.3 via lockfile). `/docs` ok em runtime; CSP no navegador não conferida.
- **D-63:** `verifyJwt` em `preValidation` nas 4 rotas; spec `auth-before-validation` (15 testes) falha com
  `preHandler` (400 antes de 401) e com `onRequest` (sem 429).
- **D-64:** Postman — descrição corrigida, logout zera `accessToken`, `startDate`/`endDate`, `PATCH /users/phone`.

### Backlog (Semana 6)
Frontend, deploy, CI (não existe `.github/`), linter, vídeo demo. Fila durável para a categorização
(hoje em memória). `categorySource` (D-08 B). Refresh tokens persistidos (D-34 B).
Auditoria de grupo/membro (o D-80 cobriu só despesa).

### Documentação divergente do código
- CLAUDE.md cita `tests/` na raiz e `infra/database/repositories`; o real é `src/tests/` e
  `src/infra/database/prisma/`. CLAUDE.md diz "Fastify 4+"; o projeto usa Fastify 5, Zod 4 e TS 6.
- CLAUDE.md diz que o domínio nunca importa de fora, mas 7 arquivos de `src/domain` importam
  `DomainError`/`DomainPermissionError` de `src/shared/errors`.
- `package.json` declara `"license": "ISC"` e `"main": "index.js"`; o LICENSE é MIT e a entrada é `dist/server.js`.

---

## Decisões pendentes

| ID | Tema | Situação |
|----|------|----------|
| D-85 | e2e lentos por bcrypt 12 (≈3 s/teste, limite 5 s) estouram com cobertura (A rounds injetáveis · B `testTimeout` · C aliviar o spec) | apresentada |
| D-65 | Como zerar o banco. Avaliado em 03/10 como desnecessário (nenhum código depende disso) | aguardando confirmação para descartar |

## Decisões tomadas

### Etapas 2–4 (D-01…D-57)
Ver git log. Exceções à opção A: **D-09** (B), **D-23** (B), **D-35** (B), **D-39** (B), **D-48** (B),
**D-50** (B), **D-54** (B), **D-55** (C).

### Etapa 5 — 2026-09-26 (D-58…D-82)
Todas na opção **A**, exceto **D-59** (C — `sameSite` derivado de `NODE_ENV`), **D-72** (C — soft
delete com `deletedBy`) e **D-73** (B — `Expense` e `Member`). Detalhe por tema na tabela da Etapa 5 acima.

### 2026-10-03
**D-63** (B — `preValidation`; a A, `onRequest`, foi aprovada e revertida antes de implementar: tiraria anônimos
do rate limit), **D-64** (A — coleção versionada e corrigida), **D-83** (A) e **D-84** (A).

---

## Riscos e observações

- **O 409 do D-82 protege menos do que parece:** o `PATCH` não recebe `version` do cliente, e o use
  case relê antes de gravar. Cobre corrida entre requisições simultâneas, **não** cliente com tela velha.
- **Auditoria cobre só despesa** (D-80). Grupo, membro e acerto não registram edições.
- **Repositórios Prisma sem teste** — maior ponto cego do projeto; é o Bloco 4.
- **`npm run test:coverage` instável por dois motivos:** `EnvironmentTeardownError` intermitente (não
  reproduziu em 03/10) e timeouts dos e2e com bcrypt 12 (D-85). Quebraria CI.
- **Rate limit pendura o hook na rota** (`onRoute`), que roda depois dos hooks de instância: auth em
  `onRequest` escaparia dele. Por isso o `verifyJwt` fica em `preValidation` (D-63).
- **Logout não invalida o access token** (D-36): a sessão morre em até 15 min.
- **Fail-closed é intencional** (D-37) e **o rate limit é o oposto** (D-68): sem Redis ele não bloqueia.
- **Categorização em background é em memória**: perde-se em crash; recuperável via `POST /categorize`.
- **`vitest.config.ts` define `ANTHROPIC_API_KEY: ''` de propósito.** Compose usa segredos do `.env`.
- **Sem linter** (eslint/prettier/biome). O arquivo de instruções está em disco como `CLAUDE.MD` (maiúsculo).
- **Local do repositório:** `C:\Dev\Projeto Rachamento de Contas\SplittingTheCheckProject` (clone novo;
  `node_modules` instalado com `npm ci` em 03/10). O caminho tem espaços, mas `tsc`, Vitest e Prisma rodam.
- **`prisma migrate dev` não funciona nesta sessão** (é interativo): migrations são escritas à mão
  e aplicadas com `migrate deploy`.

## Próximo passo

1. Decidir D-85 e D-65; commitar D-83/D-84, D-63, D-64 (D-63 de preferência junto com o D-85).
2. Subir o Docker e reverificar `npm run test:integration`.
3. Bloco 4: testes de integração dos 4 repositórios Prisma restantes e do `socket-server.ts`.
