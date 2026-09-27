# Estado do Projeto — Splittr

**Última atualização:** 2026-09-26
**Branch:** main
**Etapa atual:** 5 — Segurança, auditoria e desbloqueio do frontend (código pronto; Blocos 1–3 e auditoria **não commitados**)

---

## Concluído (confirmado no código)

- **Domínio:** 6 entidades, 5 VOs (Money, Email, `Phone`, SplitMethod, ExpenseCategory), 2 domain services
  (`DebtMinimizer` guloso O(n log n) e `SplitCalculator` com distribuição de resto).
- **Aplicação:** 25 use cases + 5 interfaces de repositório + 3 serviços. DIP respeitada.
- **Infra HTTP:** 26 controllers, 5 arquivos de rotas (+`/health`), error handler central, OpenAPI completo.
- **Persistência:** 5 repositórios Prisma; **6 migrations** aplicadas.
- **WebSocket:** auth JWT no handshake, rooms, adapter Redis, dedup, 9 eventos.
- **Redis:** cache de saldos, cache de categoria, blacklist de refresh tokens e store do rate limit.
- **LLM (2.1):** regras → cache → `claude-haiku-4-5` → "Outros". **Validado em runtime em 26/09**
  (primeira chamada real; os testes seguem 100% mockados).
- **Etapas 2–4:** lock otimista em `Settlement`, Docker, logging pino, Swagger detalhado,
  `SplitCalculator` (D-57), cobertura com thresholds que falham o build.

### Etapa 5 — commitado
- **CORS (D-58…D-60):** allowlist via `CORS_ORIGIN`, `credentials: true`, `sameSite` por ambiente,
  Socket.io alinhado. Commit `cc59d3b`.
- **Resiliência do Redis (D-61/D-62):** handler de `error` e `maxRetriesPerRequest: null` no pub/sub.
  A API **não cai mais** sem Redis: degrada para 503 no `/health` e 401 no `/refresh`. Commit `34b2b8f`.
- **Segurança (D-66…D-70):** helmet com CSP restrito, rate limit (100/min global, 5/min auth,
  10/min categorize) com contagem em Redis e `skipOnError`, bcrypt 12 rounds, Swagger fora de
  produção. Verificado em runtime. Commit `d100475`.

### Etapa 5 — pronto, **não commitado**
- **Convite por contato (D-71, D-75…D-77):** `POST /groups/:groupId/members` recebe `{email}` **ou**
  `{phone}`. VO `Phone` em E.164, `User.phone` opcional `@unique`, rota `PATCH /users/phone`.
  Destrava o frontend — antes não havia como descobrir o UUID de ninguém.
- **Histórico imutável (D-72, D-73, D-78, D-79):** `deletedAt`/`deletedBy` em `Expense` e `Member`;
  readicionar reativa o registro preservando o id; `findById` de membro enxerga removidos.
- **Permissão 403 (D-74):** `DomainPermissionError` mapeada antes do `DomainError`; 5 regras de papel
  convertidas. Regras de estado seguem 400.
- **Auditoria de edições (D-80…D-82):** tabela `ExpenseRevision` com snapshot completo do estado
  anterior + `Expense.version` com CAS e 409.
- **README reescrito** (17 promessas falsas ou desatualizadas corrigidas) e **LICENSE MIT** criado.

## Baseline de qualidade (2026-09-26)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | limpo |
| `npx vitest run` | 445 testes, 66 arquivos, 100% |
| `npx vitest run --coverage` | 85,54% stmts · 72,97% branch · 79,75% funcs · 85,99% lines (exit 0) |
| `npm run test:integration` | 6 testes, 1 arquivo (Postgres do compose) |

---

## Pendências

### Bloco 4 — cobertura com zeros reais (**próximo**)
Repositórios Prisma em 0–4% e `socket-server.ts` em 0%. Pioraram nesta etapa: ganharam
`findByPhone`, `updatePhone`, `softDelete`, `reactivate`, `findRemovedByUserAndGroup`,
`updateWithRevision` e os filtros de `deletedAt` — nada disso é exercitado contra Postgres real.

