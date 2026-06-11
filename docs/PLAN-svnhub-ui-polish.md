# PLAN — SVNHUB UI Polish: estilização, insights e changelog

> **Status**: Aprovado pelo usuário em 2026-06-11 (pedido direto: planejar e executar).
> **Base**: MVP funcional em produção (ver `docs/PLAN-svnhub-mvp.md`). Este plano cobre apenas o frontend (`apps/web`) + endpoints de estatísticas no `apps/api`.

---

## 1. Contexto e objetivo

A UI atual é funcional porém em nível de protótipo: um único componente de UI (`components/ui/button.tsx`), páginas sem hierarquia visual, sem dark mode, markdown sem estilo GitHub, histórico de revisões em lista crua. Objetivo: elevar a UI ao padrão GitHub-like descrito no plano do MVP (§5: Tailwind v4 + shadcn/ui, dark mode, densidade visual do GitHub), e adicionar insights de repositório.

**Estado atual relevante** (não recriar do zero — evoluir):
- Next.js 15 App Router, Tailwind v4 (`@tailwindcss/postcss`), `class-variance-authority`, `tailwind-merge`, `lucide-react`, `react-markdown` + `remark-gfm`, `shiki`, `diff2html`, `socket.io-client`.
- Páginas existentes: home (lista de repos), repo (README + checkout), tree, blob, blame, commits, commit/[rev], branches, tags, compare, pulls, pulls/[n], pipelines, pipelines/[id], settings, login, admin/audit-log.
- Componentes existentes: `app-header`, `repo-nav`, `readme-viewer`, `commit-history`, `file-browser`, `diff-viewer`, `code-viewer`, `blame-viewer`, painéis de settings/pipelines/PRs etc.
- API: `RevisionIndex` no Postgres (rev, author, date, message, changedPaths) — fonte para estatísticas. Auth JWT global com `@Public()`.

---

## 2. Escopo

### 2.1 Design system e estilização global (Lote A)

1. **Tema e tokens** (`globals.css`, Tailwind v4 CSS-first):
   - Paleta GitHub-like (light + dark) via CSS variables: `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--accent`, `--primary`, `--destructive`, `--success`, `--warning` + variantes de texto/borda.
   - Dark mode por classe (`.dark`) com `next-themes` (toggle no header, persistido, default `system`).
   - Tipografia: font sans (Geist ou Inter via `next/font`), `font-mono` para código/revisões/paths.
2. **Componentes base** em `components/ui/` (padrão shadcn/ui, sem CLI — escrever direto): `button` (revisar variants), `badge`, `card`, `input`, `label`, `select`, `tabs`, `table`, `dialog`, `dropdown-menu`, `tooltip`, `skeleton`, `avatar` (com fallback de iniciais coloridas por hash do username), `separator`, `alert`, `empty-state` (custom: ícone + título + descrição + ação).
3. **Layout global**: header refinado (logo SVNHUB, busca de repos placeholder, menu do usuário com avatar + dropdown logout/admin), container com larguras consistentes, breadcrumbs no contexto de repo, footer discreto.
4. **Refatorar páginas existentes** para usar os componentes base — sem mudar comportamento/dados:
   - Home: cards/lista de repos estilo GitHub (nome, descrição, badge de saúde, última atividade, contagem de branches), empty state bonito, skeleton de loading.
   - Repo nav como tabs estilo GitHub (Code, Commits, Branches, Tags, Pull Requests, Pipelines, Settings) com ícones lucide e indicador de tab ativa.
   - File browser: tabela estilo GitHub (ícones de pasta/arquivo, última revisão/mensagem/data por linha quando disponível, hover states).
   - Commits, branches, tags, PRs, pipelines, settings, login, audit-log: aplicar cards/tabelas/badges/tabs consistentes.
   - Estados de loading (skeleton) e erro (alert) em todas as páginas com fetch client-side.
5. **Acessibilidade/polimento**: focus rings, contraste AA no dark/light, `aria-label` em botões de ícone, transições sutis (sem exagero).

### 2.2 README na página do repositório (Lote A)

- Detecção robusta no root do path padrão (trunk): `README.md`, `readme.md`, `Readme.md`, `README.markdown`, `README.txt`/`README` (estes últimos em `<pre>`).
- Render estilo GitHub: estilos completos de markdown (headings com âncoras, tabelas GFM, blockquotes, listas de tarefas, imagens com path relativo resolvido via endpoint de content, links externos com `rel`), code blocks com highlight Shiki (tema sincronizado com dark/light).
- Card "About" na lateral da página do repo: descrição, instruções de checkout colapsáveis, badge de saúde, contadores (branches, tags, revisões).

