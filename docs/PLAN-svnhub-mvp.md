# PLAN — SVNHUB: Plataforma Web de Gerenciamento SVN (estilo GitHub)

> **Status**: Aprovado — decisões da seção 8 validadas com o usuário em 2026-06-11.
> **Data**: 2026-06-11

---

## 1. Visão Geral

**SVNHUB** é uma plataforma web de gerenciamento de repositórios **Apache Subversion (SVN)**, com a experiência de uso inspirada no GitHub: navegação de código, revisões, branches, pull requests (merge requests), usuários/permissões e CI/CD — porém respeitando o modelo **centralizado** do SVN.

### Princípio central de design

O SVN não é o Git. As diferenças de modelo precisam guiar a UX:

| Conceito | Git/GitHub | SVN/SVNHUB |
|---|---|---|
| Modelo | Distribuído (DVCS) | Centralizado (servidor é a fonte da verdade) |
| Identidade do commit | Hash SHA por repositório clonado | **Número de revisão global e sequencial** (r1, r2, r3...) |
| Branch | Ponteiro/ref leve | **Cópia barata de diretório** (`/branches/feature-x`) |
| Tag | Ref imutável | Cópia em `/tags/` (imutabilidade por convenção/authz) |
| Merge | Nativo, com DAG | `svn merge` + rastreamento via `svn:mergeinfo` |
| Checkout parcial | Sparse checkout (recente) | **Nativo** (checkout de qualquer subdiretório) |
| Lock de arquivo | LFS/lock externo | **Nativo** (`svn lock`, `svn:needs-lock`) — ótimo p/ binários |
| Permissões | Por repositório | **Por path** (authz granular por diretório) |

Essas diferenças são **vantagens a explorar** (locks nativos, permissões por path, revisões sequenciais, checkout parcial de monorepos gigantes), não defeitos a esconder.

### Camada de tradução GitHub ↔ SVN (decisão de UX)

A UI usa **sempre a nomenclatura do GitHub** como padrão, traduzindo os conceitos do SVN por baixo. Quem vem do GitHub não precisa aprender vocabulário SVN; os detalhes técnicos (path real, número de revisão) aparecem como informação secundária/tooltip.

| Termo na UI (GitHub) | Implementação real (SVN) |
|---|---|
| Branch padrão (`main`) | `/trunk` |
| Branch `feature-x` | `/branches/feature-x` |
| Tag / Release `v1.0` | `/tags/v1.0` |
| Commit `r1042` | Revisão 1042 (número sequencial no lugar do hash) |
| Pull Request | Merge de `/branches/x` → `/trunk` via `svn merge` |
| `.gitignore` | `svn:ignore` / `svn:global-ignores` (editor visual) |
| Submodule | `svn:externals` |
| Clone | `svn checkout` (instruções na página do repo) |
| Push / Pull | `svn commit` / `svn update` |
| Revert commit | `svn merge -c -N` (revisão inversa) |

> O usuário cria a "branch `feature-x`" num clique; o SVNHUB executa `svn copy ^/trunk ^/branches/feature-x` de forma transparente. A estrutura `/trunk /branches /tags` é **imposta por convenção** em todos os repositórios criados pela plataforma e fica oculta na navegação padrão.

---

## 2. Inventário de Funcionalidades do SVN → Transposição para o Site

### 2.1 Administração de repositórios (`svnadmin`)

| Funcionalidade SVN | Comando/Mecanismo | Transposição no SVNHUB |
|---|---|---|
| Criar repositório | `svnadmin create` | Botão "New Repository" (com template `/trunk /branches /tags` opcional) |
| Backup a quente | `svnadmin hotcopy` | Agendamento de backups na UI de admin |
| Exportar/importar histórico | `svnadmin dump` / `load` | Importação de dumpfile — **backlog** (decisão: sem migração de repos legados no MVP) |
| Verificar integridade | `svnadmin verify` | Job de saúde do repositório + badge de status |
| Compactação | `svnadmin pack` | Manutenção automática agendada |
| Espelhamento | `svnsync`, `svnrdump` | Mirrors read-only (fase futura) |
| Recuperação | `svnadmin recover` | Ação de admin com confirmação |

### 2.2 Operações de versionamento (cliente `svn`)

