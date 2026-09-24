# Estado do Projeto — Splittr

**Última atualização:** 2026-09-24
**Branch:** main
**Etapa atual:** 3 — Polimento (3.1, 3.2 e 3.3 concluídas e não commitadas; 3.4 aguardando decisões)

---

## Concluído (confirmado no código)

- **Domínio:** 6 entidades, 4 VOs (Money, Email, SplitMethod, `ExpenseCategory` com 8 categorias fechadas),
  `DebtMinimizer` guloso O(n log n) puro. `Settlement` com `version`.
- **Aplicação:** 24 use cases + 5 interfaces de repositório + 3 serviços
  (`PixGenerator`, `ExpenseCategorizer`, `RefreshTokenRevoker`). DIP respeitada.
- **Infra HTTP:** 25 controllers, 5 arquivos de rotas (+`/health`), error handler central.
- **Swagger:** `/docs`, 6 tags, `bearerAuth`; 19 paths documentados.
- **Persistência:** 5 repositórios Prisma + 5 in-memory; 3 migrations aplicadas pelo serviço `migrate`.
- **WebSocket:** auth JWT, rooms, adapter Redis, dedup, evento `expense_categorized`.
- **Redis:** cache de saldos, cache de categoria e blacklist de refresh tokens.
- **Pix:** BR Code EMV + CRC16 manual. **Env:** Zod no startup (`ANTHROPIC_API_KEY` opcional, `LOG_LEVEL`).
- **LLM (2.1):** regras → cache → `claude-haiku-4-5` → "Outros"; LLM em background; `POST /expenses/:id/categorize`.
- **Lock otimista (2.2):** CAS por `version` no acknowledge e no cancelamento; `pendingKey @unique`; conflito → 409.
- **Docker (2.3):** multi-stage `node:24-bookworm-slim`; compose com `migrate` + `app` (healthcheck em `/health`).
- **3.1:** `GET /groups/:groupId` (detalhes + membros, sem saldos). Auditoria: nenhuma rota sem `verifyJwt`;
  `/expenses/:id` e `/settlements/:id` checam associação no use case (D-31, agora documentado nas rotas).
- **3.2:** `POST /logout` idempotente (204) revoga o refresh token numa blacklist Redis
  (`refresh:revogado:<sha256>`, TTL = vida restante do token). `/refresh` consulta a blacklist e é fail-closed.
- **3.3:** `fastify({ loggerInstance })` com a instância de `infra/logger` (Fastify 5 recusa instância em
  `logger`); `LOG_LEVEL` na env; redação de `authorization`, `cookie`, `set-cookie`, `password`,
  `passwordHash`, `refreshToken`, `pixKey`; `console.error` do error handler virou `request.log.error`.

## Baseline de qualidade (2026-09-24 — fim da 3.3)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | limpo (exit 0) |
| `npx vitest run` | 296 testes, 46 arquivos, 100% passando |
| `npm run test:integration` | 6 testes, 1 arquivo, 100% (Postgres do compose, schema `integration_test`) |
| `npm run test:coverage` | 80,18% stmts · 69,18% branch · 76,3% funcs · 81,1% lines |

Zeros remanescentes: `infra/pix` · `infra/websocket/handlers` · `infra/database/prisma` (só a integração cobre).

---

## Pendências

### Etapa 3 — Polimento
- **3.4 Swagger detalhado:** 204 não declarado nos 4 DELETE, 400 ausente em várias rotas, `errorBody`
  duplicado em 6 arquivos de schema, sem exemplos. Decisões D-43+ apresentadas em 2026-09-24.

### Etapa 4 — Cobertura
- **4.1** Fechar zeros: `infra/pix` (CRC16) e handlers WebSocket. `DebtMinimizer`: mínimo de 8 casos.

### Backlog (Semana 6)
Frontend, deploy, vídeo demo, README (corrigir a seção de rotas — D-32). Lock otimista em `Expense` (D-20).
`categorySource` (D-08 B). Rotação com refresh tokens persistidos (D-34 opção B).
`@fastify/cors` está em `dependencies` mas nunca é registrado no app HTTP — bloqueia o frontend.