### 2.3 Histórico melhorado (Lote B)

- **Página Commits**: agrupar revisões por dia (header sticky "11 de junho de 2026" estilo GitHub), cada item com avatar do autor, mensagem (primeira linha em destaque, resto colapsável), `r{rev}` em badge mono clicável, contagem de paths alterados, botão copiar revisão; paginação "Load more" mantendo filtros existentes (autor, range, data, path).
- **Página da revisão** (`commit/[revision]`): cabeçalho com autor/data/mensagem completa, navegação anterior/próxima revisão, lista de arquivos com badges A/M/D coloridos e âncoras para o diff de cada arquivo, diff com tema sincronizado ao dark mode.

### 2.4 Gráfico de commits na página do repo (Lote B)

- **API**: `GET /repositories/:slug/stats/activity?weeks=52` → agregação do `RevisionIndex` por semana (`[{ weekStart, count }]`), groupBy no Prisma ou SQL raw; cache HTTP curto.
- **Web**: gráfico de barras de atividade semanal (SVG custom, sem lib de chart) no topo da página do repo, com tooltip por semana e total no período; estados vazio/loading.

### 2.5 Contribuições por usuário (Lote B)

- **API**: `GET /repositories/:slug/stats/contributors?since=&until=` → `[{ author, commits, firstRevision, lastRevision, lastDate }]` ordenado por commits.
- **Web**: seção "Contributors" na página do repo (avatares + contagem; top 5 com barra proporcional) e página/aba "Insights" do repo com a lista completa e o gráfico de atividade.

### 2.6 Changelog por repositório (Lote B)

- **Conceito**: visão de histórico orientada a releases — as tags (`/tags/*`) são os marcos. Para cada tag (ordenada pela revisão de criação, desc): seção com nome da tag, data, autor, e a lista de revisões entre a tag anterior e ela (mensagens agrupadas, autores com avatar). Revisões após a última tag aparecem como "Unreleased".
- **API**: `GET /repositories/:slug/changelog?limit=` → combina listagem de tags existente + `RevisionIndex` por range de revisões.
- **Web**: página `repos/[slug]/changelog` (entrada no repo-nav), layout de timeline vertical estilo release notes do GitHub; link para comparar tag anterior ↔ tag (página compare existente).

---

## 3. Decisões técnicas

| Decisão | Justificativa |
|---|---|
| Componentes shadcn/ui escritos manualmente (sem CLI) | Monorepo pnpm + Tailwind v4 CSS-first; evita config extra; só os primitivos Radix necessários (`@radix-ui/react-dialog`, `-dropdown-menu`, `-select`, `-tabs`, `-tooltip`, `-label`, `-avatar`, `-separator`) |
| `next-themes` para dark mode | Padrão de mercado, evita flash (attribute class) |
| Gráficos em SVG custom | Volume de dados pequeno (52 barras / top contributors); evita dependência pesada de chart |
| Estatísticas vêm do `RevisionIndex` (Postgres), nunca do `svn log` ao vivo | Performance; o índice já é alimentado pelo hook post-commit |
| Endpoints de stats são read-only e respeitam o guard existente | Mesma autorização de leitura do repo |
| Nenhuma mudança de schema Prisma | Tudo deriva de `RevisionIndex` + tags existentes |

---

## 4. Execução (via ag-kit-bridge → Cursor composer-2.5)

| Lote | Conteúdo | Verificação |
|---|---|---|
| **A — Design system + estilização** | §2.1 + §2.2 | `pnpm -r typecheck`, `pnpm -r test`, `pnpm --filter @svnhub/web build`, `pnpm lint` |
| **B — Insights + histórico + changelog** | §2.3 + §2.4 + §2.5 + §2.6 | idem + testes unit dos novos services de stats/changelog (agregação com dados fixture) |

Regras: evoluir componentes existentes (não reescrever páginas do zero quando um restyle basta); manter contratos de API existentes; sem breaking changes nos endpoints atuais; commits não fazem parte do escopo do executor.

---

## 5. Fora de escopo

Busca full-text, página de perfil de usuário, gráficos de linguagem/código, issues, notificações, mudanças no runner/CI, mudanças de schema Prisma.