| Funcionalidade SVN | Transposição no SVNHUB |
|---|---|
| `checkout` / `update` | Instruções de clone na página do repo (URL `https://` e `svn://`) + botão copiar |
| `commit` (revisões atômicas) | Feed de revisões (timeline estilo "Commits" do GitHub) |
| `log` | Página de histórico com filtros por autor, path, range de revisão e data |
| `diff` | Visualizador de diff lado-a-lado e unificado, por revisão ou entre paths/branches |
| `blame` / `annotate` | View "Blame" por arquivo, com link para a revisão |
| `cat` / `ls` | Navegador de código (file browser) em qualquer revisão (`@rev` peg revision) |
| `copy` (cheap copy) | Criação de branch/tag pela UI (um clique = `svn copy`) |
| `move` / `rename` | Histórico que segue renomeações no file browser |
| `merge` + `svn:mergeinfo` | Motor dos **Pull Requests**: preview de merge, detecção de conflito, merge pela UI |
| `revert` de revisão (merge -c -N) | Botão "Revert this revision" criando revisão inversa |
| `export` | Download `.zip`/`.tar.gz` de qualquer path@revisão |
| `import` | Upload de arquivos pela UI (criar revisão via web) |
| Changelists | Fora de escopo (conceito local da working copy) |
| Shelving (experimental) | Fora de escopo do MVP |
| Sparse checkout nativo | Documentado na UI de clone (vantagem para monorepos) |

### 2.3 Propriedades (properties)

| Propriedade | Uso | Transposição |
|---|---|---|
| `svn:log`, `svn:author`, `svn:date` | Metadados de revisão | Exibição na timeline; edição de mensagem de log (com `pre-revprop-change` habilitado e auditoria) |
| `svn:ignore` / `svn:global-ignores` | Ignorar arquivos | Editor visual (equivalente ao `.gitignore`) |
| `svn:eol-style` | Normalização de fim de linha | Configuração por repositório/path na UI |
| `svn:keywords` | Expansão `$Rev$`, `$Author$`... | Exibição informativa no file viewer |
| `svn:externals` | "Submódulos" do SVN | Exibição no browser com link para o repo/path externo |
| `svn:needs-lock` | Forçar lock antes de editar | Badge no arquivo + gestão de locks na UI |
| `svn:mime-type` | Tipo do arquivo | Render correto (imagem, binário, texto) no viewer |
| `svn:special` | Symlinks | Exibição correta no browser |

### 2.4 Locks

| Funcionalidade | Transposição |
|---|---|
| `svn lock` / `unlock` | Página "Locks" do repositório: quem travou o quê, quando, comentário |
| Quebra/roubo de lock (`--force`) | Ação de admin/owner com notificação ao dono do lock |
| `svn:needs-lock` | Indicador visual no file browser (cadeado) |

### 2.5 Hooks do servidor

| Hook | Transposição |
|---|---|
| `pre-commit` | Políticas configuráveis pela UI: mensagem obrigatória (regex), paths protegidos, bloqueio de commit direto em `/trunk` ou `/tags`, tamanho máximo de arquivo |
| `post-commit` | **Coração da integração**: notifica a API do SVNHUB → indexação, webhooks, disparo de CI/CD, atualização de PRs |
| `pre-revprop-change` / `post-revprop-change` | Permitir edição auditada de mensagens de log |
| `pre-lock` / `post-lock` / `pre-unlock` / `post-unlock` | Políticas e notificações de lock |
| `start-commit` | Validação de capacidade/permissão antecipada |

> Os hooks são instalados e gerenciados **pelo SVNHUB** em todo repositório criado — o usuário configura políticas pela UI, nunca editando shell script.

### 2.6 Autenticação, autorização e protocolos

| Funcionalidade SVN | Transposição |
|---|---|
| Authz **por path** (`authz` file) | UI de permissões granulares: read/write/none por usuário/grupo **por diretório** (diferencial sobre o GitHub) |
| Autenticação (htpasswd, LDAP, SASL) | **LDAP/Active Directory no MVP** (via `mod_authnz_ldap` no Apache + mesma fonte na web), com contas locais como fallback |
| `mod_dav_svn` (http/https) | Protocolo principal de acesso (WebDAV/DeltaV) — funciona atrás de proxy/firewall |
| `svnserve` (`svn://`) | Protocolo alternativo de alta performance (opcional) |
| `file://` | Uso interno do backend apenas (acesso local rápido para leituras) |

---

## 3. MVP — Escopo Funcional

### Épico 1 — Gerenciamento de Repositórios
- CRUD de repositórios (criar com layout padrão `/trunk /branches /tags`, arquivar, excluir).
- Página do repositório: README renderizado, browser de arquivos em qualquer revisão, instruções de checkout.
- Histórico de revisões (log) com filtros; página de detalhe da revisão com diff.
- Blame, download (export zip), busca de arquivos por nome.

