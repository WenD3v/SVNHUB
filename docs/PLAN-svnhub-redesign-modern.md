# PLAN — SVNHUB Redesign (Direção B · Modern)

Fonte de verdade visual: `docs/SVNHUB Redesign.dc.html` (protótipo interativo).
Direção escolhida pelo usuário: **B · Modern** (indigo/violeta, slate, cantos 9px, fontes geométricas).
Tema: suportar **claro e escuro** (estratégia `.dark` via next-themes, já existente).

Stack atual (não trocar): Next.js 15 App Router + React 19 + Tailwind v4 **CSS-first**
(sem `tailwind.config`; tokens em `apps/web/src/app/globals.css` via `@theme inline` + `:root`/`.dark`).
Componentes shadcn-style em `apps/web/src/components/ui/*` (Radix + CVA + `cn`).
Tipos de API vêm de `@svnhub/shared` — **não alterar contratos**; redesign é puramente visual/estrutural de UI.

Regra de ouro: **mudanças cirúrgicas de estilo/layout**. Não alterar lógica de fetch, rotas, contratos
ou comportamento. Preservar acessibilidade (foco, contraste, aria) e responsividade.

---

## 1. SISTEMA DE DESIGN (Direção B · Modern)

### 1.1 Tokens — reescrever blocos `:root` (claro) e `.dark` (escuro) em `apps/web/src/app/globals.css`

Mapeamento dos tokens do protótipo (Direção B) para os tokens semânticos do app.
Manter os **nomes semânticos existentes** e ADICIONAR os tokens extras listados.

**CLARO (`:root`):**
```
--radius: 0.5625rem;            /* 9px (radB) */
--background: #F3F4FB;          /* page */
--foreground: #0F172A;          /* ink */
--card: #FFFFFF;                /* surface */
--card-foreground: #0F172A;
--popover: #FFFFFF;
--popover-foreground: #0F172A;
--primary: #6366F1;             /* brand */
--primary-foreground: #FFFFFF;
--secondary: #F6F7FD;           /* surface-2 */
--secondary-foreground: #0F172A;
--muted: #F6F7FD;               /* surface-2 */
--muted-foreground: #4A5568;    /* ink-2 */
--accent: #F6F7FD;              /* surface-2 (hover neutro) */
--accent-foreground: #0F172A;
--destructive: #DC2626;         /* danger */
--destructive-foreground: #FFFFFF;
--success: #16A34A;
--success-foreground: #FFFFFF;
--warning: #D97706;             /* warn */
--warning-foreground: #FFFFFF;
--border: #E3E5F0;
--input: #CFD3E8;               /* border-strong */
--ring: #6366F1;                /* brand */
/* EXTRAS Modern (adicionar) */
--brand: #6366F1;
--brand-2: #8B5CF6;
--brand-soft: #ECEEFE;
--border-strong: #CFD3E8;
--foreground-subtle: #94A0B5;   /* ink-3 (texto terciário) */
--success-soft: #DCFCE7;
--warning-soft: #FEF3C7;
--destructive-soft: #FEE2E2;
--card-shadow: 0 1px 2px rgba(15,23,42,.05);
--header-bg: #FFFFFF;
--heat-0: #E7E9F7; --heat-1: #C5C9F4; --heat-2: #A0A4F0; --heat-3: #7B7FEC; --heat-4: #6366F1;
```

