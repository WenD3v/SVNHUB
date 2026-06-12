# Deploy no Coolify

Guia para subir o SVNHUB no [Coolify](https://coolify.io) via Git, com Postgres, Redis, API, Web, SVN e Runner no **mesmo stack Docker Compose**.

## Resposta rápida

| Pergunta | Resposta |
|---|---|
| API / Postgres / Redis podem ser locais no Coolify? | **Sim.** Todos rodam como serviços do `docker-compose.coolify.yml` no seu VPS. |
| Senha do Postgres? | Coolify gera `SERVICE_USER_POSTGRES` e `SERVICE_PASSWORD_POSTGRES` automaticamente. |
| Senha do admin? | Coolify gera `SERVICE_PASSWORD_ADMIN` — visível em **Environment Variables** do resource. |
| Preciso de Git externo depois? | Não para operar a plataforma; use SVN dentro do SVNHUB para seus projetos. O deploy da **plataforma** usa Git → Coolify. |

## Pré-requisitos

- VPS com Coolify v4+ instalado
- Repositório Git (GitHub, GitLab, Gitea, etc.) com este monorepo
- Três domínios (ou subdomínios) apontando para o VPS, por exemplo:
  - `svnhub.seudominio.com` → serviço **web**
  - `api.seudominio.com` → serviço **api**
  - `svn.seudominio.com` → serviço **svn**

## Passo a passo no Coolify

### 1. Criar o resource

1. **+ New Resource** → **Docker Compose**
2. Conecte seu repositório Git
3. **Docker Compose location:** `docker-compose.coolify.yml`
4. Branch: `main` (ou a sua)

### 2. Configurar domínios por serviço

No resource, atribua FQDN/HTTPS a cada serviço exposto:

| Serviço Compose | Porta interna | Domínio sugerido |
|---|---|---|
| `web` | 3000 | `svnhub.seudominio.com` |
| `api` | 4000 | `api.seudominio.com` |
| `svn` | 80 | `svn.seudominio.com` |

O Coolify preenche automaticamente:

- `SERVICE_URL_WEB`
- `SERVICE_URL_API`
- `SERVICE_URL_SVN`

### 3. Variáveis geradas automaticamente

Ao fazer deploy, o Coolify cria e exibe em **Environment Variables**:

| Variável | Uso |
|---|---|
| `SERVICE_USER_POSTGRES` | Usuário PostgreSQL |
| `SERVICE_PASSWORD_POSTGRES` | Senha PostgreSQL |
| `SERVICE_PASSWORD_ADMIN` | Senha inicial do admin (web + SVN) |
| `SERVICE_PASSWORD_JWT` | Segredo JWT da API |
| `SERVICE_PASSWORD_HOOK` | Segredo hooks SVN → API |
| `SERVICE_PASSWORD_RUNNER` | Autenticação runner → API |

Opcional (valores padrão já existem no compose):

| Variável | Padrão |
|---|---|
| `POSTGRES_DB` | `svnhub` |
| `ADMIN_EMAIL` | `admin@svnhub.local` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_DISPLAY_NAME` | `SVNHUB Admin` |

### 4. Deploy

Clique em **Deploy**. Na primeira subida, a API executa:

1. `pnpm db:migrate`
2. `pnpm db:seed` (cria admin + arquivos SVN)
3. Inicia o NestJS

### 5. Login inicial

Após o deploy bem-sucedido, abra **Environment Variables** no Coolify e copie:

- **E-mail:** valor de `ADMIN_EMAIL` (padrão `admin@svnhub.local`)
- **Usuário SVN:** valor de `ADMIN_USERNAME` (padrão `admin`)
- **Senha:** valor de `SERVICE_PASSWORD_ADMIN`

Use as mesmas credenciais na web e no `svn checkout`:

```bash
svn checkout https://svn.seudominio.com/svn/meu-repo/trunk --username admin
```

## Arquitetura do stack

```
Traefik (Coolify)
├── web:3000        → UI Next.js
├── api:4000        → NestJS (+ svnadmin no mesmo volume)
├── svn:80          → Apache mod_dav_svn
├── postgres:5432   → metadados
├── redis:6379      → filas BullMQ
└── runner          → CI (acesso ao Docker socket do host)
```

Volumes compartilhados entre **api** e **svn** (volume único `svnhub_data`):

- `data/repos/` — repositórios FSFS
- `data/svn-authz` — permissões
- `data/svn-passwd` — htpasswd Apache
- `data/artifacts/` — artefatos CI

## CI Runner e Docker

O serviço `runner` monta `/var/run/docker.sock` para executar pipelines em containers. Isso exige que o host Coolify tenha Docker funcional e que você aceite o risco de segurança do socket (padrão em stacks de CI self-hosted).

Se não for usar CI agora, o runner ainda sobe sem impacto; pipelines ficam enfileiradas até o runner processar.

## Redeploy após mudar domínio da API

`NEXT_PUBLIC_API_URL` é definida no **build** da imagem `web`. Se você alterar o domínio da API depois do primeiro deploy, faça **Redeploy** (rebuild) do stack para recompilar o frontend com a URL correta.

## LDAP (opcional)

Defina no Coolify, no serviço `api`:

```env
LDAP_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=CN=svc-svnhub,OU=Services,DC=example,DC=com
LDAP_BIND_PASSWORD=secret
LDAP_SEARCH_BASE=DC=example,DC=com
```

Deixe `LDAP_URL` vazio para contas locais apenas.

## Desenvolvimento local vs Coolify

| Ambiente | Compose |
|---|---|
| Dev local (só infra) | `docker compose up -d db redis svn` + `pnpm dev` |
| Produção Coolify | `docker-compose.coolify.yml` (stack completo) |

## Troubleshooting

| Sintoma | Verificação |
|---|---|
| API unhealthy | Logs do serviço `api`. Procure `[api] ERROR:` — migrate, seed ou prisma CLI. Primeiro deploy exige `SERVICE_PASSWORD_ADMIN`. Redeploys com admin existente não redefinem senha. |
| SVN 401 no healthcheck | Normal (Apache exige auth); healthcheck aceita 401 ou 200 |
| CORS na web | `WEB_ORIGIN` deve ser exatamente `SERVICE_URL_WEB` |
| Checkout SVN falha | `SVN_HTTP_URL` = `{SERVICE_URL_SVN}/svn` |
| Pipelines não rodam | Runner com acesso ao Docker socket; `RUNNER_SECRET` igual na api e runner |

## Próximo passo: versionar código no SVNHUB

Com a plataforma no ar:

1. Login como admin → **New Repository** → ex.: `meu-projeto`
2. Importe ou faça checkout do trunk
3. Commits SVN passam a ser o fluxo de versionamento dos seus projetos

O código **da plataforma SVNHUB** continua no Git para deploy no Coolify; os **seus projetos** ficam no SVN gerenciado pela instância.