### Backlog (Semana 6)
Frontend, deploy, vídeo demo. Fila durável para a categorização (hoje em memória).
`categorySource` (D-08 B). Rotação com refresh tokens persistidos (D-34 B).
Auditoria de grupo/membro (o D-80 cobriu só despesa). Coleção Postman manda `from`/`to`
na listagem de despesas; a API lê `startDate`/`endDate`.

---

## Decisões pendentes

| ID | Tema | Situação |
|----|------|----------|
| D-63 | `verifyJwt` de `preHandler` para `onRequest` (rota autenticada com body responde 400 antes de 401) | apresentada, não decidida |
| D-64 | Scripts na coleção Postman que salvam `accessToken` | apresentada, não decidida |
| D-65 | Como zerar o banco (A `migrate reset` · B `down -v` · C `TRUNCATE`) | apresentada, não decidida |

## Decisões tomadas

### Etapas 2–4 (D-01…D-57)
Ver git log. Exceções à opção A: **D-09** (B), **D-23** (B), **D-35** (B), **D-39** (B), **D-48** (B),
**D-50** (B), **D-54** (B), **D-55** (C).

### Etapa 5 — 2026-09-26 (D-58…D-82)
Todas na opção **A**, exceto **D-59** (C — `sameSite` derivado de `NODE_ENV`), **D-72** (C — soft
delete com `deletedBy`) e **D-73** (B — `Expense` e `Member`).

| IDs | Tema |
|----|------|
| D-58…D-60 | CORS: allowlist por env, cookie por ambiente, Socket.io alinhado |
| D-61, D-62 | Redis: handler de `error`, sem teto de retries no pub/sub |
| D-66…D-70 | helmet, rate limit (escopo e store), bcrypt 12, Swagger fora de produção |
| D-71, D-75…D-77 | Convite por email ou telefone; `phone` opcional `@unique` em E.164 |
| D-72, D-73, D-78, D-79 | Soft delete em `Expense` e `Member`; reativação; removido visível por id |
| D-74 | `DomainPermissionError` → 403 |
| D-80…D-82 | `ExpenseRevision` com snapshot completo; `version` + CAS em `Expense` |

---

## Riscos e observações

- **O 409 do D-82 protege menos do que parece:** o `PATCH` não recebe `version` do cliente, e o use
  case relê antes de gravar. Cobre corrida entre requisições simultâneas, **não** cliente com tela velha.
- **Auditoria cobre só despesa** (D-80). Grupo, membro e acerto não registram edições.
- **Repositórios Prisma sem teste** — maior ponto cego do projeto; é o Bloco 4.
- **`npm run test:coverage` já saiu com exit 1** por `EnvironmentTeardownError` intermitente do Vitest.
  Não reproduz sempre; quebraria CI.
- **Logout não invalida o access token** (D-36): a sessão morre em até 15 min.
- **Fail-closed é intencional** (D-37) e **o rate limit é o oposto** (D-68): sem Redis ele não bloqueia.
- **Nome do recebedor no Pix pode sair com espaço à direita** — `trim()` antes do `slice(0, 25)`.
- **Categorização em background é em memória**: perde-se em crash; recuperável via `POST /categorize`.
- **`vitest.config.ts` define `ANTHROPIC_API_KEY: ''` de propósito.** Compose usa segredos do `.env`.
- **Sem linter** (eslint/prettier/biome). **`CLAUDE.MD` maiúsculo**, modificado e não commitado.
- **D-48 executado:** o repositório está em `C:\dev\Projeto Rachamento de Contas\ProjetoRachamentoDeContas`,
  fora do OneDrive. O caminho tem espaços, mas `tsc`, Vitest e Prisma rodam sem problema.
- **`prisma migrate dev` não funciona nesta sessão** (é interativo): migrations foram escritas à mão
  e aplicadas com `migrate deploy`.

## Próximo passo

Commitar os Blocos 1–3, a auditoria e o README (mensagens sugeridas na sessão de 26/09).
Depois, Bloco 4: testes de integração dos repositórios Prisma.