**ESCURO (`.dark`):**
```
--background: #0A0F1C;          /* page */
--foreground: #E9EDF8;          /* ink */
--card: #111827;                /* surface */
--card-foreground: #E9EDF8;
--popover: #111827;
--popover-foreground: #E9EDF8;
--primary: #818CF8;             /* brand */
--primary-foreground: #0A0F1C;  /* texto escuro p/ contraste sobre indigo claro */
--secondary: #161F30;           /* surface-2 */
--secondary-foreground: #E9EDF8;
--muted: #161F30;
--muted-foreground: #9BA6BE;    /* ink-2 */
--accent: #161F30;
--accent-foreground: #E9EDF8;
--destructive: #F87171;
--destructive-foreground: #0A0F1C;
--success: #34D399;
--success-foreground: #0A0F1C;
--warning: #FBBF24;
--warning-foreground: #0A0F1C;
--border: #1F2937;
--input: #2C3850;               /* border-strong */
--ring: #818CF8;
/* EXTRAS Modern */
--brand: #818CF8;
--brand-2: #A78BFA;
--brand-soft: #1F2240;
--border-strong: #2C3850;
--foreground-subtle: #5E6A80;   /* ink-3 */
--success-soft: #0C2A20;
--warning-soft: #2A2310;
--destructive-soft: #2A1518;
--card-shadow: 0 1px 2px rgba(0,0,0,.5);
--header-bg: #0D1424;
--heat-0: #172033; --heat-1: #2B3470; --heat-2: #3E49A0; --heat-3: #5965D6; --heat-4: #818CF8;
```

No `@theme inline`, expor os extras como cores utilitárias Tailwind:
`--color-brand: var(--brand); --color-brand-soft: var(--brand-soft); --color-border-strong: var(--border-strong);
--color-foreground-subtle: var(--foreground-subtle); --color-success-soft: var(--success-soft);
--color-warning-soft: var(--warning-soft); --color-destructive-soft: var(--destructive-soft);`
e fontes: `--font-display: var(--font-display);` (sans/mono já existem).

### 1.2 Tipografia — `apps/web/src/app/layout.tsx`

Trocar Geist por (next/font/google):
- **Display** (títulos/headings/marca): `Space_Grotesk` -> CSS var `--font-display`.
- **Corpo** (sans padrão): `Inter` -> CSS var `--font-sans`.
- **Mono** (código/revisões/branches): `JetBrains_Mono` -> CSS var `--font-mono`.

Aplicar as 3 variáveis na `<html>`/`<body>`. Headings (`h1..h3`, títulos de card, marca SVNHUB,
números de stat) usam `font-display`; texto corrido usa `font-sans`; revisões `rNNNN`, nomes de
branch/tag, paths e trechos de código usam `font-mono`. Manter `--font-mono` no `.markdown-body`/diff.

### 1.3 Linguagem visual (aplicar em todas as fases)
- Cards: `bg-card border border-border` com raio `var(--radius)` e `box-shadow: var(--card-shadow)`; header
  do card com `border-b` e, quando fizer sentido, fundo `bg-secondary`.
- Botão primário: `bg-primary text-primary-foreground`, cantos `rounded-md`, sombra sutil.
- Botão secundário/ghost: `bg-secondary`/transparente, `border-border-strong`, hover `bg-accent`.
- Chips/badges: pílula (`rounded-full`), variantes soft: status usa `*-soft` de fundo + cor sólida do mesmo
  matiz (sucesso/warning/danger/brand). Ex.: "Privado" = borda `border-strong`; "default"/contagem = `brand-soft`+`brand`.
- Ícones de seção: quadradinho 28px `rounded-lg bg-brand-soft text-brand` com SVG (lucide).
- Texto: títulos `--foreground`; secundário `--muted-foreground` (ink-2); terciário `--foreground-subtle` (ink-3).
- Abas de navegação (repo/admin): underline de 2px em `--primary` no item ativo; inativo `muted-foreground`.
- Heatmap de contribuição: usar escala `--heat-0..4`.
- Pipelines/CI: dot + badge por status (success/running com pulse `svnpulse`/failed). Adicionar keyframes
  `svnpulse` (0/100% opacity 1; 50% opacity .35) no globals.css.
- Header do app: barra superior usando `--header-bg`, marca "SVNHUB" em font-display, busca global, sino de
  notificações, avatar. No protótipo a barra é escura; manter legível em ambos os temas via tokens.

---

## 2. FASES (1 subagente por fase; execução SOMENTE via ag-kit-bridge `execute_with_cursor`)