---

## Decisões pendentes

D-43+ (3.4 Swagger), apresentadas em 2026-09-24.

## Decisões tomadas

### Etapa 2 — 2026-09-17 (D-01…D-29)
Todas na opção **A**, exceto **D-09** (B — regras+cache síncronos, LLM em background) e **D-23** (B — Node 24 LTS).
Temas: D-01…D-05 limpeza de branches/worktrees e `/src/generated/prisma`; D-06…D-16 categorização (DIP,
VO de categoria, manual prevalece, regras por frase inteira, cache `sha256`, structured outputs, chave
opcional, Haiku 4.5, logger pino, rota `/categorize`); D-17…D-21 lock otimista (`version`, `updateMany`,
`pendingKey @unique`, sem lock em `Expense`, teste com Postgres real); D-22…D-29 Docker (Debian slim,
Node 24, `@prisma/client` em `dependencies`, serviço `migrate`, `/health`, envs explícitos,
`tsconfig.build.json`, resync do lockfile com npm 11.19.0).

### Etapa 3 — 2026-09-24 (D-30…D-42)
| ID | Tema | Escolha |
|----|------|---------|
| D-30 | Resposta de `GET /groups/:id` | A — detalhes + membros; saldos continuam só em `/balances` |
| D-31 | Membership em rotas sem `:groupId` | A — mantida no use case, documentada nas rotas |
| D-32 | Divergência de nomes vs README | A — manter as rotas atuais e corrigir o README na 3.4 |
| D-33 | `auth-logout-user-controller.ts` vazio | A — preenchido na 3.2 |
| D-34 | Estratégia de revogação | A — blacklist no Redis com TTL |
| D-35 | Identificação do token | B — `sha256` do token, sem `jti` |
| D-36 | Onde checar a blacklist | A — só em `POST /refresh` |
| D-37 | Redis fora do ar | A — fail-closed (`isRevoked` → true; `revoke` propaga o erro) |
| D-38 | Path e contrato do logout | A — `POST /logout`, 204, idempotente, sem `verifyJwt` |
| D-39 | Instância do logger | B — `fastify({ loggerInstance })` reaproveitando `infra/logger` |
| D-40 | Nível de log | A — `LOG_LEVEL` na env Zod, `silent` forçado em teste |
| D-41 | Campos redigidos | A — 7 caminhos, incluindo `cookie` e `set-cookie` |
| D-42 | `console.error` no error handler | A — `request.log.error`, sem guarda de `NODE_ENV` |

---

## Riscos e observações

- **Logout não invalida o access token** (D-36): a sessão morre de fato em até 15 min.
- **Fail-closed é intencional** (D-37): Redis fora ⇒ `/refresh` responde 401 e ninguém renova sessão.
  Coerente com o `/health`, que já devolve 503 sem Redis.
- **Os e2e mockam a blacklist**; a implementação real (`RedisRefreshTokenBlacklist`) tem teste unitário próprio.
- **Lockfile gerado com npm 11.19.0** (D-29): npm local é 11.6.2; conferir com `docker compose build`.
- **Pix sem teste (0%)**: CRC16-CCITT manual sem rede de proteção.
- **Rotas de auth divergem do PDF** (`/register`, `/auth`, `/refresh`, `/logout`) — decisão D-32.
- **Categorização em background é em memória**: perde-se em crash; recuperável via `POST /categorize`.
- **`vitest.config.ts` define `ANTHROPIC_API_KEY: ''` de propósito**: impede que a chave real do `.env`
  chegue aos testes (o dotenv não sobrescreve variável já definida).
- **Compose usa segredos do `.env` local** por interpolação: com chave Anthropic real, despesas sem regra
  chamam a API de verdade no container.
- **Sem linter** (eslint/prettier/biome). **`CLAUDE.MD` maiúsculo** e com o plano das Etapas 2–4 ainda
  não commitado (`M CLAUDE.MD` desde antes desta sessão).

## Próximo passo

Commitar 3.1/3.2/3.3 (mensagens sugeridas na sessão de 2026-09-24) → aprovar D-43+ → 3.4 → fim da Etapa 3.
