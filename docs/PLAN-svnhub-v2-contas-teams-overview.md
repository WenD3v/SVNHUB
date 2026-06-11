# PLAN — SVNHUB v2: Contas, Teams, Perfil, Overview, Issues e Melhorias

> **Status**: Rascunho para aprovação — gerado em 2026-06-11.
> **Base**: MVP em produção (`docs/PLAN-svnhub-mvp.md`) + UI polida (`docs/PLAN-svnhub-ui-polish.md`).
> **Escopo**: apps/api (NestJS + Prisma), apps/web (Next.js 15), packages/shared. Sem mudanças no runner.

---

## 1. Contexto e objetivo

O SVNHUB já cobre o ciclo de código (browser, commits, diffs, blame, branches/tags, PRs, pipelines, backups, permissões por path compiladas para o authz do Apache). Faltam as camadas **sociais e administrativas** que completam a experiência GitHub-like:

- **Gestão de contas**: hoje usuários só nascem via seed ou login LDAP. Não existe CRUD de usuários, e o `htpasswd` do Apache só contém o admin do seed — novos usuários **não conseguem autenticar no SVN** (`HtpasswdService` existe mas nunca é chamado).
- **Teams**: o backend de grupos (`Group`/`GroupMember` + authz) está pronto, mas sem UI dedicada, sem vínculo Team ↔ Repositório com role, e o `GroupsController` está sem guard de admin.
- **Perfil**: o item "Perfil" do dropdown está `disabled`; `User.avatarUrl` existe no schema mas nunca é preenchido; não há bio, troca de senha nem página pública de usuário.
- **Overview**: a home é só uma lista de repositórios — sem dashboard pessoal, sem heatmap de contribuição, sem feed de atividade.
- **Issues**: inexistentes (sem model, sem API, sem UI).
- **Contribuições por usuário**: stats existem apenas por repositório (`/stats/contributors`); o `author` do SVN não é vinculado ao `User`, impossibilitando visão global por pessoa.

Este plano organiza tudo em 6 lotes incrementais (A–F), cada um entregável e verificável de forma independente.

---

## 2. Escopo

### Lote A — Gestão de contas + sincronização SVN (fundação de tudo)

**API (`apps/api/src/users/` — novo módulo):**

1. **CRUD admin de usuários** (`AdminGuard`):
   - `GET /admin/users` — lista paginada com filtro (username/email/status).
   - `POST /admin/users` — cria conta local: email, username, displayName, senha inicial (ou link de definição), `isAdmin`.
   - `PATCH /admin/users/:id` — editar displayName, email, `isAdmin`, ativar/desativar.
   - `POST /admin/users/:id/reset-password` — redefinição pelo admin.
   - Soft-delete via novo campo `User.isActive` (nunca apagar — `AuditLog`, `RevisionIndex` e PRs referenciam o usuário).
2. **Sincronização com o SVN (htpasswd)** — corrige o gap crítico:
   - Ao criar usuário local ou trocar senha → `HtpasswdService.upsertUser` (bcrypt/htpasswd) no `data/svn-passwd`.
   - Ao desativar → remover do htpasswd **e** recompilar authz (negar acesso).
   - Usuários LDAP: o Apache pode validar direto no LDAP (config já prevista em `SETUP.md`); quando LDAP ativo, htpasswd vira fallback apenas para contas locais. Documentar a matriz em `OPERATIONS.md`.
   - Comando de reconciliação no boot (produção): varrer usuários ativos locais e garantir presença no htpasswd (mesmo padrão do rebuild de authz/hooks já existente).
3. **Autosserviço**:
   - `PATCH /users/me` — displayName, bio.
   - `POST /users/me/password` — troca de senha (valida senha atual; re-sincroniza htpasswd).
4. **Hardening relacionado** (débitos encontrados na exploração):
   - `GroupsController` ganha `AdminGuard` nas escritas.
   - `POST /repositories` restrito a admin (ou nova flag `InstanceSettings.allowUserRepoCreation`).
   - Login bloqueado para `isActive = false`; refresh tokens revogados na desativação.

**Web:**

5. Área admin `/admin/users`: tabela (avatar, username, e-mail, origem local/LDAP, admin, status, último login via `AuditLog`), dialogs de criar/editar/resetar senha/desativar, badges de status.
6. Entrada "Administração" no dropdown do usuário (já existe para audit-log; virar seção com sub-navegação: Usuários, Teams, Auditoria, Backups).

**Prisma:** `User.isActive Boolean @default(true)`, `User.bio String?` (migration única do lote).

### Lote B — Teams (evolução dos Groups) + Team ↔ Repositório