Cada fase: validar no disco após a execução do Cursor com
`pnpm -r typecheck`, `pnpm --filter @svnhub/web build`, `pnpm lint` (e `pnpm -r test` na fase final).
Não introduzir regressão de tipos/build. Se quebrar, **re-disparar `execute_with_cursor`** com instrução
corretiva (não corrigir à mão — execução é exclusiva do Cursor).

### FASE 1 — Fundação (tokens + tipografia + utilidades)
Arquivos: `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`.
- Reescrever `:root` e `.dark` com os tokens da seção 1.1 (claro+escuro) e extras.
- Mapear extras/fonte em `@theme inline`.
- Trocar fontes para Space Grotesk/Inter/JetBrains Mono (seção 1.2).
- Adicionar keyframes `svnpulse` e, se útil, utilitário de sombra de card.
- Manter blocos `.markdown-body` e `diff2html` funcionando (apenas re-bind de cores aos tokens).
Aceite: build e typecheck verdes; app carrega com paleta indigo/slate e novas fontes em claro e escuro.

### FASE 2 — Primitivos & chrome global
Arquivos: `apps/web/src/components/ui/*` (button, card, badge, avatar, input, tabs, dropdown-menu, dialog,
select, table, separator, label, alert, skeleton, empty-state, tooltip) e chrome:
`page-shell.tsx`, `app-header.tsx`, `app-footer.tsx`, `dashboard-sidebar.tsx`, `repo-nav.tsx`,
`repo-breadcrumbs.tsx`, `admin-nav.tsx`, `theme-toggle.tsx`, `auth-header-actions.tsx`.
- Ajustar CVA variants ao look Modern (raio 9px, brand indigo, badges pílula com variantes soft, inputs
  com `border-input`, foco `ring`).
- `app-header`: marca SVNHUB (font-display) + busca global + sino + avatar; fundo `--header-bg`.
- `repo-nav`/`admin-nav`: abas underline 2px brand.
Aceite: build verde; header/rodapé/abas no estilo Modern; primitivos consistentes em ambos os temas.

### FASE 3 — Dashboard
Arquivos: `app/page.tsx`, `components/dashboard-home.tsx`, `dashboard-activity-feed.tsx`,
`dashboard-pull-requests.tsx`, `contribution-heatmap.tsx` (escala heat), `user-avatar.tsx`.
- Layout 2 colunas (conteúdo flexível + rail ~300px), saudação em font-display, "Visão geral"
  eyebrow mono/brand uppercase.
- Cards de stat com ícone em quadradinho brand-soft, valor grande em font-display, sub colorido.
- Card de perfil, lista de repositórios com filtro, heatmap indigo, "Seus PRs abertos", "Aguardando seu
  review" (badge contagem), "Pipelines recentes" (dot+badge status), "Feed de atividade" + "Carregar mais".
Aceite: build verde; dashboard fiel ao protótipo (seção dashboard) em claro/escuro.

### FASE 4 — Repositório: overview & navegação de código
Arquivos: `app/repos/[slug]/page.tsx`, `tree/.../page.tsx`, `blob/.../page.tsx`, `blame/.../page.tsx`;
`components/file-browser.tsx`, `code-viewer.tsx`, `blame-viewer.tsx`, `readme-viewer.tsx`,
`repo-about-card.tsx`, `repo-contributors.tsx`, `checkout-instructions.tsx`, `health-status-badge.tsx`,
`copy-revision-button.tsx`, `markdown-content.tsx`.
- Header do repo (owner/nome/visibilidade pílula, descrição), chips de meta (linguagem, branches, tags,
  rNNNN revisões mono, status CI), abas underline.
- Faixa "Atividade de commits" (mini-bars brand), file-browser com header `bg-secondary`, ribbon do último
  commit em `bg-brand-soft`, linhas com ícone pasta/arquivo + msg + idade.
- README card; rail direito sticky: "Sobre" (saúde badge soft, branches/tags/revisões), botão instruções
  de checkout, "Contribuidores".
Aceite: build verde; overview e browsing fiéis ao protótipo (telas Repositório/Código).