### Épico 2 — Branches e Tags
- Listagem de `/branches/*` e `/tags/*` com revisão de criação, último commit e autor.
- Criar/excluir branch e tag pela UI (`svn copy` / `svn delete`).
- Comparação entre branches (diff trunk ↔ branch).
- Proteção de paths: bloquear commit direto em `/trunk` e qualquer escrita em `/tags/*` (via `pre-commit` + authz).

### Épico 3 — Pull Requests (Merge Requests)
- Abrir PR: branch origem → path destino (geralmente `/trunk`).
- Preview do merge (`svn merge --dry-run`): arquivos alterados, diff completo, **detecção de conflitos**.
- Conversa: comentários gerais e comentários em linha no diff.
- Revisão: approve / request changes; regra de nº mínimo de aprovações.
- Merge pela UI (o backend executa `svn merge` + `svn commit` numa working copy efêmera, registrando `svn:mergeinfo`).
- Status de CI integrado ao PR (bloquear merge com pipeline vermelho).
- Fechar/reabrir PR; deleção opcional da branch após merge.

### Épico 4 — Usuários, Grupos e Permissões
- Login via **LDAP/Active Directory** (requisito de MVP) + contas locais (e-mail+senha) como fallback; perfil com avatar.
- A mesma fonte LDAP autentica a web **e** o checkout via `mod_dav_svn` (`mod_authnz_ldap`), sem senha duplicada.
- Grupos/times; papéis por repositório: Owner, Maintainer, Developer, Reader.
- **Permissões por path** (mapeadas para o `authz` do SVN) — edição visual.
- Auditoria: log de ações administrativas.
- Tokens de acesso pessoal para checkout/CI.

### Épico 5 — CI/CD
- Pipeline declarativo em YAML versionado no repo (ex.: `.svnhub-ci.yml` no path da branch).
- Disparo via hook `post-commit` (push em branch, atualização de PR) e manual.
- Runners em containers Docker; logs em tempo real (streaming na UI).
- Status checks por revisão e por PR; artefatos de build com retenção configurável.
- Webhooks de saída (notificar sistemas externos).

### Fora do MVP (backlog)
Importação de repositórios legados (`svnadmin load`), issues/projetos, wiki, code search full-text, mirrors `svnsync`, registry de pacotes, IDE web, notificações por e-mail avançadas, métricas/insights, shelving.

---

## 4. Arquitetura

### 4.1 Visão de alto nível

```
┌──────────────────────────────────────────────────────────────┐
│                        Usuário / Cliente SVN                 │
└──────────────┬──────────────────────────────┬────────────────┘
               │ HTTPS (UI/API)               │ HTTPS WebDAV / svn://
               ▼                              ▼
        ┌─────────────┐               ┌──────────────────┐
        │  Frontend   │               │  Apache httpd +  │
        │  (Next.js)  │               │  mod_dav_svn     │◄─── authz/htpasswd
        └──────┬──────┘               │  (ou svnserve)   │     gerados pelo SVNHUB
               │ REST/WS              └────────┬─────────┘
               ▼                               │ hooks (post-commit, pre-commit...)
        ┌─────────────────────────┐            │
        │  API Backend (NestJS)   │◄───────────┘  webhook interno
        │  - domínio (PRs, users) │
        │  - svn-engine (CLI)     │──── exec ───► svn / svnadmin / svnlook
        └──────┬───────────┬──────┘              (acesso file:// local aos repos)
               │           │
        ┌──────▼─────┐ ┌───▼──────────┐         ┌────────────────┐
        │ PostgreSQL │ │ Redis+BullMQ │── jobs ─►│ CI Runners     │
        │ (Prisma)   │ │ (filas)      │         │ (Docker)       │
        └────────────┘ └──────────────┘         └────────────────┘

        Volume compartilhado: /data/repos/{repo}.svn  (FSFS)
```

### 4.2 Componentes

