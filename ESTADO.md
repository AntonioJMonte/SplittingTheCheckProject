# Estado do Projeto — Splittr

**Última atualização:** 2026-10-03
**Branch:** main (sincronizada com `origin/main` em `ff1a921`; Bloco 4 **não commitado**)
**Etapa atual:** 5 — Segurança, auditoria e desbloqueio do frontend (**código concluído**; falta commitar o Bloco 4)

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
| 0 vulnerabilidades, auth em `preValidation`, coleção Postman corrigida | D-63, D-64, D-83, D-84 | `ff1a921` |

## Baseline de qualidade (2026-10-03)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | limpo |
| `npx vitest run` | 482 testes, 69 arquivos, 100%, ~8 s (era ~20 s antes do D-85) |
| `npx vitest run --coverage` | 87,71% stmts · 74,87% branch · 81% funcs · 88,08% lines (thresholds 84/71/78/84) |
| `npm run test:integration` | 45 testes, 5 arquivos · `src/infra/database` 97,58 · 89,47 · 100 · 100 (thresholds 96/87/98/98, D-86) |
| `npm audit` | 0 vulnerabilidades |

---

## Pendências

### Bloco 4 — concluído, **não commitado**
- **Integração:** os 5 repositórios Prisma contra Postgres (6 → 45 testes), `resetDatabase()` compartilhado,
  relatório e catraca próprios (D-86).
- **WebSocket:** `socket-server.ts` 0% → coberto com `socket.io-client` real (D-87): handshake, `join_group`,
  room isolada, adapter, CORS. Mutação sem a checagem de membro faz o spec falhar.
- **Caches:** unitários de saldos e de categoria (o de 35% era o de categoria).
- **D-85:** bcrypt injetável; 4 rounds em teste via factory. Teste mais lento: ~3000 ms → 167 ms.
- **Bug corrigido:** `findByUserId` não filtrava `deletedAt` — quem saiu via o grupo em `GET /groups`.
- **Descartado por teste:** excluir grupo com acertos funciona apesar da FK `Settlement → Member` RESTRICT.

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
| — | Nenhuma | — |

## Decisões tomadas

### Etapas 2–4 (D-01…D-57)
Ver git log. Exceções à opção A: **D-09** (B), **D-23** (B), **D-35** (B), **D-39** (B), **D-48** (B),
**D-50** (B), **D-54** (B), **D-55** (C).

### Etapa 5 — 2026-09-26 (D-58…D-82)
Todas na opção **A**, exceto **D-59** (C — `sameSite` derivado de `NODE_ENV`), **D-72** (C — soft
delete com `deletedBy`) e **D-73** (B — `Expense` e `Member`). Detalhe por tema na tabela da Etapa 5 acima.

### 2026-10-03
**D-63** (B — `preValidation`; a A, `onRequest`, foi aprovada e revertida antes de implementar: tiraria anônimos
do rate limit), **D-64** (A — coleção versionada e corrigida), **D-83** (A), **D-84** (A), **D-85** (A — rounds
injetáveis), **D-86** (A — cobertura própria na integração), **D-87** (A — `socket.io-client`). **D-65** descartada.

---

## Riscos e observações

- **O 409 do D-82 protege menos do que parece:** o `PATCH` não recebe `version` do cliente, e o use
  case relê antes de gravar. Cobre corrida entre requisições simultâneas, **não** cliente com tela velha.
- **Auditoria cobre só despesa** (D-80). Grupo, membro e acerto não registram edições.
- **Dublês em memória não modelam soft delete na linha:** filtram pelo agregado. Regra de `deletedAt`
  só se prova na integração.
- **`EnvironmentTeardownError` intermitente** do Vitest já derrubou o `test:coverage`; não reproduziu em 03/10.
- **Rodar um spec de integração sozinho reprova a catraca** (D-86). Use `--coverage.enabled=false`.
- **Relatório principal mostra repositórios em ~0%** de propósito: lá são mockados; a medida real é a da integração.
- **Thresholds do relatório principal** seguem 84/71/78/84 com o medido em 87,71/74,87/81/88,08: dá para subir.
- **Rate limit pendura o hook na rota** (`onRoute`), que roda depois dos hooks de instância: auth em
  `onRequest` escaparia dele. Por isso o `verifyJwt` fica em `preValidation` (D-63).
- **`test:integration` avisa "ESM syntax in a file loaded as CommonJS"** no config; roda normalmente.
  Não verificado se o aviso é anterior ao upgrade do Vitest.
- **Logout não invalida o access token** (D-36): a sessão morre em até 15 min.
- **Fail-closed é intencional** (D-37) e **o rate limit é o oposto** (D-68): sem Redis ele não bloqueia.
- **Categorização em background é em memória**: perde-se em crash; recuperável via `POST /categorize`.
- **`vitest.config.ts` define `ANTHROPIC_API_KEY: ''` de propósito.** Compose usa segredos do `.env`.
- **Sem linter.** O arquivo de instruções está em disco como `CLAUDE.MD` (maiúsculo).
- **Repositório em** `C:\Dev\Projeto Rachamento de Contas\SplittingTheCheckProject`; `prisma migrate dev` não
  funciona nesta sessão (interativo): migrations são escritas à mão e aplicadas com `migrate deploy`.

## Próximo passo

1. Commitar o Bloco 4 (mensagens sugeridas na sessão de 03/10) e encerrar a Etapa 5.
2. Semana 6: frontend, CI (já cabe rodar as duas suítes com o Postgres como serviço), deploy.