### FASE 5 — Commits, Insights & Changelog
Arquivos: `app/repos/[slug]/commits/page.tsx`, `commit/[revision]/page.tsx`, `insights/page.tsx`,
`changelog/page.tsx`; `components/commit-history.tsx`, `commit-history-panel.tsx`,
`commit-detail-header.tsx`, `commit-file-list.tsx`, `commit-filters.tsx`, `commit-activity-chart.tsx`,
`diff-viewer.tsx`, `contribution-heatmap.tsx`, `author-distribution-chart.tsx`, `monthly-trend-chart.tsx`,
`changelog-timeline.tsx`.
- Commits agrupados por dia (avatar + msg + autor/hora/arquivos + rev mono).
- Insights: "Atividade de commits (52 semanas)" heatmap, "Tendência mensal" (gráfico), "Distribuição por
  autor" (barras), lista de contribuidores. Gráficos com cor brand/heat.
- diff-viewer e changelog no novo estilo.
Aceite: build verde; telas Commits/Insights fiéis ao protótipo.

### FASE 6 — Issues, Pull Requests, Branches, Tags, Compare, Pipelines
Arquivos: `app/repos/[slug]/issues/(page|new|[number])`, `pulls/(page|[number])`, `branches/page.tsx`,
`tags/page.tsx`, `compare/page.tsx`, `pipelines/(page|[pipelineId])`; componentes:
`issue-detail-panel.tsx`, `issue-new-form.tsx`, `pull-request-detail-panel.tsx`,
`create-pull-request-form.tsx`, `ref-manager.tsx`, `compare-form.tsx`, `pipelines-panel.tsx`,
`pipeline-detail-panel.tsx`, `pipeline-status-badge.tsx`.
- Issues: filtros Abertas/Fechadas, lista com labels (chips soft), num/status/autor, assignee avatar.
- PRs: filtros Todos/Abertos/Mergeados/Fechados, badge de estado, src->tgt chips mono.
- Branches: tabela (Nome/Criada/Último commit/Autor), default badge brand-soft, criar branch.
- Tags/Releases: tabela + criar release.
- Compare: base<-compare, contagem de arquivos, +add/-del, lista de diffs, "Criar pull request".
- Pipelines: lista com dot+badge status + steps; `.svnhub-ci.yml`.
Aceite: build verde; todas as telas fiéis ao protótipo.

### FASE 7 — Settings, Admin, Perfis, Busca & Polimento final
Arquivos: `app/repos/[slug]/settings/page.tsx`, `settings/profile/page.tsx`,
`app/admin/(users|backups|audit-log)/page.tsx`, `app/teams/(page|[slug])`, `app/users/[username]/page.tsx`;
componentes: `repo-settings.tsx`, `webhooks-panel.tsx`, `access-tokens-panel.tsx`,
`permissions-manager.tsx`, `profile-settings-form.tsx`, `teams-panel.tsx`, `admin-users-panel.tsx`,
`admin-audit-log-panel.tsx`, `backups-panel.tsx`, `global-search.tsx`, `notifications-bell.tsx`.
- Settings: seções (Geral, Proteção de paths/pre-commit com toggles, regex de mensagem, aprovações mínimas)
  e **Zona de perigo** (arquivar/excluir) com card de borda/realce destrutivo.
- Busca global (command palette) e sino de notificações no novo estilo.
- Perfis de usuário e teams, admin panels.
- Passada final: dark mode em todas as telas, responsividade, foco/contraste.
Aceite final: `pnpm -r typecheck`, `pnpm --filter @svnhub/web build`, `pnpm lint` e `pnpm -r test`
verdes (warnings pré-existentes tolerados); redesign Modern completo e consistente em claro/escuro.

---

## 3. Observações de execução
- Handoff: `.cursor/handoff/active.json` (slug `svnhub-redesign-modern`, plan acima).
- Resetar `phase` para `ready_for_execute` antes de cada disparo; após cada disparo o phase vira `done`.
- `followUp` está quebrado: sempre disparar sem ele.
- Commits por fase, Conventional Commits, escopo `web`/`ui`.
