# SVNHUB

Plataforma web de gerenciamento de repositórios **Apache Subversion (SVN)** com experiência inspirada no GitHub: navegação de código, revisões, branches, pull requests, permissões por path e CI/CD — respeitando o modelo centralizado do SVN.

## Arquitetura (resumo)

```
Cliente SVN / Browser
        │
        ├──► Next.js (apps/web) ── REST ──► NestJS API (apps/api)
        │                                      │
        └──► Apache mod_dav_svn (hooks) ───────┘
                                               ├── PostgreSQL (metadados)
                                               ├── Redis + BullMQ (filas)
                                               └── svn/svnadmin/svnlook (CLI local)
                                                        │
                                               CI Runners (apps/runner)
```

| Componente | Função |
|---|---|
| **apps/web** | UI estilo GitHub (browser, diffs, PRs, pipelines, admin) |
| **apps/api** | Regras de negócio, auth, PRs, permissões, backups, auditoria |
| **apps/runner** | Worker de CI que executa pipelines em containers Docker |
| **packages/shared** | Tipos e contratos compartilhados |
| **infra/apache-svn** | Servidor SVN via Docker Compose (opcional em dev) |

O conteúdo versionado vive no SVN; o Postgres guarda metadados (usuários, PRs, pipelines, auditoria, cache de revisões).

## Quickstart (dev completo)

Pré-requisitos: **Node.js 22+**, **pnpm 9+**, **Docker** (Postgres, Redis e SVN), binários **svn**, **svnadmin** e **svnlook** no `PATH` (a API usa a CLI local para criar/ler repositórios).

```bash
# 1. Dependências
pnpm install

# 2. Variáveis de ambiente
cp .env.example .env
# Ajuste secrets em produção; LDAP vazio = contas locais

# 3. Infraestrutura (Postgres + Redis + SVN Apache)
docker compose up -d db redis svn

# 4. Banco de dados + usuário admin inicial
pnpm db:migrate
pnpm db:seed

# 5. Desenvolvimento (web :3000, api :4000, runner)
pnpm dev
```

| Serviço | URL |
|---|---|
| Web | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:4000](http://localhost:4000) |
| SVN (HTTP) | [http://localhost:8080/svn](http://localhost:8080/svn) |

### Login inicial (após `pnpm db:seed`)

| Campo | Valor padrão |
|---|---|
| E-mail | `admin@svnhub.local` |
| Senha | `Admin@123` |
| Username SVN | `admin` (mesma senha para `svn checkout`) |

Altere `ADMIN_INITIAL_PASSWORD` no `.env` antes do seed para outra senha.

> **Por que o SVN no Docker?** A API cria repositórios em `data/repos/` na sua máquina; o container Apache monta a mesma pasta e serve checkout/commit via HTTP. Os hooks do SVN chamam a API em `host.docker.internal:4000`.

Documentação detalhada:

- [docs/SETUP.md](docs/SETUP.md) — instalação, LDAP, variáveis de ambiente
- [docs/DEPLOY-COOLIFY.md](docs/DEPLOY-COOLIFY.md) — deploy no Coolify (Git + senhas auto)
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — backups, verify/recover, authz, hooks
- [docs/PLAN-svnhub-mvp.md](docs/PLAN-svnhub-mvp.md) — plano completo do MVP

## Produção (Coolify)

Stack completo para VPS com [Coolify](https://coolify.io): Postgres, Redis, API, Web, Apache/SVN e Runner CI no mesmo compose.

```bash
# Arquivo usado no Coolify (Docker Compose location)
docker-compose.coolify.yml
```

Senhas geradas automaticamente pelo Coolify: `SERVICE_PASSWORD_POSTGRES`, `SERVICE_PASSWORD_ADMIN`, `SERVICE_PASSWORD_JWT`, etc. — visíveis em **Environment Variables** após o deploy.

Guia completo: [docs/DEPLOY-COOLIFY.md](docs/DEPLOY-COOLIFY.md)

### Dev local (infra only)

```bash
docker compose up -d db redis svn
# Em seguida: pnpm db:migrate && pnpm db:seed && pnpm dev
```

## Monorepo

| Pacote | Descrição |
|---|---|
| `@svnhub/web` | Frontend Next.js 15 |
| `@svnhub/api` | Backend NestJS |
| `@svnhub/runner` | Worker de CI |
| `@svnhub/shared` | Tipos compartilhados |

```bash
pnpm -r typecheck   # TypeScript em todos os pacotes
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm build          # Build de produção
```

## Licença

Projeto privado — uso interno.
