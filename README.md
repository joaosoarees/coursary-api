# coursary-api

API serverless de uma plataforma de cursos: Lambda, API Gateway, Cognito e DynamoDB em single-table design, com Serverless Framework e TypeScript.

É um projeto de estudo. O objetivo é usar cada skill de DynamoDB, Cognito, Serverless e TypeScript instalada num caso real e anotar onde ela acertou ou falhou.

## Documentação

- [Planejamento e decisões](PLANNING.md)
- [Modelo de dados](docs/data-model.md)
- [Achados sobre as skills](docs/skill-findings.md)
- [Registro do processo de planejamento](docs/process-log.md)

## Chamando a API

`docs/api/coursary-api.postman_collection.json` tem todas as rotas. No Yaak, importe pelo formato Postman e preencha a variável `baseUrl` com o endpoint que o `pnpm deploy:dev` mostra no fim.

## Requisitos

- Node.js 24 (`.nvmrc`)
- pnpm 12

## Configuração da AWS e do Serverless

Feita uma vez por conta. As decisões estão na Q114 a Q122 de `PLANNING.md`.

### 1. Serverless Framework

O serviço pertence à org `worldiary` do Serverless (`org` no `serverless.yml`). Na sua máquina:

```bash
sls login
```

Se um comando responder `Forbidden` no passo "Authenticating", a sessão guardada em `~/.serverlessrc` não vale mais: rode `sls logout` e depois `sls login`.

### 2. Bootstrap da conta AWS

O `aws/bootstrap.yml` cria o acesso do projeto:

| Recurso | Para quê |
|---|---|
| `coursary-api-deployer` | Role usada nos deploys. Só alcança recursos `coursary-api-*` (onde o serviço filtra por nome) |
| `coursary-api-boundary` | Teto de toda role que o deploy cria: nenhuma Lambda passa disso |
| `coursary-api-ci` | Role sem permissões que o GitHub Actions assume por OIDC, só para o `sls package` |

Ele é aplicado por um usuário administrador da conta, com o perfil dele na AWS CLI. É o único uso desse usuário no projeto:

```bash
AWS_PROFILE=<perfil-admin> aws cloudformation deploy --region sa-east-1 --stack-name coursary-api-bootstrap --template-file aws/bootstrap.yml --capabilities CAPABILITY_NAMED_IAM --parameter-overrides OwnerUserName=<usuário-admin> HostedZoneId=<id-da-zona-do-route53>
```

Reaplique sempre que o `aws/bootstrap.yml` mudar, por exemplo quando um deploy falhar com `is not authorized to perform` numa ação que falta.

### 3. Perfil `coursary`

Acrescente ao `~/.aws/config`, com o ARN de `DeployerRoleArn` nas saídas da stack `coursary-api-bootstrap`:

```ini
[profile coursary]
role_arn = arn:aws:iam::<conta>:role/coursary-api-deployer
source_profile = <perfil-admin>
region = sa-east-1
```

Copie o `.env.example` para `.env` e preencha `AWS_PROFILE=coursary`. Para conferir:

```bash
AWS_PROFILE=coursary aws sts get-caller-identity
```

A resposta deve ser `assumed-role/coursary-api-deployer/...`.

### 4. Segredos do GitHub Actions

| Segredo | Valor |
|---|---|
| `SERVERLESS_ACCESS_KEY` | Chave de acesso da org `worldiary` (Dashboard do Serverless → Settings → Access Keys) |
| `AWS_CI_ROLE_ARN` | `CiRoleArn` nas saídas da stack `coursary-api-bootstrap` |
| `AWS_DEPLOY_ROLE_ARN` | `DeployerRoleArn` nas saídas da stack `coursary-api-bootstrap` |

```bash
gh secret set SERVERLESS_ACCESS_KEY
gh secret set AWS_CI_ROLE_ARN
gh secret set AWS_DEPLOY_ROLE_ARN
```

A role do CI confia no assunto imutável do OIDC deste repositório (`repo:<dono>@<id>/<repo>@<id>:*`). Se o repositório for recriado, os ids mudam e o bootstrap precisa ser atualizado.

## Branches

| Branch | Para quê | Recebe |
|---|---|---|
| `feat/…`, `chore/…` | Uma história ou ajuste | Commits |
| `develop` | Integração; cada merge deploya o stage `dev` | PRs das branches de trabalho |
| `main` | Versão estável | PRs da `develop` |

`main` e `develop` são protegidas por um ruleset do GitHub: só aceitam merge de PR com o check `check` verde, sem push direto, sem force-push e sem apagar a branch. O hook `pre-commit` também recusa commits nelas na sua máquina.

## Deploy

O merge na `develop` roda o job `deploy-dev` do CI depois das checagens. Ele roda no Environment `dev` do GitHub (que só aceita a `develop` e guarda os valores do stage: domínio da API, zona do Route 53, remetente e identidade do SES), assume a `coursary-api-deployer` por OIDC (a role só aceita o `sub` `environment:dev` deste repositório) e roda `pnpm deploy:dev`. Ainda não há deploy de `prod` por CI.

Da sua máquina, com o perfil `coursary`:

```bash
pnpm deploy:dev
pnpm remove:dev
```

Só o stage `dev` existe por enquanto. O `prod` está declarado, com proteção contra exclusão e PITR, mas não é deployado (Q116).

## Primeiro admin

Toda conta nasce `student`. O primeiro admin é promovido por uma função interna, sem rota HTTP (Q172), a partir de uma conta já confirmada:

```bash
AWS_PROFILE=coursary pnpm exec sls invoke -f promoteAdmin --stage dev --data '{"email":"<e-mail da conta>"}'
```

A resposta traz `changed: true` quando a conta foi promovida e `false` quando já era admin. O papel chega ao access token no próximo sign-in ou refresh (até 1 h). A troca fica registrada num `RoleChange` com `changedBy: bootstrap`.

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm install` | Instala as dependências e os hooks de git |
| `pnpm typecheck` | Checa os tipos |
| `pnpm lint` | Roda o ESLint |
| `pnpm format` | Formata com o Prettier |
| `pnpm test` | Roda os testes |
| `pnpm sls:package` | Gera o template de `dev` sem deployar |
| `pnpm check:bundles` | Empacota e carrega cada handler como a Lambda (precisa de credencial AWS) |
