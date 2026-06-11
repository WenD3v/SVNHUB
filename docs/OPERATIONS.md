# Operações — SVNHUB

Guia operacional para administradores de instância e maintainers de repositório.

## Backups (hotcopy)

O SVNHUB agenda backups via **cron da instância** e permite execução manual por repositório.

### Configuração

| Setting | Descrição | Padrão |
|---|---|---|
| `backupCron` | Expressão cron para backup de todos os repos | `0 2 * * *` |
| `backupRetentionCount` | Nº de backups bem-sucedidos mantidos por repo | `7` |
| `verifyCron` | Cron para `svnadmin verify` em todos os repos | `0 3 * * 0` |

**UI:** Configurações do repositório → seção *Backups e saúde* (admins editam cron/retenção).

**API:**

- `GET /admin/settings/backups` — leitura (admin)
- `PATCH /admin/settings/backups` — atualização (admin)
- `GET /repositories/:slug/backup-settings` — leitura (maintainer+)
- `GET /repositories/:slug/backups` — histórico
- `POST /repositories/:slug/backups/run` — hotcopy manual (maintainer+)

Backups são gravados em `SVN_BACKUP_ROOT` (padrão: `{SVN_REPOS_ROOT}/../backups/{slug}/{timestamp}`).

### Retenção

Após cada backup bem-sucedido, entradas antigas além do limite configurado são removidas do disco e do banco.

## Verificação de integridade (verify)

`svnadmin verify` valida a consistência do repositório FSFS.

### Saúde do repositório

| Status | Significado |
|---|---|
| `UNKNOWN` | Nunca verificado |
| `VERIFYING` | Job em andamento |
| `HEALTHY` | Última verificação OK |
| `UNHEALTHY` | Falha na verificação (ver `lastError`) |

**UI:** Badge de saúde na página do repositório; detalhes em Configurações → Backups.

**API:**

- `POST /repositories/:slug/verify` — dispara verificação (maintainer+)

Jobs agendados e manuais registram evento de auditoria `repo.verify`.

## Recuperação (recover)

`svnadmin recover` repara repositórios após falha não limpa (ex.: interrupção durante escrita).

> **Atenção:** operação destrutiva em cenários de corrupção. Execute apenas quando necessário e com backup recente.

**UI:** Configurações do repositório → seção *Recuperação* — digite o slug para confirmar.

**API:**

```http
POST /repositories/:slug/recover
Content-Type: application/json

{ "confirmSlug": "meu-repo" }
```

Requer papel **OWNER** no repositório. Registra auditoria `repo.recover`.

## Autorização (authz)

### Papéis por repositório

| Papel | Nível |
|---|---|
| READER | Leitura |
| DEVELOPER | Leitura + commits (conforme authz) |
| MAINTAINER | Settings, backups, verify, membros |
| OWNER | Recover, exclusão, operações críticas |

Admins de instância (`User.isAdmin = true`) têm acesso total.

### Permissões por path

A UI compila permissões granulares (usuário/grupo × path × read/write) para o arquivo **authz** do SVN. Toda alteração regenera authz de forma atômica.

**UI:** Configurações → Permissões por path.

### Tokens de acesso pessoal

Tokens `svnhub_*` autenticam a API e checkout/CI. Escopos configuráveis por token.

## Hooks

Hooks instalados pelo SVNHUB em cada repositório criado:

| Hook | Função |
|---|---|
| `pre-commit` | Políticas (mensagem, paths protegidos, tamanho) |
| `post-commit` | Indexação, webhooks, CI, atualização de PRs |
| `pre-revprop-change` / `post-revprop-change` | Edição auditada de mensagens de log |
| Lock hooks | Políticas e notificações de lock |

Hooks chamam a API com header `X-Hook-Secret: {INTERNAL_HOOK_SECRET}`.

Endpoints internos usam `InternalHookGuard` — nunca exponha o segredo.

## Auditoria

Eventos administrativos são registrados em `AuditLog`:

- Ações de backup, verify, recover
- Alterações de settings, permissões, membros
- Login/logout (conforme implementado)

**UI:**

- Por repositório: Configurações → Auditoria (últimos 20 eventos)
- Global (admin): `/admin/audit-log`

**API:**

- `GET /repositories/:slug/audit-log?limit=&offset=` (maintainer+)
- `GET /admin/audit-log?limit=&offset=` (admin)

## Segurança

| Medida | Detalhe |
|---|---|
| Rate limiting | Login limitado a 5 req/min por IP (`@nestjs/throttler`) |
| JWT + refresh | Sessão web; tokens pessoais para CLI/CI |
| Helmet | Headers HTTP de segurança na API |
| Guards | JWT, repo role, admin, hook secret, runner secret |
| CI runners | Containers isolados; sem rede privilegiada por padrão |

## Troubleshooting

| Sintoma | Ação |
|---|---|
| Badge `UNHEALTHY` | Ver `lastError` nas settings; executar verify manual; considerar recover |
| Backup `FAILED` | Verificar permissões em `SVN_BACKUP_ROOT` e espaço em disco |
| Hook não dispara CI | Conferir `INTERNAL_HOOK_SECRET` e conectividade hook → API |
| LDAP falha | Validar `LDAP_*` e bind; testar com conta local como fallback |
| CLI timeout | Aumentar `SVN_CLI_TIMEOUT_MS` para repos grandes |

## Referências

- [SETUP.md](SETUP.md) — instalação
- [PLAN-svnhub-mvp.md](PLAN-svnhub-mvp.md) — escopo MVP