**Conceito:** os `Group`/`GroupMember` atuais viram **Teams** na UI (sem rename de tabela — só nomenclatura de produto). Novidade real: aplicar um team inteiro a um repositório com uma role, como no GitHub.

**Prisma:**

1. Novo model `RepoTeam`: `repositoryId + groupId @@unique`, `role RepoRole` — espelho do `RepoMember` para teams.
2. `Group.description String?`, `Group.slug String @unique` (para URL `/teams/[slug]`).

**API:**

3. `TeamsController` (`/teams`) substitui o `GroupsController` exposto hoje (mantendo rotas `/groups` como alias deprecado durante a transição):
   - CRUD (admin), membros (`POST/DELETE /:slug/members`, role MEMBER/ADMIN do team — ADMIN do team pode gerir membros sem ser admin global).
   - `GET /teams/:slug` — detalhe com membros e repositórios vinculados.
4. `POST/PATCH/DELETE /repositories/:slug/teams` (MAINTAINER) — vincular team com role.
5. **`AuthzCompiler`**: incluir `RepoTeam` na compilação — team com role OWNER/MAINTAINER → `@team = rw`, DEVELOPER/READER → `@team = r` no bloco do repo (grupos já são emitidos no authz; só falta a regra default por role de repo).
6. **`RepoRoleGuard`**: resolver a role efetiva como `max(roleDireta, melhorRoleViaTeams)` — membro de team aplicado ao repo enxerga o repo na UI sem precisar de `RepoMember` individual.
7. Lista de repositórios (`GET /repositories`) passa a incluir repos acessíveis via team.

**Web:**

8. Páginas `/teams` (lista) e `/teams/[slug]` (membros + repositórios + role, gestão inline para team-admin/global-admin).
9. Em `repos/[slug]/settings` → aba "Membros e Teams": seção de teams vinculados ao lado dos membros individuais (mesmo padrão visual do `permissions-manager`).
10. `PathPermission` com `principalType GROUP` já existe — UI passa a chamar de "Team" no picker.

### Lote C — Perfil de usuário: página, avatar, bio e contribuições

**Vinculação autor SVN ↔ User (pré-requisito das contribuições):** o `author` gravado no `RevisionIndex` é o username usado no commit SVN, que por construção (htpasswd/LDAP) **é o `User.username`**. A junção é feita por username — sem migration de dados, apenas join/lookup nas queries de stats.

**API:**

1. **Avatar upload**:
   - `POST /users/me/avatar` — `multipart/form-data`, limite 2 MB, formatos png/jpeg/webp; processar com `sharp` (crop quadrado + resize 256px + conversão webp); salvar em `data/avatars/{userId}.webp` (mesmo padrão de storage local de `data/repos` e artifacts).
   - `DELETE /users/me/avatar`.
   - `GET /users/:username/avatar` — `@Public()`, serve o arquivo com cache headers (`ETag`/`max-age`), 404 → frontend usa o fallback de iniciais atual.
   - `User.avatarUrl` passa a ser preenchido (`/users/{username}/avatar?v={timestamp}` para cache-busting).
2. **Perfil público**: `GET /users/:username` — displayName, bio, avatarUrl, data de criação, contadores (repos com acesso visível ao viewer, commits indexados, PRs abertos/merged).
3. **Stats por usuário** (`apps/api/src/users/user-stats.service.ts`, agregando `RevisionIndex`):
   - `GET /users/:username/stats/heatmap?from=&to=` — contagem de revisões **por dia** (últimos 365 dias por padrão), somando apenas repositórios que o **viewer** pode ler (reuso da lógica de visibilidade do Lote B). SQL raw com `GROUP BY date_trunc('day', date)` + índice novo `@@index([author, date])` no `RevisionIndex`.
   - `GET /users/:username/stats/activity` — feed recente: últimas revisões, PRs abertos/merged, repos mais ativos.

**Web:**

4. Página `/users/[username]` estilo GitHub: cabeçalho (avatar grande, displayName, @username, bio), **heatmap de contribuição** (grid 53×7 em SVG custom, tooltip "N contribuições em DD de mês", escala de 5 tons da cor `--success`, dark/light via tokens existentes — mesma abordagem sem-lib do `commit-activity-chart`), feed de atividade recente, lista de repositórios.
5. Página `/settings/profile` (autosserviço): editar displayName, bio, upload/remoção de avatar (preview + crop client-side simples), troca de senha. Habilitar o item "Perfil" do dropdown (`auth-header-actions.tsx`).
6. Substituir fallbacks de iniciais por `AvatarImage` com a URL real em todos os pontos que exibem autor (commits, PRs, contributors, blame, membros) — mantendo o fallback colorido atual quando 404.
7. Em `repos/[slug]/insights`: contributors viram links para `/users/[username]` quando o author corresponde a um User.