| Componente | Responsabilidade |
|---|---|
| **Frontend (Next.js)** | UI estilo GitHub: browser de código, diffs, PRs, pipelines, admin |
| **API Backend (NestJS)** | Regras de negócio, auth, PRs, permissões, orquestração de CI |
| **svn-engine (módulo do backend)** | Camada que encapsula `svn`/`svnadmin`/`svnlook` via CLI (acesso `file://` local), com pool de working copies efêmeras para merges |
| **Servidor SVN** | Apache + `mod_dav_svn` servindo os repositórios reais; `authz`/credenciais gerados automaticamente pelo backend |
| **Hooks** | Scripts instalados pelo SVNHUB que chamam a API (validação de políticas + eventos pós-commit) |
| **PostgreSQL** | Metadados: usuários, grupos, repositórios, PRs, comentários, reviews, pipelines, auditoria (o **conteúdo versionado fica só no SVN**) |
| **Redis + BullMQ** | Filas: indexação de revisões, execução de pipelines, webhooks, notificações |
| **CI Runners** | Workers que fazem `svn checkout` da revisão e executam steps do YAML em containers Docker |

### 4.3 Decisões-chave e justificativas

1. **Integração com SVN via CLI (`svn`/`svnadmin`/`svnlook`) e não via bindings**
   - Bindings nativos (SWIG) são frágeis e mal mantidos em Node; SVNKit é Java; pysvn é Python.
   - A CLI é estável, completa, documentada e com saída XML parseável (`svn log --xml`, `svn info --xml`, `svn diff --xml`...). `svnlook` é otimizado para leitura dentro de hooks.
   - Abstrair num módulo `svn-engine` isolado permite trocar a implementação no futuro.

2. **`svnlook` + acesso `file://` local para leitura**
   - O backend roda na mesma máquina/volume dos repositórios → leituras (log, cat, tree) sem rede e sem autenticação dupla.

3. **PRs implementados com working copies efêmeras**
   - O SVN não tem "merge no servidor". Para preview e execução de merge, o backend cria uma working copy temporária (checkout sparse do destino), roda `svn merge` (dry-run para preview), e commita em nome do usuário (via `--username` + token). Pool com cleanup agressivo.

4. **Banco relacional só para metadados**
   - Revisões, conteúdo, branches e tags vivem no SVN (fonte da verdade). O Postgres guarda apenas índice/cache (para listagens rápidas) e o domínio social (PRs, comentários, usuários, pipelines).

5. **Sincronização de permissões**
   - O modelo de permissões da UI compila para o arquivo `authz` do SVN (e htpasswd/LDAP), garantindo que o acesso via cliente `svn` nativo respeite exatamente as mesmas regras da web.

### 4.4 Modelo de dados (resumo)

```
User ──< GroupMember >── Group
User ──< RepoMember(role) >── Repository
Repository ──< PathPermission (path, principal, read/write)
Repository ──< PullRequest ──< PRComment / PRReview / PRStatusCheck
Repository ──< RevisionIndex (cache: rev, author, date, message, paths)
Repository ──< Pipeline ──< PipelineJob ──< JobLog / Artifact
Repository ──< Webhook / AccessToken / AuditLog
```

---

## 5. Stack Tecnológica Recomendada

### Linguagem principal: **TypeScript** (frontend + backend)

Justificativa: stack única ponta a ponta, tipos compartilhados (contratos de API), ecossistema maduro para web em tempo real (logs de CI, comentários), e a integração com SVN se dá via CLI — não há vantagem real em Java/Python aqui.

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | **Next.js 15 (React 19) + TypeScript** | SSR para páginas de código (SEO/perf), App Router, ecossistema |
| UI | **Tailwind CSS v4 + shadcn/ui** | Velocidade para reproduzir a densidade visual do GitHub; dark mode |
| Diff/Code viewer | **Shiki** (highlight) + **diff2html**/custom | Render de diffs grandes com virtualização |
| Backend | **NestJS (Node 22) + TypeScript** | Arquitetura modular (módulos: repos, prs, ci, authz), DI, testável |
| ORM | **Prisma + PostgreSQL 16** | Produtividade, migrations versionadas |
| Filas/Cache | **Redis 7 + BullMQ** | Jobs de CI, indexação, webhooks; pub/sub para logs em tempo real |
| Tempo real | **WebSocket (Socket.IO ou nativo Nest)** | Logs de pipeline, atualizações de PR |
| Servidor SVN | **Apache httpd + mod_dav_svn** (svnserve opcional) | Protocolo padrão, TLS, compatível com qualquer cliente SVN |
| CI Runners | **Node worker + Docker Engine API (dockerode)** | Isolamento de builds em containers |
| Auth | **LDAP/AD (ldapts) + contas locais (Argon2)**; sessão JWT + refresh; tokens pessoais | LDAP é requisito de MVP; mesma fonte para web e `mod_dav_svn` |
| Infra (produção) | **Docker Compose single-host** | Sobe app + Postgres + Redis + Apache/SVN + runner com um comando |
| Infra (dev) | **Sem Docker obrigatório**: `pnpm dev` roda web+api+runner direto no Node; Postgres/Redis/SVN locais ou via compose opcional (`docker compose up db redis svn`) | Decisão: modo dev deve funcionar sem Docker |
| Testes | **Vitest** (unit) + **Playwright** (E2E) + repos SVN fixture | AAA pattern |
| Monorepo | **pnpm workspaces** (`apps/web`, `apps/api`, `apps/runner`, `packages/shared`) | Tipos e contratos compartilhados |

