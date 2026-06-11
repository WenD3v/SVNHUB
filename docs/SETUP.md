# Setup — SVNHUB

Guia de instalação e configuração para desenvolvimento e implantação inicial.

## Requisitos

| Requisito | Versão / notas |
|---|---|
| Node.js | **22+** (ver `engines` no `package.json` raiz) |
| pnpm | **9+** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`) |
| PostgreSQL | 16 recomendado |
| Redis | 7 recomendado |
| SVN CLI | `svn`, `svnadmin`, `svnlook` no `PATH` |
| Docker (opcional) | Para Postgres/Redis/SVN via Compose |

### Verificar binários SVN

```bash
svn --version
svnadmin --version
svnlook --version
```

Opcionalmente, defina caminhos explícitos no `.env`:

```env
# SVN_BIN=
# SVNADMIN_BIN=
# SVNLOOK_BIN=
```

## Instalação

```bash
git clone <repo-url> svnhub
cd svnhub
pnpm install
cp .env.example .env
```

## Infraestrutura com Docker Compose

Para rodar o projeto **completo** em dev, suba os três serviços:

```bash
docker compose up -d db redis svn
```

| Serviço | Porta | Descrição |
|---|---|---|
| `db` | 5432 | PostgreSQL (`svnhub` / `svnhub`) |
| `redis` | 6379 | Filas BullMQ |
| `svn` | 8080 | Apache + mod_dav_svn |

O container `svn` monta volumes do monorepo:

| Host | Container | Uso |
|---|---|---|
| `data/repos/` | `/var/svn/repos` | Repositórios FSFS (criados pela API via CLI local) |
| `data/svn-authz` | `/etc/apache2/svn-authz` | Permissões compiladas pela API |
| `data/svn-passwd` | `/etc/apache2/dav_svn.passwd` | Credenciais Basic Auth do SVN |

A API usa `svn`/`svnadmin` no **host** (Windows/Linux) para criar repos em `data/repos/`. O Apache no Docker apenas **serve** esses mesmos arquivos.

Hooks (`post-commit`, `pre-commit`) rodam **dentro do container** e chamam a API via `API_INTERNAL_URL`. No Windows/Mac com Docker Desktop, use:

```env
API_INTERNAL_URL=http://host.docker.internal:4000
```

## Banco de dados e admin inicial

```bash
# Gerar client Prisma
pnpm db:generate

# Aplicar migrations
pnpm db:migrate

# Criar usuário admin + arquivos SVN (authz, htpasswd)
pnpm db:seed
```

O seed cria:

- Usuário local **admin** no PostgreSQL (`isAdmin: true`)
- Arquivo `data/svn-passwd` para autenticação SVN via Apache
- Placeholder `data/svn-authz` (atualizado quando você criar repositórios)
- Diretórios `data/repos/` e `data/artifacts/`

| Variável | Padrão |
|---|---|
| `ADMIN_EMAIL` | `admin@svnhub.local` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_INITIAL_PASSWORD` | `Admin@123` |

Use o **mesmo username/senha** para login na web e para `svn checkout` via HTTP.

Em desenvolvimento, alternativa rápida (sem histórico de migration):

```bash
pnpm db:push
```

## Variáveis de ambiente

Copie `.env.example` e ajuste:

### API

| Variável | Descrição | Padrão |
|---|---|---|
| `API_PORT` | Porta da API | `4000` |
| `WEB_ORIGIN` | Origem CORS do frontend | `http://localhost:3000` |
| `DATABASE_URL` | Connection string PostgreSQL | — |
| `REDIS_URL` | Connection string Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Segredo para tokens JWT | **altere em produção** |
| `JWT_ACCESS_TTL_SECONDS` | TTL do access token | `900` |
| `JWT_REFRESH_TTL_DAYS` | TTL do refresh token | `30` |
| `INTERNAL_HOOK_SECRET` | Segredo dos hooks SVN → API | **altere em produção** |
| `RUNNER_SECRET` | Autenticação runner → API | **altere em produção** |

### SVN

| Variável | Descrição | Padrão |
|---|---|---|
| `SVN_REPOS_ROOT` | Diretório local dos repositórios (relativo à raiz do monorepo) | `data/repos` |
| `SVN_AUTHZ_PATH` | Arquivo authz gerado pela API | `data/svn-authz` |
| `SVN_PASSWD_PATH` | Arquivo htpasswd para Apache SVN | `data/svn-passwd` |
| `SVN_HTTP_URL` | URL pública HTTP(S) | `http://localhost:8080/svn` |
| `SVN_SVN_URL` | URL svn:// | `svn://localhost/svn` |
| `SVN_CLI_TIMEOUT_MS` | Timeout dos comandos CLI | `120000` |
| `SVN_BACKUP_ROOT` | Diretório de backups hotcopy | `{SVN_REPOS_ROOT}/../backups` |
| `API_INTERNAL_URL` | URL da API vista pelos hooks SVN no Docker | `http://host.docker.internal:4000` |

### Web

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API (`http://localhost:4000`) |

### Runner

| Variável | Descrição |
|---|---|
| `RUNNER_POLL_INTERVAL_MS` | Intervalo de polling |
| `API_INTERNAL_URL` | URL interna da API |
| `ARTIFACTS_STORAGE_PATH` | Armazenamento de artefatos CI |

## LDAP / Active Directory

LDAP é requisito do MVP para ambientes corporativos. A mesma fonte autentica a web e o `mod_dav_svn` (`mod_authnz_ldap`).

Deixe `LDAP_URL` vazio para usar **apenas contas locais** (e-mail + senha Argon2).

```env
LDAP_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=CN=svc-svnhub,OU=Services,DC=example,DC=com
LDAP_BIND_PASSWORD=secret
LDAP_SEARCH_BASE=DC=example,DC=com
LDAP_SEARCH_FILTER=(|(mail={email})(userPrincipalName={email}))
```

O filtro `{email}` é substituído pelo e-mail informado no login.

## E-mail (SMTP, opcional)

Desabilitado por padrão. Quando ativo, a API envia e-mails de **reset de senha pelo admin** e **menções `@username`** em comentários de PR/issue. Os envios usam a fila BullMQ existente (`webhooks`), sem fila dedicada.

```env
SMTP_ENABLED=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=svnhub@example.com
```

Defina `SMTP_ENABLED=true` e configure host/porta/remetente. Credenciais são opcionais para relays internos sem autenticação.

### Contas locais

Usuários com `isLocal: true` no banco autenticam com senha hash Argon2 na web. O primeiro admin é criado com `pnpm db:seed`. A senha em texto plano do seed também é gravada em `data/svn-passwd` para checkout SVN via Apache (formatos diferentes: Argon2 na web, APR1 no htpasswd).

## Desenvolvimento

```bash
pnpm dev
```

Isso inicia em paralelo:

- **web** — [http://localhost:3000](http://localhost:3000)
- **api** — [http://localhost:4000](http://localhost:4000)
- **runner** — worker de CI

## Qualidade

```bash
pnpm lint
pnpm -r typecheck
pnpm test
pnpm --filter @svnhub/web build
```

## Próximos passos

- [docs/OPERATIONS.md](OPERATIONS.md) — operação diária (backups, verify, recover)
- [docs/PLAN-svnhub-mvp.md](PLAN-svnhub-mvp.md) — escopo e roadmap do MVP