### Lote D — Overview / Dashboard (home logada)

**API:**

1. `GET /dashboard` — agregação para o usuário logado: repositórios recentes/favoritos, PRs abertos de sua autoria e aguardando seu review, pipelines recentes dos seus repos, feed de atividade (revisões + PRs + pipelines dos repos acessíveis, paginado).
2. Reuso direto do heatmap do Lote C (`/users/:username/stats/heatmap` com o próprio usuário).

**Web:**

3. Nova home `/` (logado) em layout 2 colunas estilo GitHub:
   - **Sidebar esquerda**: avatar + nome, lista de repositórios (com busca client-side), botão "Novo repositório" (visível conforme permissão do Lote A.4).
   - **Coluna principal**: heatmap de contribuição do usuário no topo, "Seus pull requests" (abertos/aguardando review), feed de atividade dos repositórios acessíveis.
4. A lista completa de repositórios migra para `/repos` (rota nova) com filtros (nome, arquivados) — substituindo a função da home atual.
5. **Busca global no header** (habilitar o input "em breve"): `GET /search?q=` buscando repositórios (nome/descrição/slug) e usuários (username/displayName) via Postgres `ILIKE` — dropdown de resultados estilo command palette. Full-text de código permanece fora de escopo.

### Lote E — Issues

**Prisma (migration do lote):**

1. `Issue`: `repositoryId`, `number` (sequencial por repo, `@@unique([repositoryId, number])` — mesmo padrão do `PullRequest`), `title`, `body?`, `status` (`IssueStatus OPEN/CLOSED`), `authorId`, `assigneeId?`, `closedAt?`, `closedByPrNumber?`, timestamps.
2. `IssueComment`: `issueId`, `authorId`, `body`, timestamps.
3. `Label`: `repositoryId`, `name`, `color`, `description?` (`@@unique([repositoryId, name])`) + tabela de junção `IssueLabel`. Labels também aplicáveis a PRs futuramente (fora deste lote).

**API (`apps/api/src/issues/`):**

4. `GET/POST /repositories/:slug/issues` (READER lê, DEVELOPER cria) com filtros: status, label, assignee, author, busca em título; ordenação e paginação.
5. `GET/PATCH /repositories/:slug/issues/:number` — editar título/body (autor ou MAINTAINER), open/close, assignee, labels.
6. `POST /repositories/:slug/issues/:number/comments` + edição/remoção do próprio comentário.
7. CRUD de labels (`/repositories/:slug/labels`, MAINTAINER).
8. **Integrações**:
   - Referência cruzada em mensagens de commit: `#N` no `RevisionIndex.message` → comentário automático de timeline na issue (processado no `index-revision`, hook post-commit já existente); `fixes #N` / `closes #N` no merge de PR para o branch padrão → fecha a issue com `closedByPrNumber`.
   - Render markdown nos bodies/comentários reaproveitando o pipeline do `readme-viewer` (`react-markdown` + `remark-gfm` + shiki), com autolink de `#N` e `rN`.
   - Novo `WebhookEventType`: `ISSUE_OPENED`, `ISSUE_CLOSED`, `ISSUE_COMMENTED`.
   - Auditoria via `AuditService` em todas as escritas.

**Web:**

9. Tab "Issues" no `repo-nav` (antes de Pull requests, com contador de abertas).
10. `/repos/[slug]/issues` — lista com filtros (tabs Open/Closed, dropdowns label/assignee/author, busca), badges de label coloridas.
11. `/repos/[slug]/issues/new` e `/repos/[slug]/issues/[number]` — detalhe com timeline (descrição, comentários, eventos de close/reopen/label/assign, referências de commits/PRs), sidebar (assignee, labels, PR vinculado).

### Lote F — Melhorias nas funcionalidades existentes

1. **PAT scopes**: `AccessToken.scopes` existe mas não há enforcement — aplicar verificação no `AccessTokenStrategy`/guards (`repo:read`, `repo:write`, `admin`).
2. **Insights do repositório**: adicionar gráfico de distribuição por autor (pizza/barras SVG) e tendência mensal; linkar contributors ao perfil (Lote C.7).
3. **Página da revisão**: exibir avatar real do autor + link de perfil; idem em blame e PRs.
4. **Notificações leves (sininho)**: `GET /notifications` derivado de eventos próprios (PR aguardando review, issue atribuída, pipeline falhou em repo que mantenho, menção `@username` em comentários) — model `Notification` simples (userId, type, payload Json, readAt). Polling de 60s; sem WebSocket dedicado nesta fase.
5. **E-mail opcional** (SMTP via env): convite/reset de senha (Lote A) e notificações de menção — desabilitado por padrão; sem fila nova (reuso BullMQ).
6. **Auditoria**: cobrir os novos domínios (users, teams, issues, avatar) no `AuditLog` e expor filtros por domínio em `/admin/audit-log`.