### Alternativas consideradas (e por que não)

| Alternativa | Motivo da rejeição |
|---|---|
| Backend em **Java + SVNKit** | SVNKit é a melhor lib SVN, mas dobra a stack (Java + TS) e a CLI cobre 100% das necessidades com menos complexidade |
| Backend em **Python + pysvn** | Bindings desatualizados; ecossistema web em tempo real mais fraco que Node para este caso |
| **Go** | Excelente para runners, mas sem lib SVN madura — usaria CLI igualmente; pode ser adotado depois só nos runners |
| Frontend **Vue/Nuxt** | Viável, mas o ecossistema de componentes estilo GitHub (shadcn, primitives) é mais forte em React |
| SQLite | Insuficiente para concorrência de filas + múltiplos workers |

---

## 6. Roadmap de Fases

| Fase | Entrega | Conteúdo |
|---|---|---|
| **0 — Fundação** | Esqueleto | Monorepo pnpm, modo dev sem Docker (`pnpm dev`), compose opcional p/ infra (Postgres, Redis, Apache+SVN), CI do próprio projeto, auth LDAP + local |
| **1 — Repositórios** | Navegação | CRUD de repos, svn-engine, file browser, log de revisões, diff viewer, blame, export |
| **2 — Branches/Tags + Permissões** | Colaboração base | UI de branches/tags, proteção de paths, authz por path, grupos, tokens |
| **3 — Pull Requests** | Code review | PRs com preview de merge, comentários em linha, reviews, merge pela UI |
| **4 — CI/CD** | Automação | YAML de pipeline, runners Docker, logs em tempo real, status checks em PR, webhooks |
| **5 — Polimento MVP** | Lançamento | Auditoria, backups (`hotcopy`), hardening de segurança, docs |

---

## 7. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Merge via working copy efêmera é lento em repos grandes | UX de PR ruim | Sparse checkout só do path destino; pool de WCs reutilizáveis; limite de tamanho de preview |
| Concorrência de escrita nos arquivos `authz`/hooks | Corrupção de config | Escrita atômica (tmp+rename) serializada por fila |
| `svn:mergeinfo` mal gerenciado polui o histórico | Merges futuros quebrados | Sempre mergear da raiz da branch; validações no svn-engine |
| Parsing de saída CLI quebrar entre versões do SVN | Bugs sutis | Usar exclusivamente saídas `--xml`; testes de contrato contra versão fixada do SVN |
| Performance de log/listagem em repos com 100k+ revisões | Páginas lentas | `RevisionIndex` no Postgres alimentado pelo post-commit (cache incremental) |
| Segurança dos runners (código arbitrário) | Comprometimento do host | Containers sem rede privilegiada, limites de CPU/RAM/tempo, usuário não-root |

---

## 8. Decisões Registradas (validadas em 2026-06-11)

| # | Questão | Decisão |
|---|---|---|
| 1 | Implantação | **Single-host com Docker Compose** em produção. **Modo dev roda sem Docker** (`pnpm dev` direto no Node; infra local ou via compose opcional). |
| 2 | Migração | **Sem migração de repositórios legados no MVP.** Existe um servidor SVN com diversos repositórios, mas o SVNHUB nasce com estrutura própria e repositórios novos. Importação via `svnadmin load` fica no backlog. |
| 3 | Autenticação corporativa | **LDAP/Active Directory é requisito de MVP**, integrado tanto na web quanto no `mod_dav_svn` (`mod_authnz_ldap`), com contas locais como fallback. |
| 4 | Escala esperada | **Premissa assumida**: equipe pequena/média — até ~50 usuários, ~100 repositórios, 1–3 builds de CI simultâneos. Cabe no single-host; revisitar se a realidade for maior. |
| 5 | Layout de repositório | **Convenção `/trunk /branches /tags` imposta** em todo repositório criado, porém **oculta na UI**: nomenclatura e navegação seguem o padrão GitHub (ver tabela de tradução na seção 1). |