---

## 3. Decisões técnicas

| Decisão | Justificativa |
|---|---|
| Soft-delete de usuários (`isActive`) em vez de delete | `AuditLog`, `RevisionIndex`, PRs e comentários referenciam o usuário; histórico SVN é imutável |
| htpasswd como fonte de senha SVN para contas locais; LDAP direto no Apache quando configurado | Aproveita `HtpasswdService` já escrito; evita proxy de autenticação custom no mod_dav_svn |
| Teams = `Group` existente + novo `RepoTeam` (sem rename de tabela) | Authz compiler e `PathPermission` já entendem grupos; rename é cosmético e arriscado |
| Vínculo autor SVN ↔ User por `username` (join, sem FK) | Username do commit SVN é o mesmo do htpasswd/LDAP por construção; FK quebraria com history importado |
| Avatares em `data/avatars/` processados com `sharp` (webp 256px) | Consistente com storage local existente (repos, artifacts); sem dependência de S3 |
| Heatmap e gráficos em SVG custom (sem lib de chart) | Mesmo padrão do `commit-activity-chart` aprovado no plano de UI polish |
| Stats sempre do `RevisionIndex` (Postgres), nunca `svn log` ao vivo | Performance; índice já alimentado pelo hook post-commit; novo índice `[author, date]` |
| Issues com `number` sequencial por repo | Mesmo padrão já validado em `PullRequest`; URLs estáveis `#N` |
| Busca via `ILIKE` em repos/usuários (sem full-text de código) | Cobre 90% do uso com zero infra nova; full-text de código exigiria indexador dedicado (backlog) |
| Notificações por polling, sem WebSocket novo | Sininho não exige tempo real estrito; o gateway socket.io existente fica dedicado a logs de pipeline |

**Migrations Prisma por lote** (cada lote = 1 migration):
- A: `User.isActive`, `User.bio`
- B: `RepoTeam`, `Group.slug`, `Group.description`
- C: índice `RevisionIndex @@index([author, date])`
- E: `Issue`, `IssueComment`, `Label`, `IssueLabel`, enum `IssueStatus`, novos `WebhookEventType`
- F: `Notification`

---

## 4. Ordem de execução e dependências

```
A (contas + htpasswd)  ──►  B (teams)  ──►  C (perfil + heatmap)  ──►  D (overview)
                                                                  └──►  F (melhorias)
E (issues) — independente após A (precisa de authorId confiável)
```

| Lote | Conteúdo | Verificação |
|---|---|---|
| **A — Contas + SVN sync** | §2.A | `pnpm -r typecheck && pnpm -r test && pnpm lint`; teste e2e manual: criar usuário → `svn checkout` com a nova credencial; desativar → 401 no Apache |
| **B — Teams** | §2.B | idem + teste unit do `AuthzCompiler` com `RepoTeam` (fixture); membro via team acessa repo na UI e no SVN |
| **C — Perfil** | §2.C | idem + teste unit do heatmap (agregação com fixtures de `RevisionIndex`); upload de avatar (limites, formatos inválidos) |
| **D — Overview** | §2.D | idem + `pnpm --filter @svnhub/web build`; dashboard renderiza vazio (usuário novo) e populado |
| **E — Issues** | §2.E | idem + testes de fechamento via `fixes #N` e numeração concorrente |
| **F — Melhorias** | §2.F | idem + teste de enforcement de scopes em PAT |

Regras de execução (mesmo protocolo dos planos anteriores): evoluir código existente em vez de reescrever; sem breaking changes nos endpoints atuais (alias `/groups` mantido durante transição); contratos novos em `packages/shared` antes da implementação; commits fora do escopo do executor.

---

## 5. Fora de escopo

- Full-text search de **código** (indexador dedicado — backlog).
- OAuth/SSO além do LDAP existente.
- Projects/boards kanban, milestones e wiki.
- Labels em pull requests (estrutura preparada no Lote E, UI fica para depois).
- Notificações em tempo real via WebSocket e apps mobile.
- Migração/import de issues de outras plataformas.
- Storage de avatares em S3/objeto (local filesystem é suficiente para o porte atual).
