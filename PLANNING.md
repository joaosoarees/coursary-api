# Coursary: planejamento (sessão de grilling em andamento)

Última atualização: 2026-10-18. Estado: **fases 1 e 2, R.1 a R.7 e 3.1 a 3.3 na `develop` e em `dev`; rajada da busca em 3 até o teto de concorrência subir (Q339); 3.4 (limpeza do Cognito) em andamento na `feat/3.4-cognito-cleanup` (Q341 a Q346)**.

## Como retomar

Abra o Claude Code e diga:

> Leia `PLANNING.md` e continue o grilling (`/mattpocock-skills:grilling`) do ponto em que paramos.

Ao retomar, o assistente deve:

1. Ver no estado acima e na tabela "Fase 1: histórias" qual história é a próxima.
2. A fase 3 está quebrada (Q304): R.5 (escopo no JWT, Q301), 3.1 descrição em item à parte (Q298), 3.2 catálogo no Algolia (stream, roteador Q302, chaves no SSM lidas no cold start Q303/Q305), 3.3 `GET /search` (Q297), 3.4 limpeza do Cognito (Q300), 3.5 e 3.6 e-mails pelo SES (Q293/Q294), 3.7 apagar rascunho (Q299). Antes da 3.2, o autor cria a aplicação no Algolia e grava as chaves no SSM. Seguir o "Começar tarefa" do `CLAUDE.md` e o `/code-review` antes de cada PR.
3. Seguir o "Começar tarefa X.X" do `CLAUDE.md`: branch a partir da `develop`, sub-imp propostas e discutidas antes de codar.
4. Não refazer perguntas já fechadas.
5. Pendente da Q339: quando o Service Quotas aprovar 1.000 execuções simultâneas (`aws service-quotas list-requested-service-quota-change-history --service-code lambda`), voltar a rajada do `GET /search` para 10 em `sls/resources/api-gateway/Throttling.yml`.

Cada decisão fechada entra neste arquivo em um commit pequeno.

## O projeto em uma frase

Uma API serverless de plataforma de cursos (Lambda + DynamoDB single-table), cujo critério de sucesso é: cada skill de DynamoDB instalada foi usada pelo menos uma vez em um caso real, e anotamos onde a skill errou ou faltou.

## Decisões fechadas

### Raiz

| # | Decisão | Resposta |
|---|---|---|
| Q1 | Objetivo | Campo de prova das skills, com aprendizado prático de DynamoDB. Achados sobre as skills retroalimentam o repositório de skills. |
| Q2 | Domínio | Plataforma de cursos. E-commerce descartado por ser o exemplo provável das próprias skills. |
| Q3 | Superfície | Backend (API HTTP em Lambda, Serverless Framework) primeiro. *O frontend `web` entrou como fase 5 na Q27.* |
| Q4 | Onde roda | Deploy real na AWS, on-demand. Sem API rodando local. |
| Q5 | Tamanho | Algumas semanas, em fases entregáveis sozinhas. *A lista de fases foi substituída pela Q27.* |
| Q6 | Autenticação | Sim, autenticação de verdade, com o foodiary como modelo. |

### Domínio

| # | Decisão | Resposta |
|---|---|---|
| Q7 | Atores | Aluno, instrutor e admin. |
| Q8 | Hierarquia | Curso → Módulo → Aula (sort key hierárquica; curso inteiro em uma query). |
| Q9 | Progresso | Um item por aula concluída + contador de aulas concluídas na matrícula. Create único com `attribute_not_exists`, `ADD` atômico, os dois em transação. |
| Q10 | Ciclo de vida do curso | Rascunho → publicado → arquivado. Catálogo como índice esparso (só publicados têm a chave do GSI). O filtro do stream só indexa publicados e remove ao arquivar. |
| Q11 | Extras | Só avaliações (nota e comentário, com média e contagem precomputadas no curso), na fase de desnormalização. Fora: certificado, pagamento. *Upload entrou na Q27 (capa do curso na fase 4, vídeo como opcional).* |
| Q12 | Busca | Só Algolia (plano gratuito), alimentado pelo stream da tabela. Sem fase de busca dentro do DynamoDB. |
| Q21 | Papéis na prática | Todo mundo nasce aluno. O admin promove a instrutor, lista usuários e arquiva qualquer curso. O primeiro admin é criado por script. |
| Q23 | Cancelar matrícula | Apaga a matrícula e o progresso e decrementa o contador de alunos, em transação. A avaliação fica. |
| Q24 | Curso publicado | Pode acrescentar aulas, não pode remover. O curso guarda o total de aulas (contador); o percentual é calculado na leitura, nunca gravado. |

### Padrões de acesso (Q22, confirmados)

| # | Padrão | Quem |
|---|---|---|
| 1 | Buscar conta por id / por e-mail | sistema |
| 2 | Listar usuários (paginado), filtrar por papel | admin |
| 3 | Criar, editar, publicar, arquivar curso | instrutor |
| 4 | Listar cursos de um instrutor (todos os estados) | instrutor |
| 5 | Catálogo: cursos publicados, mais recentes primeiro (paginado) | público |
| 6 | Curso completo: curso + módulos + aulas em uma leitura | público |
| 7 | Criar, editar, reordenar módulos e aulas | instrutor |
| 8 | Matricular-se / cancelar matrícula | aluno |
| 9 | Minhas matrículas, com título do curso e progresso | aluno |
| 10 | Alunos matriculados em um curso (paginado) | instrutor |
| 11 | Marcar aula como concluída (uma vez só) | aluno |
| 12 | Meu progresso em um curso: quais aulas concluí | aluno |
| 13 | Avaliar curso (uma avaliação por matrícula), editar | aluno |
| 14 | Avaliações de um curso, mais recentes primeiro (paginado) | público |
| 15 | Buscar cursos por texto | público (Algolia) |

Os padrões 5 e 6 são públicos (sem login) de propósito: rotas sem authorizer ao lado das privadas.

Entidades que saem daí: Account, Course, Module, Lesson, Enrollment, LessonProgress, Review, e o item de unicidade de e-mail.

### Arquitetura

| # | Decisão | Resposta |
|---|---|---|
| Q13 | Ponto de partida | Projeto novo, trazendo do foodiary só as peças reutilizáveis e corrigindo os defeitos na entrada (lista abaixo). |
| Q14 | Container DI | Portas como **classes abstratas** (existem em runtime, aparecem em `design:paramtypes`). O container ganha `bind(Abstrata, Concreta)`. Use cases dependem da abstrata; testes passam fake em memória pelo construtor. `application` deixa de importar `infra`. |
| Q15 | Lado de leitura | Mantém a separação escrita (repositórios) / leitura (classes de query que devolvem DTOs), mas as queries também ficam atrás de porta abstrata, com implementação Dynamo em `infra`. |
| Q16/Q19 | Testes | Unitários de use cases e entidades com fakes em memória; unitários dos `*Item` (chaves e mapeamento ida e volta); integração de repositórios e queries contra **DynamoDB Local em Docker** (Vitest sobe a tabela, roda, derruba). Sem `serverless-offline`, sem autenticação simulada. Docker 29.9.0 já está instalado e rodando. |
| Q17 | Escopo da auth | Tudo como no foodiary: sign-up, sign-in, refresh, recuperação de senha com SES e template React Email. *Revisar quando as skills de Cognito existirem.* |
| Q18 | Unicidade de e-mail | Item `EMAIL#<email>` gravado na mesma transação do sign-up com `attribute_not_exists`; erro de duplicidade do Cognito mapeado para 409. |
| Q25 | Infra AWS | Mesma conta e região do foodiary (`sa-east-1`), reaproveitando a identidade SES. Sem domínio customizado no início; trazer o `CustomDomain.yml` condicional para ligar depois. |
| Q26 | Nome e local | `coursary`. *O local mudou com a Q102 (repositórios separados).* |

### Sessão de 2026-10-14

| # | Decisão | Resposta |
|---|---|---|
| Q27 | Escopo e fases (história PLAN-1) | Todas as propostas das novas skills entram, nas fases abaixo. |
| Q28 | Onde ficam as tarefas | Em uma página do claude.ai com banco de dados próprio, no formato do Jira (épico → história → sub-imp). Não no Jira nem no Notion. Quadro: https://claude.ai/artifact/2Q6GjZ5cPXusYktJJw4LNj (privado). |
| Q29 | Template das tarefas | História = entrega visível pela API. Sub-imp por camada (`*Item` e chaves, repositório/query, use case, controller e rota, IaC, testes). Campos: fase, padrões de acesso, skills (uma label por skill), critério de pronto. Toda sub-imp tem a seção "Achados sobre a skill". Um épico por fase, com vínculos "bloqueia" entre histórias. |
| Q30 | Padrões do projeto | Viram a história PLAN-6 (decisão) e a história 1.0 (esqueleto do repositório, primeira da fase 1). |
| Q31 | Registro | Toda decisão fechada entra neste arquivo em um commit pequeno. |
| Q38 | **Princípio: a aplicação é a fonte da verdade** | Identidade, unicidade e regras vivem na aplicação e no DynamoDB. Serviços externos (Cognito, SES, Algolia) ficam atrás de portas e podem ser trocados sem mudar o domínio. Toda decisão passa por este filtro. |
| Q32 | Identidade | `internalId` próprio (KSUID), gravado como `custom:internalId` no Cognito e posto no access token pelo trigger de pre token. O `sub` fica só como `externalId`. |
| Q18 | Unicidade de e-mail (confirmada pela Q38) | Item `EMAIL#<email>` com `attribute_not_exists`, na mesma transação do Account. A unicidade do Cognito é uma segunda barreira, não a regra. |
| Q34 | Quando nasce o Account | Na rota de sign-up, gravado pela aplicação. Ordem e confirmação: ver Q39. |
| Q35 | Confirmação do cadastro | Código por e-mail em todos os stages, sem auto-confirmação. |
| Q36 | Duração dos tokens | Access e id de 1 h; refresh de 30 dias com rotação. |
| Q37 | E-mails de autenticação | SES via Cognito, texto pelo trigger de custom message. O Resend talvez nem entre (a fase 3 decide). |
| Q20 | Onde vive o papel | `role` no Account (fonte da verdade), copiado para o access token pelo trigger de pre token, que lê o Dynamo. Papel desatualizado por no máximo 1 h. Rotas de admin que mudam papel leem o papel do Dynamo na hora. Grupos do Cognito descartados pela Q38. |
| Q39 | Ordem do sign-up | (1) Transação no Dynamo: Account `PENDING` e `EMAIL#`, ambos com TTL de 3 dias. (2) `SignUp` no Cognito com `custom:internalId`; se falhar, apagar os dois itens. (3) A confirmação marca `ACTIVE` e remove o TTL. Leituras ignoram itens vencidos ainda não apagados. |
| Q40 | Quem marca a confirmação | A rota de confirmação, depois do `ConfirmSignUp`. Sem trigger de post confirmation. |
| Q41 | Usuário órfão no Cognito | As duas limpezas: o stream pega o `REMOVE` do TTL (`userIdentity` = `dynamodb.amazonaws.com`) e chama `AdminDeleteUser` (fase 3); e a rota de sign-up, ao receber `UsernameExistsException` sem `EMAIL#` nosso, apaga o usuário `UNCONFIRMED` e tenta de novo (fase 1). O Dynamo decide, o Cognito obedece. |
| Q42 | O que o Cognito guarda | Só e-mail, senha e `custom:internalId` (imutável). Perfil no Account. `WriteAttributes` explícito em todo app client. **Revisto na 1.4.c**: o `custom:internalId` precisa estar no `WriteAttributes`, porque o `SignUp` só grava um atributo que o client pode escrever (`cognito-role-in-custom-attribute`). A proteção vem de duas coisas: o atributo é imutável (ninguém o altera depois de criado) e o client tem secret (ninguém chama o `SignUp` por fora da API, Q127). |
| Q43 | Forma do papel | Um valor por usuário (`student`, `instructor`, `admin`). Um módulo de permissões mapeia papel → ações e os handlers perguntam pela ação. O admin herda as ações do instrutor. **Fica aberto para evoluir**: haverá um painel de administradores no mesmo front, então o mapa papel → ações deve poder sair do código para dados sem mudar os handlers. |
| Q44 | Troca de papel | Só admin, `PUT /admin/users/{id}/role`. Ninguém muda o próprio papel; o último admin não pode ser rebaixado; conta `PENDING` é recusada; linha de auditoria (quem, quando, de/para). O primeiro admin vem do script da Q21, que grava `role = admin` no Account. |
| Q45 | Instrutor rebaixado | Os cursos dele ficam como estão (publicados no catálogo, matrículas mantidas); ele perde a edição; o admin pode arquivar. Nada é apagado ou transferido. |
| Q46 | Entidades do ERD | Account, Course, Module, Lesson, Enrollment, LessonProgress, Review, RoleChange (auditoria da Q44), CourseCover (fase 4), StudentExport (CSV da fase 4). `EMAIL#` e itens de idempotência são físicos, fora do ERD. |
| Q48 | O que é uma aula | Título, corpo em Markdown com limite (por exemplo 32 KB), duração em minutos e posição. Vídeo: ver a rodada em aberto. |
| Q50 | Capa do curso | Uma capa atual (0..1). Trocar substitui a anterior e apaga do S3 o original e as variantes da capa antiga. |
| Q52 | Curso arquivado | Não aceita matrículas novas; quem já está matriculado continua assistindo, marcando progresso e pode avaliar. Some do catálogo e da busca (Q10). |
| Q47 | Dono da avaliação | O par aluno + curso, não a matrícula. Uma por par, para sempre; só quem tem matrícula ativa cria ou edita. |
| Q49 | Rematrícula (revoga parte da Q23) | Cancelamento lógico: matrícula `ACTIVE` ou `CANCELLED`, progresso guardado. Cancelar marca `CANCELLED` e decrementa o contador; rematricular volta a `ACTIVE`, incrementa e continua de onde parou. Listas de matrículas e de alunos mostram só ativas, por índice esparso. |
| Q54 | Cursos em vídeo | O vídeo sai do opcional e vira a fase 5: upload multipart pelo instrutor, reprodução privada por URL pré-assinada do MP4. A aula tem vídeo opcional; o Markdown vira a descrição. HLS e URL assinada do CloudFront ficam como evolução e como skill que falta. |
| Q55 | Retomar a aula | A matrícula guarda a última aula aberta e a posição em segundos, gravadas a cada 15 a 30 s. Sem histórico. |
| Q56 | Status da conta | `PENDING`, `ACTIVE`, `DISABLED` (admin desativa; o usuário do Cognito é desativado junto; dados mantidos). Exclusão pelo próprio usuário com anonimização (LGPD) fica como evolução, com o status `DELETED`. |
| Q53 | Arquivos (substitui `COURSE_COVER` na Q46) | Entidade `FILE` com `ownerType` (conta, curso, aula), `ownerId`, `purpose` (`avatar`, `cover`, `attachment`, `video`), `status` (`PENDING`, `UPLOADED`, `PROCESSED`, `FAILED`), `originalKey`, `variants`, `contentType`, `size`, `position`, `createdAt`. Avatar e capa: 1 atual, públicos, variantes webp com sharp, presigned POST. Attachment: vários com ordem, só matriculados, presigned POST. Vídeo: 1 por aula, só matriculados, multipart. Tipos e tamanhos por finalidade num mapa no código. Trocar avatar ou capa apaga os arquivos antigos. |
| Q57 | Material da aula | Sai do opcional e entra na fase 4 (mesmo pipeline). Download por URL pré-assinada depois de verificar a matrícula. |
| Q58 | Acesso a arquivos | Só matrícula `ACTIVE` baixa material e assiste vídeo. Em curso arquivado, os ativos continuam com acesso. Nenhum arquivo é apagado por cancelamento ou arquivamento. |
| Q59 | Versões de curso | **Sem versionamento.** O curso é um só e todos os alunos, antigos e novos, veem o conteúdo atual. Reestruturar substitui o conteúdo para todos; a Q24 continua valendo (publicado pode ganhar aulas, não perder). Se um dia fizer falta guardar versões antigas, as chaves podem reservar esse nível (decidir no quadro de entidades). |
| Q65–Q68 | Padrões de acesso revisados | Lista em `docs/data-model.md`, seção 2. Catálogo no Dynamo só por mais recentes; outras ordens no Algolia. Admin busca usuário por e-mail exato e lista por papel e status. Padrões 8b e 16 marcados como críticos. |
| Q69 | Entrega de arquivos | Avatar e capa (variantes webp) pelo CloudFront com OAC; nome da variante com hash do conteúdo, cache `immutable`, sem invalidação. Material e vídeo por URL pré-assinada do S3. CloudFront com URL assinada fica como evolução (skill que falta). Fase 4. |
| Q70 | Buckets | Dois: `public-assets` (só o CloudFront lê, via OAC) e `private-files` (só URL pré-assinada). Originais no privado; só as variantes processadas vão para o público. |
| Q78 | E-mail na Account (refina a Q18) | O e-mail é atributo da Account e tem padrão próprio de busca (login, admin): `GSI2PK = EMAIL#<email>` na Account, uma partição por e-mail, uma leitura. A unicidade continua garantida por um item de reserva cuja chave é o e-mail, mas ele não é entidade: só o `AccountRepository` o grava e move, na mesma transação da Account. Índice nunca é único (`dynamodb-index-overloading`). |
| Q71 | Reordenar e escritas compostas | Posição em atributo, não na chave; SK hierárquica `MODULE#m#LESSON#l`. **Toda escrita que toca mais de um item é uma transação**: mover aula de módulo (delete + put), reordenar vários itens, contadores. |
| Q72 | Sumário e conteúdo da aula | Sumário (título, duração, posição) na partição do curso; conteúdo em `LESSON#l` / `CONTENT`, com vídeo e materiais na mesma partição. Novo padrão 22: abrir aula. |
| Q73 | Matrícula e avaliação | Na coleção do aluno (`ACCOUNT#a`), com chaves invertidas no `GSI1` para o lado do curso (`dynamodb-many-to-many-relationships`). |
| Q74 | Minhas matrículas (ajusta a Q49) | Query na coleção do aluno com filtro de ativas; índice esparso só para alunos do curso. |
| Q75 | Catálogo | Uma partição `CATALOG` no `GSI2`. Dividir em `CATALOG#0..n` fica como evolução (candidata da fase 7). |
| Q76 | Lista de usuários | Sempre por papel (abas); status por `FilterExpression`. |
| Q77 | Chave no S3 | `<ownerType>/<ownerId>/<purpose>/<fileId>/original`, montada só pelo servidor; o trigger deriva a PK/SK do `FILE` dela. |
| Q79 | Projeção dos índices | `ALL` no `GSI1` e no `GSI2` (índices genéricos, compartilhados). |
| Q80 | Minhas matrículas | Query nas matrículas + `BatchGet` dos cursos. Título, capa e total de aulas ficam como referência, não como cópia. |
| Q81 | Nome do aluno | `studentName` copiado na matrícula e na avaliação. Renomear atualiza as cópias na mesma requisição, em transações de até 100 itens (todas na partição `ACCOUNT#a`). |
| Q82 | Dados do catálogo no curso | `instructorName` (propagado como na Q81, pelos cursos do instrutor no `GSI1`), `coverVariants` (gravado pelo processador de imagem), `ratingSum` e `ratingCount`. Algolia recebe pelo stream. |
| Q83 | Contadores | `Course.enrollmentCount`, `Course.lessonCount`, `Course.ratingSum`/`ratingCount`, `Enrollment.completedLessons`: sempre `ADD` na mesma transação da escrita que os muda; refazer quando a transação é cancelada por conflito. Percentual e média só na leitura. Nenhum contador depende do stream. |
| Q84 | Retratos | Nota e comentário da avaliação, `fromRole`/`toRole`, `enrolledAt`, arquivo de exportação: nunca acompanham o original. Cada atributo copiado é classificado no modelo (exibição, retrato, contador, índice, referência) com seu dono. |
| Q85 | Avatar e capa copiados no dono | A Account ganha `avatar: { fileId, variants }` e o Course `cover: { fileId, variants }` (substitui o `coverVariants` da Q82). O mapa guarda chaves do S3, não URLs; o controller monta a URL com o domínio da CDN. O processador grava a cópia na mesma transação que marca o `FILE` como `PROCESSED`; trocar apaga o `FILE` antigo, com condição "o `fileId` atual ainda é o antigo". |
| Q86 | Operações com mais de 100 itens | Duas etapas: uma transação marca o estado (curso `DELETING`, rota responde 202, some das listas) e um job idempotente termina em lotes, com exclusões condicionais e os objetos do S3. Vale para qualquer operação futura que passe do limite de 100 ações. |
| Q87 | Unidade de trabalho e Saga | `UnitOfWork` nova a cada execução, por fábrica injetada; `commit()` envia `TransactWriteCommand`, refaz em conflito e traduz `CancellationReasons` em erros de domínio. **O `Saga` fica**, corrigido do mesmo jeito (uma instância por execução, sem estado entre invocações), e é usado na compensação do sign-up (Q39). Operações da unidade (`Put`, `Update`, `Delete`, `ConditionCheck`) e permissões IAM **são liberadas conforme o uso**, tarefa a tarefa. |
| Q88 | Consistência de leitura | Eventual por padrão. `ConsistentRead` só em: trigger de pre token lendo o papel; rota de admin lendo o papel do chamador; checagem de matrícula antes de entregar material ou vídeo. Regras de escrita ficam em condições de transação. Escritas respondem com o que gravaram ou `ReturnValues: 'ALL_NEW'`. |
| Q89 | Paginação | Cursor opaco `base64url`, validado por schema da lista (chaves, partição, prefixo); inválido → 400. Resposta `{ items, nextCursor }`. Página padrão 20, máxima 100, lendo `Limit + 1`. |
| Q90 | Topologia do stream (revisa a Q27) | Stream `NEW_AND_OLD_IMAGES` com dois consumidores filtrados: indexador do Algolia (`Course`) e limpeza do Cognito (`REMOVE` do TTL em `Account`). `maximumRetryAttempts: 2`, `bisectBatchOnFunctionError`, fila SQS de falhas com alarme e redrive; replay lê o estado atual pela chave. SQS nos jobs: imagem (S3 → SQS), CSV (202), exclusão de curso (Q86). Terceiro consumidor exige um roteador que distribui para filas. *Revista pela Q296 (falhas do stream: não há redrive, a recuperação é pelo estado atual) e pela Q302 (um leitor só, um roteador para filas).* |
| Q91 | Registro no Algolia | Só publicados, `objectID = courseId`; título, descrição, `instructorName`, chave da capa, `enrollmentCount`, `ratingAverage` (calculado na indexação), `ratingCount`, `publishedAt`. Sair de `PUBLISHED` ou ser apagado remove. Reindexação por script lendo o catálogo no `GSI2`. Nota para o painel de admin: cursos não publicados iriam para um segundo índice com todos os status, alimentado pelo mesmo consumidor e consultado só por uma rota de admin no servidor (`algolia-search-api`), sem expor chave. |
| Q92 | Stages e proteção | `dev` e `prod`, mesma conta e região, recursos separados. `prod`: proteção contra exclusão na tabela e no pool, PITR, `DeletionPolicy: Retain` nos buckets. `dev`: destrutível. Alarmes nas filas de falha e dos jobs. |
| Q93 | Rotas | Auth: `POST /auth/sign-up`, `/confirm`, `/resend-code`, `/sign-in`, `/refresh`, `/forgot-password`, `/reset-password`. Conta: `GET`/`PATCH /me`, `POST /me/avatar`. Catálogo (público): `GET /courses`, `/courses/{id}`, `/courses/{id}/reviews`, `/search`. Instrutor: `GET /instructor/courses`, `POST /courses`, `PATCH /courses/{id}`, `POST /courses/{id}/publish`, `/archive`, `DELETE /courses/{id}`, CRUD de módulos e aulas, `PUT /courses/{id}/outline`, `POST /courses/{id}/cover`, `POST /lessons/{lid}/attachments`, `GET /courses/{id}/students`, `POST`/`GET /courses/{id}/exports`, `GET /exports/{id}`. Aluno: `PUT`/`DELETE /courses/{id}/enrollment`, `GET /me/enrollments`, `GET /courses/{id}/progress`, `PUT /courses/{id}/progress/position`, `POST /courses/{id}/lessons/{lid}/complete`, `GET /courses/{id}/lessons/{lid}`, `GET /lessons/{lid}/files/{fid}`, `PUT /courses/{id}/review`. Admin: `GET /admin/users`, `/admin/users/by-email`, `PUT /admin/users/{id}/role`, `POST /admin/users/{id}/disable`, `/enable`, `GET /admin/users/{id}/role-changes`. Fase 5: multipart do vídeo. Arquivar é uma rota só (dono, ou `courses:archive-any`). |
| Q94 | Permissão na rota | O controller declara a ação exigida (`Controller<'private', Body, Permissão>`); o adapter verifica antes de validar o corpo (403 sem dizer o papel); a posse fica no use case; teste de auditoria das rotas de `/admin`. Constantes conforme a Q98. |
| Q95 | 404 ou 403 | 404 quando o chamador não poderia ver o recurso (rascunho alheio); 403 quando o recurso é visível (curso publicado). |
| Q96 | Formato de erro | `{ error: { code, message, details? } }`; `details` só em validação (campos do Zod). Erros de transação viram códigos próprios (`EMAIL_IN_USE`, `ALREADY_COMPLETED`, `COURSE_NOT_PUBLISHED`). Nenhuma mensagem do AWS SDK chega ao cliente. |
| Q97 | Funções e permissões | Uma Lambda por rota (handler de seis linhas do foodiary), uma role IAM por função, permissões e variáveis de ambiente só do que a função usa, liberadas por tarefa. |
| Q98 | Constantes em vez de `enum` | Permissões, papéis e todos os valores fechados (status de conta, curso, matrícula e arquivo; finalidade do arquivo) como objeto `as const` com o tipo derivado (`(typeof x)[keyof typeof x]`). O mapa papel → permissões usa `satisfies Record<Role, readonly Permission[]>`. Nada de `enum` do TypeScript (`typescript-enums-and-alternatives`). |
| Q99 | Registro de achados | Anotado na sub-imp na hora e, no commit que fecha a tarefa, em `docs/skill-findings.md`, agrupado por skill: data, tarefa, tipo (`erro`, `lacuna`, `ambíguo`, `acerto`), o que a skill diz, o que aconteceu, sugestão. Seção final com as skills que faltam. |
| Q100 | Critério de pronto | História: deploy em `dev`; testes unitários e de integração verdes; rota chamada com token real (feliz e um erro); skills usadas e achados preenchidos (mesmo "nenhum"); `docs/data-model.md` atualizado se chave ou item mudou; commits pequenos com push. Fase: todas as histórias prontas e cobertura das skills conferida pelas labels. |
| Q101 | Evolução de schema (fase 7) | Dividir o catálogo em `CATALOG#0..n`, reescrevendo o `GSI2PK` dos cursos publicados com o sistema no ar. Reserva: `slug` único com item de reserva e preenchimento. |
| Q102 | Repositórios | **Separados**: API e `web` em repositórios próprios, para o deploy de cada um não depender do outro. Onde fica o código da API: ver a rodada em aberto. |
| Q103 | Versões fixadas | Node 24 (`.nvmrc`, `engines`, runtime `nodejs24.x` arm64); pnpm 12 (`packageManager`); Serverless Framework 4.43 (`frameworkVersion`); dependências com versão exata (`save-exact`). |
| Q104 | TypeScript | **Fica no 6** (6.0.3). Teste da 1.0.c em 2026-10-15: com o 6, esbuild + `esbuild-plugin-tsc` 0.6.0 emitiram `design:paramtypes` (`["Clock","String"]`); com o 7.0.2, o `tsc` checa o projeto, mas o pacote `typescript` não tem mais a API de JavaScript (só `version` e o caminho do executável), e o plugin quebra em `typescript.sys.fileExists`. Rever quando o 7 tiver API ou o plugin suportá-lo. |
| Q105 | Lint e formatação | ESLint flat com `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`; Prettier sozinho como formatador, `eslint-config-prettier` para desligar conflitos (sai o `eslint-plugin-prettier`); ordenação de imports; `no-restricted-imports` por camada (`application` não importa `infra`). |
| Q106 | Fluxo de git | Branch por história (`feat/1.2-create-course`), PR para a `main`, merge sem squash. Commits de planejamento (`docs:`) podem ir direto na `main`. |
| Q107 | Documentação | `CLAUDE.md` curto na raiz só com regras de trabalho e onde está cada documento; conhecimento em `docs/`; nenhum `CLAUDE.md` por pasta. |
| Q108 | Código da API e planejamento | Este repositório é a API, com o código na raiz e `docs/` mantido; renomeado para `coursary-api`. O `web` nasce na fase 6 como `coursary-web` e aponta para o planejamento daqui. |
| Q109 | `tsconfig` | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`; `target: es2025` e `lib: ["es2025"]` (o ano que o Node 24 implementa inteiro, conforme `typescript-project-setup`; ajustado na 1.0.b); `module: preserve` + `moduleResolution: bundler`; `rootDir`, `noEmit`, aliases do foodiary; `experimentalDecorators` + `emitDecoratorMetadata`. Sem `exactOptionalPropertyTypes`. |
| Q110 | Commits e hooks | commitlint com `config-conventional`, mensagens em inglês, escopos opcionais e livres. lefthook: commitlint no `commit-msg`; Prettier e ESLint nos arquivos alterados no `pre-commit`. Typecheck e testes só no CI. |
| Q111 | CI | GitHub Actions em PR e push na `main`: `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test` (DynamoDB Local como serviço), `sls package` de `dev`. Deploy manual da máquina local por enquanto. |
| Q113 | Formato de módulo | ES modules (`"type": "module"`). O risco de dependência CommonJS embutida num bundle ESM fica coberto pela chamada real em `dev` (Q100). |
| Q114 | Org do Serverless | `org: worldiary`, criada em 2026-10-15 (a sessão da org anterior passou a responder `Forbidden`). |
| Q115 | `sls package` no CI | Fica no CI. Ele exige credencial real da AWS (resolve a conta pelo STS) além da `SERVERLESS_ACCESS_KEY`. A AWS vem de uma role sem nenhuma permissão, assumida por OIDC só por workflows deste repositório (`aws/bootstrap.yml`, stack `coursary-api-bootstrap`); o ARN fica no segredo `AWS_CI_ROLE_ARN`. A mesma role ganha permissões se um dia o deploy for pelo CI. |
| Q116 | Stage `prod` | Declarado no código (proteção e PITR), mas não deployado até a fase 6 ou decisão do o autor: com o `foodiary-api-dev`, seria a terceira instância do Serverless, e paga. |
| Q117 | Quando deployar | Depois da revisão dos commits e com o ok do o autor, antes do push; o resultado entra no último commit. Perfil da AWS: `coursary` (Q118). |
| Q118 | Perfil da AWS do projeto | Role `coursary-api-deployer` (em `aws/bootstrap.yml`), assumida a partir do usuário administrador da conta pelo perfil `coursary` (`role_arn` + `source_profile`); `.env` com `AWS_PROFILE=coursary`. Permissões só em `coursary-api-*` (amplitude na Q122). O usuário administrador só aplica o bootstrap. Nenhuma skill cobre permissão mínima de deploy do Serverless: skill que falta. |
| Q119 | Resposta da health | `GET /health` pública, `200 { "status": "ok" }`, sem tocar na tabela. Checagem de dependências seria outra rota (`/health/deep`). |
| Q120 | Role por função | A health fica com a role padrão do Serverless (só logs). A role por função (Q97) entra na 1.3, com a primeira função que precisa de permissão. |
| Q121 | Roles criadas pelo deploy | **Permissions boundary** `coursary-api-boundary`: teto de toda role do projeto (logs e tabelas `coursary-api-*`, crescendo por história). A deployer só cria e altera roles `coursary-api-*` que tenham esse boundary, só passa roles para o Lambda, não pode remover boundary e não toca nas próprias roles (`deployer`, `ci`). Serverless: `provider.iam.role.permissionsBoundary`. |
| Q122 | Amplitude da role de deploy (revisa Q118) | Uma política só, `deploy-broad`, com os serviços do plano até a fase 6 (CloudFormation, DynamoDB, Lambda, logs, API Gateway, Cognito, S3, SQS, SNS, CloudWatch, SSM, CloudFront, ACM, leitura de SES), restrita a `coursary-api-*` onde o serviço filtra por nome. Pool do Cognito, CloudFront e ACM não filtram por nome. O boundary (Q121) acompanha. Quando o projeto estiver sólido, o bootstrap volta a ter só o que se sabe que é usado. |
| Q123 | Metadados nos testes | Confirmar com um teste do container que o Vitest 5 emite `design:paramtypes` sem plugin (como registra a `typescript-decorators-metadata`); se não emitir, plugin SWC e achado. Testes de use case não usam o container: fakes pelo construtor. |
| Q124 | Corpo e resposta do sign-up | `{ name, email, password }` → `201 { accountId }`, sem tokens (Q35). E-mail repetido → `409 EMAIL_IN_USE`. |
| Q125 | Política de senha | Mínimo de 8, com minúscula e número, igual no pool e no schema do Zod. |
| Q126 | E-mail de confirmação até a 1.7 | `COGNITO_DEFAULT`; o SES com o trigger de custom message entra na história de recuperação de senha (Q37). |
| Q127 | App client com secret | Sim: sem secret, qualquer um chama o `SignUp` direto no Cognito, por fora da API, e cria órfãos (Q38). O secret fica só nas funções que falam com o Cognito (Q97). |
| Q128 | Estilo dos tipos e dos itens | Tipos em namespaces só com tipos, como no foodiary (`Account.Role`, `AccountItem.ItemType`, `Controller.Response`); constantes `as const` no módulo; `no-namespace` desligada. `*Item` como classe no padrão do foodiary. Brands de id só quando houver dois tipos de id (1.13), já como `Account.Id`/`Course.Id`. |
| Q129 | Secret do client nas funções | `!GetAtt UserPoolClient.ClientSecret` na variável da função que precisa (como no foodiary; confirmado numa conta real pela skill, mas fora da página de referência). Se a AWS mudar o atributo, trocar para Secrets Manager com referência dinâmica. |
| Q130 | Usuário confirmado no Cognito e reserva livre | `409 EMAIL_IN_USE`, compensação apaga a reserva recém-criada, log de inconsistência. Nunca apagar automaticamente um usuário confirmado. |
| Q131 | Branches e deploy | `develop` e `main` protegidas por ruleset do GitHub (PR obrigatório, check `check` verde, sem push direto, sem force-push, sem apagar, só merge commit); repositório público para ter rulesets no plano gratuito. Features abrem PR para `develop`; `develop` abre PR para `main`. O merge na `develop` deploya o stage `dev` pelo CI (a deployer confia no OIDC só de `refs/heads/develop`). Sem deploy de `prod` por CI ainda. Revê a Q106 (PR ia para a `main`) e a Q117 (o merge na `develop` é o ok do deploy). Hook local recusa commit em `main` e `develop`. |
| Q132 | Revisão da 1.4 antes do merge | Corrigidos: a reserva vencida e ainda não apagada pelo TTL é tomada pelo novo cadastro (`attribute_not_exists(PK) OR expiresAt < :now`, Q39); um segundo `AuthUserExists` depois da limpeza do órfão vira `409 EMAIL_IN_USE`; o e-mail é aparado antes de validar; o log `CompensationFailed` traz a etapa e o `accountId`. Ficam como estão: a remoção da conta cancelada quando a reserva já sumiu (a conta tem TTL) e o usuário criado por um `SignUp` que falhou depois (a Q41 o limpa na próxima tentativa). |
| Q133 | Adiados da revisão da 1.4 | `isBase64Encoded` no parser do corpo, só se aparecer nas chamadas reais em `dev`; `getKey()` nos `*Item` quando surgir a terceira cópia da chave (1.5, Q112). |
| Q134 | Renovação de tokens | O client gira o refresh token (1.4.c), então a 1.6 renova com `GetTokensFromRefreshToken` (com o secret em `ClientSecret`), não com `InitiateAuth` `REFRESH_TOKEN_AUTH`; o client lista só `ALLOW_USER_PASSWORD_AUTH`. |
| Q135 | CommonJS no bundle ESM (revê a Q113) | O risco da Q113 se confirmou na primeira chamada real (`ksuid` → `Dynamic require of "crypto"`). O `esbuild.config.js` leva o banner com `createRequire`. Conferência de bundle: `sls package`, zip descompactado fora do projeto, handler importado de um `.mjs` num processo `node` separado (o Vitest esconde a falha). |
| Q136 | Corpo em base64 (fecha a Q133 nesse ponto) | Em `dev`, um `POST` sem `content-type` respondeu `400 BAD_REQUEST`: o API Gateway entrega o corpo em base64. O `lambdaBodyParser` decodifica quando `isBase64Encoded`. O `getKey()` dos `*Item` segue na Q133. |
| Q137 | Conta pelo e-mail na 1.5 | Pela reserva: `Get` em `EMAIL_CLAIM#<email>` dá o `accountId`, depois `Get` na conta. Sem `GSI2` antes da 1.6 (Q112); o Cognito não é consultado para isso. |
| Q138 | Confirmação sem conta válida | Sem conta `PENDING` viva (inexistente ou vencida, Q39), a confirmação responde o mesmo `400 INVALID_CODE` sem chamar o Cognito: nenhum órfão é confirmado e nada revela o estado do e-mail. |
| Q139 | Ordem da confirmação e reparo | (1) Ler a conta; (2) `ConfirmSignUp`; (3) transação: conta `ACTIVE` sem `expiresAt`, reserva sem `expiresAt`. Se (3) falhou antes, a nova tentativa recebe `NotAuthorizedException`; com a conta ainda `PENDING`, a rota consulta `AdminGetUser` e, se `CONFIRMED`, refaz (3), loga a inconsistência e responde 204. A limpeza da Q41 (fase 3) só apaga usuário ainda `UNCONFIRMED` (Q130). |
| Q140 | Reenvio do código | Sempre `204`. Sem conta `PENDING` viva, nem chama o Cognito (cota do `COGNITO_DEFAULT`, sem código para órfão). Com conta, `ResendConfirmationCode`; `UserNotFound`, `InvalidParameter` e já confirmado também viram 204; limites viram 429. |
| Q141 | Rotas e erros da 1.5 | `POST /auth/confirm` `{ email, code }` → 204; `POST /auth/resend-code` `{ email }` → 204. `CodeMismatch`, `ExpiredCode`, `UserNotFound` e `NotAuthorized` sem reparo → um só `400 INVALID_CODE`; `LimitExceeded`, `TooManyRequests`, `TooManyFailedAttempts` → 429. Código validado como texto `/^\S{1,2048}$/`. |
| Q142 | Leitura na confirmação e no reenvio | `ConsistentRead: true` nos `Get` da reserva e da conta: a leitura vem segundos depois do sign-up, e um 400 falso seria difícil de reproduzir. |
| Q143 | Sub-imp e teste da 1.5 | 1.5.a entidade e repositório; 1.5.b `AuthGateway`; 1.5.c `ConfirmSignUpUseCase` com reparo; 1.5.d `ResendConfirmationCodeUseCase`; 1.5.e controllers, funções com role própria, Yaak e chamadas reais. O caminho feliz em `dev` usa um endereço de teste do autor (fora do repositório, que é público). |
| Q144 | `GSI2` fora da 1.6 | Nem o sign-in nem o trigger buscam por e-mail (o trigger lê o `custom:internalId`; a confirmação usa a reserva, Q137). O `GSI2` nasce com a primeira leitura que precisar dele (busca do admin ou catálogo), pela Q112. |
| Q145 | Trigger de pre token | Versão 2 (`LambdaVersion: V2_0`) com `UserPoolTier: ESSENTIALS` declarado. Lê a conta pelo `custom:internalId` com `ConsistentRead` (Q88) e põe `internalId` e `role` no access token; o id token fica como está. Role do trigger: só `dynamodb:GetItem`. Roda no sign-in e em cada refresh. |
| Q146 | Trigger sem conta utilizável | Conta inexistente ou não `ACTIVE` (como `DISABLED`): o trigger lança erro, o Cognito não emite tokens (`UserLambdaValidationException`), a rota responde `403 ACCOUNT_UNAVAILABLE` e loga. Um `DISABLED` vale em no máximo 1 h. |
| Q147 | Sign-in | `POST /auth/sign-in` `{ email, password }` → `200 { accessToken, refreshToken, expiresIn }`, sem id token. Senha validada só como não vazia (até 256). `NotAuthorized` e `PasswordResetRequired` → `401 INVALID_CREDENTIALS`; `UserNotConfirmed` → `403 EMAIL_NOT_CONFIRMED`; desafio → log e 500; limites → 429. |
| Q148 | Refresh | `POST /auth/refresh` `{ refreshToken }` → `GetTokensFromRefreshToken` com o `ClientSecret` → `200 { accessToken, refreshToken, expiresIn }` (o novo substitui o antigo). `NotAuthorized`, `RefreshTokenReuse`, `UserNotFound` → `401 INVALID_SESSION`; conta indisponível → 403. Token validado só pelo formato. |
| Q149 | Entrega dos tokens | No corpo por enquanto. Cookie `HttpOnly` para o refresh token fica para a fase 5, com o domínio próprio, sabendo que muda o contrato das duas rotas. |
| Q150 | Sign-out | Fora da 1.6 (Q112); `POST /auth/sign-out` com `RevokeToken` entra quando o front precisar (fase 5). Com a rotação, um refresh token roubado morre no próximo refresh do dono. |
| Q151 | Um zip por função | `package.individually: true`: cada Lambda recebe só o próprio bundle (antes, um zip de 665 KB com todos os handlers ia para todas). |
| Q152 | Fim do Registry (revê o `kernel/` trazido do foodiary) | Os testes nunca usaram o container (Q123), e ele fazia todo handler carregar todas as implementações (`main/bindings`), além de exigir `esbuild-plugin-tsc` e metadados de decorator. Troca por fábricas à mão em `src/main/factories/` (`makeAppConfig`, `makeAccountRepository`, `makeAuthGateway`, `make<UseCase>`, `make<Controller>`), cada uma importando só o que usa; o handler é `lambdaHttpAdapter(makeXController())`. Instâncias criadas uma vez por cold start; estado de execução (`Saga`) segue com `new` por chamada (Q87). |
| Q153 | Sem decorators | O schema vira propriedade do controller (`protected readonly schema`); saem `@Schema`, `@Injectable`, `reflect-metadata`, `experimentalDecorators`, `emitDecoratorMetadata` e `esbuild-plugin-tsc`; `keepNames` sai se nada depender dele. O build volta a ser o esbuild do Serverless. |
| Q154 | Portas como `interface` | `AccountRepository` e `AuthGateway` deixam de ser classes abstratas (eram tokens do container); implementações e fakes usam `implements`. |
| Q155 | Conferência automática dos bundles | `pnpm check:bundles`: `sls package` e import de cada handler num `node` separado (método da Q135), no CI antes do deploy. |
| Q156 | Peso do zod | Medido em `dev`: `health` ~100 ms de init, trigger sem zod ~290 ms, rotas HTTP ~230 a 340 ms. O peso é o SDK; o zod soma ~30 a 50 ms. Fica como está. |
| Q157 | Domínio da API e remetente (revê a linha "não trazer o domínio pessoal" do foodiary) | Domínio próprio já, antes da 1.7, em `sls/resources/api-gateway/CustomDomain.yml` como no foodiary: certificado ACM validado por DNS, `DomainName`, `ApiMapping` e, diferente do foodiary, o registro `A` alias no Route 53 pelo template. `dev`: `api-dev.coursary.joaodevdude.com`; `prod`: `api.coursary.joaodevdude.com`. E-mails: `no-reply@coursary.joaodevdude.com` pela identidade `joaodevdude.com` do SES, sem Reply-To. |
| Q158 | Valores por stage | Secrets de um Environment do GitHub por stage (`dev` agora): `COGNITO_EMAILS_FROM`, `SES_ARN`, `API_DOMAIN_NAME`, `ROUTE53_HOSTED_ZONE_ID`, `DISABLE_DEFAULT_APIGW_ENDPOINT`. Template com as condições `${env:…, ''}` do foodiary: sem os valores (CI de PR, `sls package` local) nada do domínio é criado. Como o job com `environment: dev` apresenta `sub = …:environment:dev` no OIDC, a role de deploy passa a confiar nesse `sub`, e o Environment `dev` só aceita a branch `develop`. |
| Q159 | Endpoint padrão do API Gateway | Desligado em `dev` e `prod`, mas só num segundo deploy, depois de conferir o domínio. |
| Q160 | Ordem | PR do domínio primeiro (bootstrap, aplicado pelo autor com o perfil administrador; `CustomDomain.yml`; CI; Yaak), conferido em `dev`; depois a 1.7. |
| Q161 | E-mails da 1.7 | Pool com `EmailSendingAccount: DEVELOPER` (todo e-mail sai do SES; fim do `COGNITO_DEFAULT` da Q126). Trigger de custom message com React Email renderizado no trigger, como no foodiary (revê a Q17 só por haver exemplo, não skill): templates da confirmação/reenvio e da recuperação de senha, em português, só o código, sem nome e sem link. Os outros `triggerSource` ficam com o texto padrão. Duração do trigger medida em `dev` (limite de 5 s do Cognito). |
| Q162 | Recuperação de senha | `POST /auth/forgot-password` `{ email }` → 204 sempre; só chama o `ForgotPassword` com conta `ACTIVE` (reserva e conta, leitura forte), o resto é logado. `POST /auth/reset-password` `{ email, code, newPassword }` → 204; política da Q125; código e estados → `400 INVALID_CODE`; depois, `AdminUserGlobalSignOut` (falha logada como `SessionsNotRevoked`, sem falhar a rota). |
| Q163 | Authorizer | `provider.httpApi.authorizers.cognito` (emissor do pool, `audience` com o client da API); toda rota privada exige o escopo `aws.cognito.signin.user.admin`, que recusa o id token (403). |
| Q164 | Quem chama | O adapter das rotas privadas lê `internalId` das claims (Q32) e entrega `accountId` ao `Controller<'private'>`, sem ler o banco; sem a claim, `401 INVALID_SESSION`. |
| Q165 | Token de conta indisponível | As rotas de `/me` já leem a conta: `DISABLED` ou inexistente → `403 ACCOUNT_UNAVAILABLE`, sem esperar o token expirar. |
| Q166 | `GET /me` | `200 { id, name, email, role, createdAt }`, leitura eventual (Q88). `avatar` entra com o upload (Q85, Q112); `status` fica de fora. |
| Q167 | `PATCH /me` | Só `name` (validação do sign-up), `200` com o perfil de `ReturnValues: 'ALL_NEW'` (Q88). Troca de e-mail fica como evolução; papel só pelo admin (Q44). A propagação do nome para as cópias entra com as cópias (1.13, fase 2). |
| Q168 | Adapter das rotas privadas | Como no foodiary: um `lambdaHttpAdapter` só, que lê o `authorizer` do evento (`accountId` `null` nas públicas, `string` nas privadas); com `authorizer` e sem a claim `internalId`, `401 INVALID_SESSION`. `params` e `queryParams` entram com a primeira rota que os usar (Q112). Sub-imp da 1.8: authorizer e adapter; `updateName`; `GetMe` e `UpdateMe`; rotas, roles e Yaak; chamadas reais. |
| Q169 | Authorizer nas rotas (revê a Q163) | `CognitoAuthorizer` no provider e `authorizer: CognitoAuthorizer` na rota, sem escopo. O API Gateway aceita o id token, mas ele não tem a claim `internalId` (só o access token recebe, Q145), então o adapter o recusa com `401 INVALID_SESSION` (Q164). *Revista pela Q301: as rotas privadas voltam a exigir o escopo, e o id token para no API Gateway com 403.* |
| Q170 | Role compartilhada (revê a Q97) | Uma role no provider com as permissões de todas as rotas em `sls/config/role.yml` (tabela: `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`; pool: `AdminGetUser`, `AdminDeleteUser`, `AdminUserGlobalSignOut`, que saiu na Q212; `BatchGetItem` e `ConditionCheckItem` entraram depois), com o boundary. Os dois triggers do pool têm role própria (`preTokenGeneration` com `GetItem`, `customMessage` só com logs): na role compartilhada, que cita o pool, formariam ciclo pool → trigger → role → pool. |
| Q171 | Módulo de permissões | Sai da 1.9 e entra na 1.10, com a primeira rota que pergunta por uma ação (Q112). A 1.9 entrega só o primeiro admin. |
| Q172 | Script do primeiro admin | Lambda interna `promoteAdmin`, sem rota HTTP, chamada por `sls invoke -f promoteAdmin --stage <stage> --data '{"email": "…"}'`; reaproveita repositório, entidade e chaves, e a 1.10 reaproveita a mesma operação. |
| Q173 | O que a promoção grava | Numa transação: a conta com `role = admin` e `GSI1PK = ROLE#admin`, só se `ACTIVE`; e um `RoleChange` (`ACCOUNT#a` / `ROLE_CHANGE#<id>`) com de/para, quando e `changedBy = bootstrap`. Já admin: nada é gravado. |
| Q174 | Primeiro admin de `dev` | A conta de teste do autor; o papel chega ao token no próximo sign-in ou refresh (até 1 h, Q20). Comando no README para a `prod`. |
| Q175 | Estilo do código | Tudo o que é construído vai para uma `const` antes de ser passado (entidades, itens, comandos do SDK, resultados de `await`, o controller do handler). Auxiliares são métodos estáticos da classe que servem, não funções soltas ao lado dela. Regra da entidade fica na entidade: `Account.requireActive(account \| null)` e `Account.normalizeEmail`. `AccountProfile` é classe com `fromAccount` (namespaces só com tipos, Q128). |
| Q176 | Variáveis num arquivo só (revê a Q97 nas variáveis; revista pela Q325) | `provider.environment: ${file(./sls/config/env.yml)}` com `MAIN_TABLE_NAME`, `COGNITO_POOL_ID`, `COGNITO_CLIENT_ID` e `COGNITO_CLIENT_SECRET` para todas as funções. Para não fechar o ciclo pool → trigger → pool, o pool aponta para os triggers por ARN montado com o nome da função (`!Sub …:function:coursary-api-${sls:stage}-<trigger>`). Provado num stage descartável criado do zero (`envtest`): os dois triggers foram chamados; o stage foi removido. |
| Q177 | Client secret em todas as funções (revê a Q129) | Aceito junto com a Q176, para ter um arquivo só: o secret só serve para chamar o Cognito em nome do client, e só quem já executa código numa das funções o lê. |
| Q178 | Escopo da 1.10 | Troca de papel, lista por papel, busca por e-mail e histórico de papéis. Desativar e reativar (`AdminDisableUser`/`AdminEnableUser`, compensação, regras) viram a 1.11; as histórias seguintes andam uma casa. |
| Q179 | Busca por e-mail do admin | Pela reserva, com o `findByEmail` existente (Q137). O `GSI2` continua para o catálogo (Q112); a Q78 previa o índice para isso (achado). |
| Q180 | Papel do chamador na checagem | O adapter usa a claim `role` do access token em todas as rotas (sem acesso ao banco); sem a claim ou com papel desconhecido, `401 INVALID_SESSION`. A troca de papel reconfirma o chamador no Dynamo dentro da transação (Q181), cumprindo a Q20 e a Q88. Um admin rebaixado ainda lê listas por até 1 h, mas não muda papel. |
| Q181 | Último admin | Sem contagem: ninguém muda o próprio papel, e a transação do `changeRole` leva um `ConditionCheck` no chamador (`role = admin AND status = ACTIVE`). Dois admins rebaixando um ao outro ao mesmo tempo: a segunda transação falha. O bootstrap (Q173) não leva o `ConditionCheck`. Teste de integração da corrida. |
| Q182 | `PUT /admin/users/{id}/role` | Corpo `{ role }` → `200 { id, role }`; mesmo papel → 200 sem gravar; próprio papel → `403 CANNOT_CHANGE_OWN_ROLE`; alvo inexistente → `404 ACCOUNT_NOT_FOUND`; alvo `PENDING`/`DISABLED` → `409 ACCOUNT_NOT_ACTIVE`; papel do alvo mudou no meio → `409 CONFLICT`; chamador deixou de ser admin → `403 FORBIDDEN` (pelos `CancellationReasons`). `changedBy` = `accountId` do chamador. |
| Q183 | Módulo de permissões | `src/application/security/permissions.ts`: `permissions` `as const` (`users:list`, `users:read`, `users:change-role`), `rolePermissions` `as const satisfies Record<Account.Role, readonly Permission[]>` com o admin espalhando as do instrutor, e `Permissions.allows(role, permission)` como única leitura do mapa (a porta para a Q43). Só as ações em uso (Q112). |
| Q184 | Ação e params no controller (revê a forma da Q94) | Propriedades `permission`, `paramsSchema`, `queryParamsSchema` ao lado do `bodySchema`; o `execute` checa a permissão antes de qualquer validação (`403 FORBIDDEN`, mensagem única). O adapter passa `role`, `params` e `queryParams` como no foodiary. Teste de auditoria: todo controller de rota `/admin` tem `permission`. |
| Q185 | Paginação com filtro (completa a Q89) | Mantém a Q76: status por `FilterExpression`, com o laço da `dynamodb-query-pagination` (blocos até juntar `limit + 1`, no máximo 3 requisições); cursor = chave do último item devolvido, com os 4 atributos do `GSI1` e `GSI1PK` validado contra o papel pedido; página curta com `nextCursor` é válida. `role` obrigatório, `status` opcional. |
| Q186 | Respostas de leitura do admin | Lista `{ items: [{ id, name, email, role, status, createdAt }], nextCursor }` (`string \| null`, sem total); por e-mail, o mesmo item ou `404 ACCOUNT_NOT_FOUND`; histórico `{ items: [{ id, fromRole, toRole, changedBy, changedAt }], nextCursor }`, mais recentes primeiro, `404` para conta inexistente. Leituras em classes de query atrás de porta (Q15). |
| Q187 | Onde fica a paginação | `DynamoPagination` em `src/infra/database/dynamo/` com `encodeCursor`, `decodeCursor(cursor, keySchema)` (`z.strictObject` com partição e prefixo fixos pela query) e `queryPage(input, { limit, cursor })` com o laço da Q185, todos estáticos; `InvalidCursor` (`400 INVALID_CURSOR`) em `application/errors`; schema de `limit`/`cursor` único em `application/controllers/`. |
| Q188 | Portas de leitura | Primeiras classes de query (Q15): `ListAccountsByRoleQuery` e `ListRoleChangesQuery`, interfaces em `application/queries/`, implementação em `infra/database/dynamo/queries/`, devolvendo DTOs. Use cases finos: `ListAccountsUseCase`, `FindAccountByEmailUseCase` (pelo `findByEmail`, Q179), `ListRoleChangesUseCase` (`findById` para o 404, depois a query), `ChangeRoleUseCase`. O item da lista é classe com `fromAccount`, como o `AccountProfile`. |
| Q189 | `GSI1` nos testes | Repetido à mão no `__tests__/dynamodb/globalSetup.ts`; a chamada real em `dev` pega divergência com o `MainTable.yml`. Lacuna: nenhuma skill cobre manter a tabela local igual à IaC. |
| Q190 | Sub-imp da 1.10 | a. `GSI1` no `MainTable.yml` e no setup, `dynamodb:Query` na tabela e em `…/index/GSI1`; b. permissões, `Controller` e adapter, teste de auditoria; c. `DynamoPagination` e `InvalidCursor`; d. troca de papel (`ConditionCheck` do chamador, erros, use case, teste da corrida); e. queries e use cases de leitura; f. controllers, funções, Yaak e chamadas reais em `dev` depois do merge (feliz e um erro por rota, incluindo 403 com conta de aluno). |
| Q191 | Ajustes da implementação da 1.10 (revê a forma da Q183 e da Q187) | O ESLint (`no-extraneous-class`) recusa classe só com estáticos: `Permissions` é objeto literal com `allows` (a chamada não muda) e `DynamoPagination` é instância com o schema da chave (`new DynamoPagination(keySchema)` por query). `Controller.execute` é `async`, para o `Forbidden` sair como rejeição. A lista de usuários também ignora contas `PENDING` vencidas (Q39). O teste de auditoria (Q94) lê os `sls/functions/*.yml` (devDependency `yaml`) e chama cada rota `/admin` com token de aluno, esperando 403. |
| Q192 | Lições da 1.10 em `dev` | Toda operação nova do DynamoDB entra com a sua ação IAM no mesmo commit (o `ConditionCheck` sem `dynamodb:ConditionCheckItem` deu 500 em `dev`; o DynamoDB Local não confere IAM). Índice novo vai num deploy antes do código que o consulta, conferido `ACTIVE` (`dynamodb-secondary-indexes`); vale para o `GSI2` da 1.14. A conta de aluno de teste do autor fica em `dev` como `student` `ACTIVE`. |
| Q193 | Ordem ao desativar e reativar | (1) Transação no Dynamo (`ACTIVE` ↔ `DISABLED`, com o `ConditionCheck` do chamador da Q181); (2) `AdminDisableUser`/`AdminEnableUser`. Se (2) falha, nada é desfeito: log `CognitoStatusNotSynced` e 500; a nova chamada encontra o Dynamo já no estado pedido e repete só (2), reparando o Cognito. Sem `Saga` (o Dynamo decide, Q41). |
| Q194 | Regras de desativação | Própria conta → `403 CANNOT_CHANGE_OWN_STATUS`; outro admin pode (nunca zero admin, pelo argumento da Q181); `PENDING` → `409 ACCOUNT_NOT_ACTIVE`; já no estado pedido → 200 sem gravar no Dynamo, repetindo o Cognito; inexistente → 404. |
| Q195 | Contrato e registro | `POST /admin/users/{id}/disable` e `/enable`, sem corpo, `200 { id, status }`. Registro só em linha de log (quem, quando, de/para); um item `StatusChange` entra se o painel pedir (Q112). |
| Q196 | Permissão | Uma ação, `users:change-status`, para as duas rotas. |
| Q197 | **Bloqueio do chamador antes do recurso** (revê a Q180 e absorve a Q165) | A aplicação sempre conhece a versão atual do usuário: o adapter das rotas privadas lê a conta pelo `internalId` antes do controller; inexistente → `401 INVALID_SESSION`; `PENDING`, vencida ou `DISABLED` → `403 ACCOUNT_UNAVAILABLE`. A permissão (Q184) é checada com o papel **do banco**; a claim `role` do token fica só como informação para o front. O token diz quem é; o Dynamo diz o que pode. Lambda authorizer descartado (verificação própria do JWT, uma Lambda a mais, cache devolveria o atraso). O foodiary não tem exemplo disso. |
| Q198 | Consistência da leitura do chamador | `ConsistentRead` (revê a Q88 nesse ponto): sempre a última versão. O `ConditionCheck` da Q181 continua na transação. |
| Q199 | Onde entra o bloqueio do chamador | Primeira sub-imp da 1.11 (implícito no acordo da Q202). |
| Q200 | Resolvedor do chamador | `ResolveCallerUseCase` em `application` (`findById` forte; `null` → `InvalidSession`; não `ACTIVE` → `Account.requireActive`). Handlers privados: `lambdaHttpAdapter(controller, makeResolveCallerUseCase())`; o tipo exige o resolvedor para controller `'private'` por sobrecarga, ou o adapter recusa em runtime (500) e o teste de auditoria cobre toda rota privada (implícito no acordo da Q202). |
| Q201 | O que o controller recebe | `accountId` e `role` (do banco), não a entidade. `GetMe`/`UpdateMe` mantêm o `Account.requireActive` como defesa própria; a leitura dupla do `/me` fica até haver medida. |
| Q202 | Sub-imp da 1.11 | a. `ResolveCallerUseCase`, adapter, permissão pelo papel do banco, handlers privados, auditoria de toda rota privada; b. `changeStatus` no repositório com `ConditionCheck` do chamador e teste da corrida; c. `AuthGateway.disableUser`/`enableUser` com `AdminDisableUser`/`AdminEnableUser` na role no mesmo commit (Q192); d. `ChangeStatusUseCase` com o reparo e `users:change-status`; e. controllers, funções, Yaak e chamadas reais em `dev` (aluno desativado: 403 no `/me` na hora, refresh falha, Cognito desativado; reativar; desativar a si mesmo 403). |
| Q203 | Sign-in de conta desativada | Resolvida pela Q212: sem o Cognito desativando o usuário, o trigger recusa e a rota responde `403 ACCOUNT_UNAVAILABLE` (Q146). Antes, com `AdminDisableUser`, o Cognito recusava primeiro com `401 INVALID_CREDENTIALS`. |
| Q210 | **Sessão única** | Uma sessão por conta: todo sign-in invalida tudo o que foi emitido antes, e todo refresh invalida os access tokens anteriores. Entrar num dispositivo derruba o outro, de propósito. |
| Q211 | Mecanismo da sessão | A conta guarda `session: { accessJti, refreshTokenHash }` (SHA-256 do refresh token). Sign-in grava os dois depois do Cognito. Refresh: Cognito primeiro, depois `Update` condicionado a `refreshTokenHash = hash(token recebido)`; se falha, `401 INVALID_SESSION` e os tokens novos são descartados (o dispositivo antigo fica fora: o Cognito já girou o token dele). O adapter exige a claim `jti` igual a `session.accessJti`. Reset de senha, desativação e um sign-out futuro apagam a `session`. O trigger de pre token continua só lendo. Uma primeira versão (trigger gerando `sessionId`) foi descartada: o dispositivo antigo retomava a sessão no refresh. |
| Q212 | O Cognito deixa de ser barreira (revê a Q56, a Q162 e a Q193) | Saem `AdminDisableUser`/`AdminEnableUser` da 1.11 (com a ordem, o reparo e o 500 da Q193) e o `AdminUserGlobalSignOut` do reset; no lugar, apagar a `session`. Ninguém chama o Cognito por fora da API (client com secret, Q127). |
| Q213 | Onde entra | História própria, 1.12 "Sessão única"; curso, módulos e catálogo andam uma casa (1.13 a 1.15). As perguntas Q204 a Q209 do curso ficam para a 1.13. |
| Q214 | Rota de sign-out | Continua esperando o front (Q150, Q112), agora reduzida a apagar a `session`. |
| Q215 | Quem lê os tokens novos | O `CognitoAuthGateway` decodifica o payload do access token recém-emitido (veio do Cognito por TLS) e o `AuthGateway.Tokens` traz `accountId` e `accessJti`; a aplicação não conhece JWT. O hash do refresh token é `Account.hashRefreshToken` (SHA-256, `node:crypto`). |
| Q216 | Sessões existentes | Sem migração: depois do deploy, todo token atual dá 401 e todos entram de novo (só as contas de teste em `dev`; `prod` não existe). |
| Q217 | Sub-imp da 1.12 | a. `session` na conta e `saveSession`/`rotateSession`/`clearSession`, com a corrida de dois refresh; b. `Tokens` com `accountId` e `accessJti`, sign-in grava e refresh gira a sessão; c. adapter exige `jti` = `session.accessJti`, auditoria com token de sessão anterior; d. simplificações da Q212 (desativar apaga a sessão na transação, sai o Cognito do `ChangeStatusUseCase`, reset apaga a sessão, saem três métodos do gateway e três ações IAM); e. Yaak e chamadas reais em `dev`. |
| Q218 | Chamadas reais automatizadas | `pnpm e2e:dev` (`scripts/e2e-dev.js`) cria contas descartáveis pelo sign-up com endereços do simulador do SES, ativa-as escrevendo o que a confirmação escreve (a rota precisa do código do e-mail; um usuário já confirmado responde `CodeMismatch` a um código errado, então o reparo da Q139 não serve), promove uma a admin pelo `promoteAdmin`, roda sessão, permissões, papel e status contra `dev` e apaga as contas no fim. Usa a credencial do perfil do projeto (`.env`). O reset de senha fica de fora (precisa do código do e-mail). Substitui o pedido de token e código ao autor no critério de pronto (Q100). |
| Q204 | Campos do curso | Criação `{ title, description }`: título 3 a 120 (aparado), descrição até 5.000, texto simples. Nasce `DRAFT`, contadores zerados, `instructorId` do chamador e `instructorName` copiado da conta. `PATCH` só `title` e `description` (pelo menos um); status só por publicar/arquivar (1.15). `201` com o curso; `PATCH` `200` com o curso inteiro (`ALL_NEW`; revista pela Q309). |
| Q205 | Permissões do curso (ajustada pelo autor) | `courses:create`, `courses:update` e `courses:list-own` para o instrutor (e o admin por herança). O instrutor edita só o que é dele; **o admin edita qualquer curso** (Q219). Instrutor rebaixado perde a edição pelo papel do banco (Q197). |
| Q206 | Curso alheio e arquivado | Q95 inteira já na 1.13: curso alheio em rascunho → `404`; publicado ou arquivado → `403`. Curso arquivado recusa edição: `409 COURSE_ARCHIVED`. Publicado continua editável. |
| Q207 | Propagar `instructorName` | O `PATCH /me` atualiza a conta e depois os cursos do instrutor (pelo `GSI1`) em transações de até 100 `Update`, cada um condicionado a `instructorId`; se falha no meio, 500, e repetir o mesmo nome completa (idempotente). |
| Q208 | Ids com brand | `Account.Id` e `Course.Id` na 1.13; a migração do `Account.Id` é a primeira sub-imp, sem mudança de comportamento. |
| Q209 | `GET /instructor/courses` | Cursos do chamador em todos os status, mais recentes primeiro (`GSI1` `INSTRUCTOR#<id>`), paginados (padrão 20, máximo 100); item `{ id, title, status, lessonCount, enrollmentCount, createdAt, publishedAt }`; sem filtro de status. |
| Q219 | Admin edita qualquer curso | `courses:update` (instrutor, só os seus; posse no use case) e `courses:update-any` (só admin). O use case libera dono ou `update-any`; senão, a Q95. Arquivado: `409` também para o admin. |
| Q220 | Forma dos ids | `Account.Id`/`Course.Id` = `string & { readonly __brand }` no namespace da entidade; `Account.toId`/`Course.toId` (estáticos) validam o formato KSUID (27 caracteres base62) e lançam se não servir. Ids de rota passam pelo Zod com a mesma regra: malformado → `400 VALIDATION`; bem-formado inexistente → `404`. Ids do banco e do token recebem o brand no `*Item` e no `ResolveCallerUseCase`. |
| Q221 | Sub-imp da 1.13 | a. brands e migração do `Account.Id`; b. `Course`, `CourseItem`, `CourseRepository`; c. `CreateCourse`, `UpdateCourse`, `ListCoursesByInstructorQuery`; d. propagação do nome no `PATCH /me`; e. controllers, rotas, permissões, Yaak e `e2e:dev` estendido. Sem ação IAM nova. |
| Q222 | Rotas de módulos e aulas | `POST /courses/{id}/modules`, `PATCH`/`DELETE /courses/{id}/modules/{mid}`, `POST /courses/{id}/modules/{mid}/lessons`, `PATCH`/`DELETE /courses/{id}/modules/{mid}/lessons/{lid}`, `PUT /courses/{id}/outline` (`{ modules: [{ id, lessonIds }] }`, aulas podem trocar de módulo) e `GET /courses/{id}/outline` (dono ou admin, qualquer status; a 1.15 reaproveita a query). O módulo vai na rota da aula porque está na chave. |
| Q223 | O que pode ser apagado | Rascunho: apaga módulo e aula. Publicado: `409 COURSE_PUBLISHED` ao apagar (Q24); criar, editar e reordenar liberados. Arquivado: `409 COURSE_ARCHIVED` em toda escrita (Q206). Módulo com aulas: `409 MODULE_NOT_EMPTY`. |
| Q224 | Forma da `UnitOfWork` | Os repositórios montam as operações (`createOperations(lesson)`, `addLessonsOperation(courseId, n)`), cada uma com o erro de domínio da sua condição; a `UnitOfWork` (nova por execução, Q87) junta, envia, repete em conflito e traduz o `CancellationReasons` pelo índice. |
| Q225 | Posições | Inteiros; novo vai para o fim (maior + 1, lendo a partição do curso); o `PUT /outline` regrava 0..n; empate de criações simultâneas desempata pelo id. |
| Q226 | Campos e limites | Módulo: título 3 a 120. Aula: título 3 a 120, `body` Markdown até 32 KiB em bytes UTF-8 (vazio permitido), `durationMinutes` inteiro 1 a 600. Criar aula grava sumário, conteúdo e `lessonCount` numa transação. |
| Q227 | Tamanho do outline | Só os itens que mudam de lugar são gravados (posição: 1 operação; troca de módulo: 2); passou de 100 → `400 OUTLINE_TOO_LARGE`. A Q86 fica para quando aparecer. |
| Q228 | Permissões de módulos e aulas | As do curso: `courses:update` (dono) e `courses:update-any` (admin), com a Q95. |
| Q229 | O que o outline aceita | Só reordena: o corpo traz exatamente os módulos e aulas existentes, cada um uma vez; senão `400 OUTLINE_MISMATCH`. Cada item que muda vai com `attribute_exists`; se sumiu no meio, `409 CONFLICT`. |
| Q230 | Regra de edição na entidade | `course.requireEditableBy(callerId, callerRole)` lança `CourseNotFound`, `Forbidden` ou `CourseArchived` (dono ou `update-any`, Q95, arquivado); o `UpdateCourseUseCase` passa a usá-la. |
| Q231 | Sub-imp da 1.14 | a. `UnitOfWork` (commit, retry em conflito, tradução) e `requireEditableBy`; b. `Module`, `Lesson`, itens, repositórios de operações e query do outline; c. use cases de módulo; d. use cases de aula com `lessonCount`; e. outline `GET` e `PUT`; f. nove rotas, Yaak e `e2e:dev`. Sem ação IAM nova. |
| Q232 | Publicar | Só `DRAFT` → `PUBLISHED`, com `lessonCount > 0` na condição da escrita (senão `409 COURSE_EMPTY`); já publicado → 200 sem gravar; arquivado → `409 COURSE_ARCHIVED`. O mesmo `Update` grava `publishedAt` e as chaves do `GSI2`. |
| Q233 | Arquivar e permissões | Só `PUBLISHED` → `ARCHIVED` (rascunho → `409 COURSE_NOT_PUBLISHED`; apagar rascunho é da fase 3); remove `GSI2PK`/`GSI2SK`. Ações `courses:publish` e `courses:archive` do instrutor (o admin herda); posse por `course.requireEditableBy` (admin por `courses:update-any`). O `courses:archive-any` da Q93 deixa de existir. |
| Q234 | Catálogo | `GET /courses`, público: publicados, mais recentes primeiro, paginado (20/100), cursor preso a `CATALOG`; item `{ id, title, instructorName, lessonCount, enrollmentCount, publishedAt }`. Capa na fase 4, busca no Algolia (fase 3). |
| Q235 | Página pública do curso | `GET /courses/{id}`, público: curso, módulos e sumários das aulas (sem corpo) numa `Query` da partição `COURSE#c` (padrão 6); só publicado (rascunho e arquivado → 404; arquivado para matriculados entra com as matrículas). |
| Q236 | Ordem dos deploys | PR só com o `GSI2` (projeção `ALL`) e `Query` em `…/index/GSI2`, mergeado, deployado e conferido `ACTIVE` antes do PR do código (Q192). As contas já gravam `GSI2PK = EMAIL#…` e entram no índice, sem efeito. |
| Q237 | Sub-imp da 1.15 | a. `GSI2` e `Query` no índice, PR próprio deployado e conferido `ACTIVE`; b. chaves do `GSI2` só em publicado, `publish`/`archive` condicionados no repositório; c. `PublishCourse` e `ArchiveCourse` com `courses:publish`/`courses:archive`; d. queries públicas do catálogo e da página do curso; e. quatro rotas, Yaak e `e2e:dev`. |
| Q238 | Histórias da fase 2 | 2.1 matrícula (matricular, cancelar, rematricular; `enrollmentCount`; `studentName`; índice esparso de alunos; propagação do nome); 2.2 listas (`GET /me/enrollments` com `BatchGet`, `GET /courses/{id}/students`); 2.3 abrir aula (`GET /courses/{id}/lessons/{lid}`, leitura forte da matrícula; página de arquivado para matriculados); 2.4 progresso (concluir uma vez, ler, posição no vídeo em item à parte); 2.5 avaliações (`PUT /courses/{id}/review`, `GET /courses/{id}/reviews` público, propagação do nome). Cada uma estende o `e2e:dev`. |
| Q239 | Quem se matricula | Qualquer conta ativa, em curso publicado; o dono no próprio curso → `409 OWN_COURSE`; rascunho → `404`; arquivado recusa matrícula nova (`409 COURSE_ARCHIVED`) e mantém as que existem (Q52). |
| Q240 | Quem abre o conteúdo da aula | Matrícula ativa em curso publicado ou arquivado, ou o dono/admin em qualquer status; os demais pela Q95 (`404` em rascunho, `403` em visível sem matrícula). |
| Q241 | Permissões de aluno | `courses:enroll`, `courses:learn` (abrir aula, progresso) e `courses:review`; o mapa vira aluno ⊂ instrutor ⊂ admin. |
| Q242 | Contrato da matrícula | `PUT /courses/{id}/enrollment` → `{ courseId, status, enrolledAt, completedLessons }`, `201` na primeira, `200` na rematrícula e quando já ativa (sem gravar). `DELETE` → `204` (também se já cancelada); nunca matriculado → `404 ENROLLMENT_NOT_FOUND`. Cancelamento lógico (Q49). |
| Q243 | Escritas da matrícula | Matricular: `Put` condicional (`ACTIVE`, `completedLessons = 0`, `studentName`, chaves do `GSI1`) + `ADD enrollmentCount 1` com curso `PUBLISHED`. Rematricular: `CANCELLED` → `ACTIVE`, regrava o `GSI1` (mesmo `enrolledAt`, Q84) + `ADD 1` com curso `PUBLISHED`. Cancelar: `ACTIVE` → `CANCELLED`, remove o `GSI1` + `ADD -1` com curso existente. Tudo pela `UnitOfWork`; status do curso mudou no meio → `409 CONFLICT`. |
| Q244 | Sub-imp da 2.1 | a. `Enrollment`, item e repositório de operações (corrida de duas matrículas); b. `Enroll` e `CancelEnrollment` com as permissões de aluno (Q241); c. propagação do nome para as matrículas (Q81); d. rotas, Yaak e `e2e:dev`. |
| Q245 | Schemas por decorator | Não. O decorator padrão funcionaria sem `reflect-metadata`, mas não tira a duplicação de tipos; o controller fica como está (Q251). |
| Q246 | Versões das Lambdas | `provider.versionFunctions: false` (nada usa versões); apagar as versões antigas de `dev` uma vez. |
| Q247 | Uma Lambda por rota | Mantida (Q97); reavaliar se o template passar de 400 recursos (teto de 500 por stack). |
| Q248 | Conta entregue ao controller (revê a Q201) | O adapter entrega a `Account` lida com leitura forte; os use cases deixam de reler a conta. |
| Q249 | Erros e fábricas | Erros por `defineError`, um arquivo por domínio; as fábricas por controller saem e a montagem vai para o arquivo da função; ficam só as fábricas de infraestrutura. |
| Q250 | Fakes de transação | Use cases que escrevem pela `UnitOfWork` testados contra o DynamoDB Local; fakes só para o que não roda local (Cognito). |
| Q251 | Forma do controller | Fica como está; as alternativas (função `controller({...})`, classe com `Controller.Request<Classe>`) foram recusadas. |
| Q252 | Organização das pastas | Por camada, com a mesma subpasta de domínio em todas as camadas e os arquivos fora do lugar realocados. |
| Q253 | Convenção dos testes | Um arquivo por unidade ao lado dela (`.spec.ts` unitário, `.test.ts` integração); auxiliares em `__tests__/support/` e `__tests__/fakes/`. |
| Q254 | Quando | História de refatoração R.1 a partir da `develop`, sem mudança de comportamento, `e2e:dev` igual e verde no fim; depois, rebase da `feat/2.1-enrollment`. |
| Q255 | Fonte da skill de projeto | `docs/process-log.md` atualizado com as etapas 12 a 15 e, daqui em diante, no fechamento de cada história. |
| Q256 | Modelos de resposta | Ficam como hoje, cada um na subpasta de domínio da sua camada. |
| Q257 | Mapa da reorganização | Entidades, erros, portas, use cases, schemas e itens/repositórios/queries Dynamo em subpastas de domínio (`account`, `admin`, `auth`, `catalog`, `course`, `outline`, `shared`); `usecases/admin` separado; `ResolveCaller` em `usecases/auth`; `CourseEditor` em `usecases/course`; schemas em `controllers/<domínio>/schemas.ts`. Ordem: versões, erros, fábricas, conta no controller, pastas, testes. |
| Q258 | Fakes de conta | Saem também: o `InMemoryAccountRepository` reimplementava as condições de papel, status e sessão. Os specs que o usavam rodam contra o DynamoDB Local; só o `FakeAuthGateway` fica (Cognito). Feito na história de refatoração R.2, antes de retomar a 2.1. |
| Q259 | Domínio da matrícula | `enrollment` em todas as camadas (entidade, erros, use cases, controllers, itens e repositórios Dynamo, `sls/functions/enrollment.yml`); o que é do curso, como `addEnrollmentsOperation`, fica em `course`. |
| Q260 | Chaves de índice esparso | `NonNullable<XItem.Keys['GSI…']>` como tipo de retorno, mantendo o padrão `Keys[...]` (`EnrollmentItem` `GSI1`, `CourseItem` `GSI2`). |
| Q261 | Nomes de repositórios e use cases | Repositórios no plural (`coursesRepository`) e use cases pelo nome completo (`archiveCourseUseCase`; no controller, o campo `archiveCourse`) em funções, controllers e construtores. |
| Q262 | Estilo dos testes | `it('should …')` em todos os arquivos (complementa a Q253). |
| Q263 | Lugar dos schemas | Sempre em `controllers/<domínio>/schemas.ts`; o que mais de um domínio usa (ids, título, nome, código) em `controllers/shared/schemas.ts`. |
| Q264 | Leitura no `find` de repositório | `consistent = true` por padrão (conta e matrícula): esses `find` decidem escritas; listas seguem eventuais nas queries. |
| Q265 | Erro `OwnCourse` | Fica: `OWN_COURSE` 409 é contrato da Q239 (conflito com o estado do recurso, não ação proibida ao papel). |
| Q266 | `promoteAdmin` | `timeout: 5` e role própria de menor privilégio, como as outras funções sem HTTP. |
| Q267 | Refatoração R.3 | Alinha os desvios entre arquivos irmãos achados na varredura de 2026-10-16 (Q260 a Q266 e os mecânicos), sem mudança de comportamento, `e2e:dev` igual no fim. Ficam de fora: ordem dos erros, `CatalogQuery.Item`, laço de paginação repetido (vira helper na quinta cópia). Daqui em diante, todo PR passa pelo `/code-review` antes de abrir. |
| Q268 | Ordem de "minhas matrículas" (revê o padrão 9) | Índice esparso no `GSI2` só nas ativas: `ENROLLMENTS#<accountId>` / `<enrolledAt>#<courseId>`, mais recente primeiro, paginado, sem filtro. Cancelar remove as chaves; rematricular as regrava com o `enrolledAt` original. Uma escrita de índice a mais por matrícula em troca de páginas sem leituras descartadas, para uma lista lida muito mais do que escrita; leitura eventual, como o `GSI1`. |
| Q269 | `GET /me/enrollments` | Paginado 20/100, cursor preso ao aluno; item `{ courseId, title, instructorName, lessonCount, completedLessons, enrolledAt, courseStatus }`, curso por `BatchGet` (Q80) numa chamada por página, `UnprocessedKeys` pedidas de novo; curso ausente fica fora com log. |
| Q270 | `GET /courses/{id}/students` | Dono ou admin, permissão `courses:list-students` no instrutor; demais pela Q95; arquivado continua listável. `requireManagedBy` (dono ou admin) separado de `requireEditableBy`. Item `{ accountId, studentName, enrolledAt, completedLessons }`, mais recente primeiro, 20/100, cursor preso a `COURSE#c`. |
| Q271 | Sub-imp da 2.2 | a. `GSI2` na matrícula e query de "minhas matrículas"; b. `findManyByIds` com `BatchGetItem` e IAM no mesmo commit (na execução, o `BatchGet` ficou dentro da query de leitura, que já é o modelo de leitura da lista, sem método novo no repositório); c. use case e rota `GET /me/enrollments`; d. `courses:list-students`, `requireManagedBy`, query e rota `GET /courses/{id}/students`; e. Postman, `e2e:dev`, documentação; `/code-review` antes do PR. |
| Q272 | Nomes dos parâmetros de rota | Nome completo em todas as rotas: `{courseId}`, `{moduleId}`, `{lessonId}`, `{accountId}` (as URLs não mudam); refatoração no início da 2.3. |
| Q273 | Resposta de abrir aula | `GET /courses/{courseId}/lessons/{lessonId}` → `{ lessonId, courseId, body }`, uma leitura de `LESSON#l`; título e módulo vêm do outline; `courseId` do conteúdo diferente do da rota → `404 LESSON_NOT_FOUND`. |
| Q274 | Outline para quem estuda | `GET /courses/{courseId}/outline` com `courses:learn`: matrícula ativa em publicado ou arquivado, dono/admin em qualquer status (inclusive arquivado); edição segue em `requireEditableBy`. |
| Q275 | Regra de leitura | `Course.requireReadableBy(callerId, callerRole, enrollment)`: dono/admin sempre; matrícula ativa em publicado ou arquivado; demais pela Q95 (rascunho 404, visível 403); cancelada conta como nenhuma. Matrícula com leitura forte (8b), em paralelo com o curso. |
| Q276 | Sub-imp da 2.3 | a. `courses:learn` e `requireReadableBy`; b. leitura do conteúdo no repositório de aulas; c. use case e rota de abrir aula; d. outline para matriculados e dono/admin em qualquer status; e. Postman, `e2e:dev`, documentação, `/code-review`. |
| Q277 | Deploy da renomeação dos parâmetros | O HTTP API recusa `{accountId}` ao lado de `{id}` no mesmo nível, e o CloudFormation cria a rota nova antes de apagar a antiga: o deploy da 2.3 voltou atrás. Dois passos pelo CI: um PR tira o `events` das 20 rotas com parâmetro (fora do ar em `dev` por minutos), outro as devolve com os nomes novos. |
| Q278 | Concluir aula | `PUT /courses/{courseId}/lessons/{lessonId}/completion`: 201 na primeira, 200 sem gravar se já concluída. Transação: `Put` do `LessonProgress` (`attribute_not_exists`) + `ADD completedLessons 1` na matrícula `ACTIVE` + `ConditionCheck` do conteúdo da aula com o `courseId` da rota. Só matrícula ativa; demais pela Q95; aula de outro curso → `404 LESSON_NOT_FOUND`. Sem desfazer. |
| Q279 | Ler o progresso | `GET /courses/{courseId}/progress` → `{ completedLessons, completedLessonIds, lastLessonId, positionSeconds }`; Query `ACCOUNT#a` com `begins_with PROGRESS#c` seguindo `LastEvaluatedKey`; `completedLessons` da matrícula; só matrícula ativa. |
| Q280 | Salvar a posição | `PUT /courses/{courseId}/position` `{ lessonId, positionSeconds }` (0 a 86.400) → 204; leitura forte da matrícula ativa + `Put` de `PROGRESS#c` (2 RCU — conta no adapter e matrícula — + 1 WCU, sem transação; o curso só é lido para recusar); `lessonId` só gravado. |
| Q281 | Sub-imp da 2.4 | a. `LessonProgress` e transação de concluir; b. use case e rota de concluir; c. leitura do progresso; d. salvar a posição; e. Postman, `e2e:dev`, documentação, `/code-review`. |
| Q282 | Avaliar e editar | `PUT /courses/{courseId}/review` `{ rating (1 a 5), comment? (até 2.000, aparado) }` → 201 ao criar, 200 ao editar ou sem mudança (sem gravar); `{ courseId, rating, comment, createdAt, updatedAt }`. Criar: `Put` condicional + `ADD ratingSum, ratingCount 1` + `ConditionCheck` da matrícula `ACTIVE`; editar: `Update` condicionado à nota lida + `ADD ratingSum :diferença` + o mesmo `ConditionCheck`. Só matrícula ativa; sem apagar. |
| Q283 | Lista pública de avaliações | `GET /courses/{courseId}/reviews`, público, só curso publicado (arquivado 404), mais recente primeiro pela criação, 20/100; item `{ studentName, rating, comment, createdAt, updatedAt }` sem `accountId`. Página do curso e catálogo ganham `ratingCount` e `ratingAverage` (calculada na leitura, `null` sem avaliações); ausentes contam 0. |
| Q284 | Minha avaliação | `GET /courses/{courseId}/review` → a do próprio aluno ou `404 REVIEW_NOT_FOUND`; `courses:review` no aluno; não exige matrícula ativa. |
| Q285 | Sub-imp da 2.5 | a. `Review` e transações; b. `courses:review`, use cases e rotas `PUT`/`GET /review`; c. propagação do nome para as avaliações; d. lista pública e média na página e no catálogo; e. Postman, `e2e:dev`, documentação, `/code-review`. |
| Q286 | Cursor da lista pública de avaliações (revê a Q283) | Aceito: o `nextCursor` carrega o `accountId` do último item (a chave da tabela é exigida para continuar). O id é um KSUID aleatório que nenhuma rota pública aceita; o que vaza é que duas avaliações são do mesmo aluno, o que o nome copiado já mostra. Cifrar os cursores (AES-GCM, chave no SSM) volta se um id interno ficar sensível ou uma rota pública passar a aceitar `accountId`. |
| Q287 | Escopo da R.4 | Depois da análise das skills e do `/code-review` de `src/` (2026-10-16): bugs do outline e do `PATCH /me`, riscos (specs, `restoreMocks`, compensação do cadastro), custo (memória, corpo da aula, propagação, posição), estilo e documentação. Ficam fora: descrição do curso em item à parte (fase 3, com backfill), `DeletionPolicy` (antes de `prod`), limpeza do Cognito pelo `sub` (fase 3), custo do `ConditionCheck` no conteúdo (medir). |
| Q288 | Aula órfã no outline | `lessonCount` no módulo, mantido nas transações de criar, apagar e mover aula (`ADD` exige o módulo); apagar módulo exige `lessonCount = 0`; ausente lido como 0. Sem backfill: `dev` não tinha nenhum módulo gravado (o `e2e:dev` apaga o que cria) e `prod` nasce com o contador. Rotas de edição leem o outline com leitura forte. |
| Q289 | Mover aula | O `Delete` do sumário na origem exige título e duração lidos; mudou no meio → `409 CONFLICT`. |
| Q290 | Propagação de nomes (revê Q81, Q207) | Um `Update` por item, 4 em paralelo, condição `attribute_exists(PK) AND <campo> <> :name`, condição falha ignorada; query das chaves com leitura forte; segue na requisição, assíncrono na fase 3. Vale para aluno (matrículas, avaliações) e instrutor (cursos). |
| Q291 | Memória das funções | Medida no `e2e:dev` com 1024, 512 e 256 MB (Logs Insights das linhas `REPORT`); fica o menor valor sem piorar a duração em mais de 15%, no provider. Linha de base em `dev` (1024 MB, 828 invocações do `e2e:dev`): média 117 ms, p95 437 ms, init 302 ms, pico de memória usada 154 MB. Primeiro passo: 512 MB na R.4 (610 invocações: média 92 ms, p95 410 ms, pico 156 MB, init 302 ms; nada piorou). Segundo passo: 256 MB, julgado por função: 34 de 37 funções ficaram de 1,5 a 3,2 vezes mais lentas (`enroll` 43 → 117 ms, `getMe` 14 → 41 ms, `customMessage` 104 → 210 ms); as 3 que esperam o Cognito (`signIn`, `signUp`, `refreshTokens`) pioraram de 14% a 17%. Com o dobro do tempo e metade da memória, o custo é o mesmo e a latência dobra. **Fica 512 MB**, igual a 1024 MB por função e com metade do preço. Funções pesadas que chegarem (Algolia na fase 3, sharp na fase 4) ganham `memorySize` próprio. |
| Q292 | Sub-imp da R.4 | a. contador no módulo, leitura forte nas edições, trava ao mover, backfill; b. propagação por item; c. compensação do cadastro e corpo da aula; d. specs e `restoreMocks`; e. estilo; f. memória; g. documentação, skills de DynamoDB, consolidado em `docs/reviews/2026-10-16.md`, `/code-review`, `e2e:dev`. |
| Q293 | E-mails do domínio | Boas-vindas ao confirmar a conta (stream `PENDING` → `ACTIVE`) e aviso aos matriculados quando o curso é arquivado (um evento → N e-mails por fila, idempotente por aluno). Aviso ao instrutor de avaliação nova fica fora. |
| Q294 | Provedor de e-mail (fecha a Q37) | SES, que o pool já usa, atrás de uma porta `MailGateway`, com o React Email da Q161; sem chave de terceiros. O Resend não entra (achado da `transactional-email-resend`). |
| Q295 | Roles e variáveis dos consumidores (revê Q170/Q176 para eles) | Cada consumidor de stream ou fila tem role e variáveis próprias; a chave de escrita do Algolia só no indexador. Rotas HTTP seguem na role compartilhada. |
| Q296 | Falhas do stream (corrige a Q90) | `maximumRetryAttempts: 2`, `bisectBatchOnFunctionError`, destino de falha numa fila com alarme; a mensagem só traz a posição no stream, então a recuperação é pelo estado atual (reindexação do Algolia; varredura de `UNCONFIRMED` sem conta). Filas SQS (e-mail, exclusão) com DLQ e redrive (`StartMessageMoveTask`). |
| Q297 | `GET /search` (exceção à Q89) | `?q=&page=&perPage=` (página a partir de 0, até 50) → `{ items, page, totalPages, totalItems }`, só publicados, chave de busca. |
| Q298 | Descrição do curso em item à parte | `COURSE#c` / `DESCRIPTION`; o item do curso fica abaixo de 1 KB para os contadores. O indexador lê o estado atual pela chave. Backfill dos cursos de `dev`. Primeira história da fase 3. |
| Q299 | Apagar curso em rascunho | Na fase 3: `DELETING` + 202, job em fila apaga módulos, aulas e conteúdo com `Delete` condicional um a um (4 em paralelo); idempotente. |
| Q300 | Limpeza do Cognito (Q41 + revisão) | No `REMOVE` do TTL de conta `PENDING`, apaga o usuário só se `UNCONFIRMED` e com `sub` igual ao `externalId` da imagem antiga. |
| Q301 | Escopo no JWT (revê a Q169) | Rotas privadas voltam a exigir `aws.cognito.signin.user.admin`; id token recebe 403 do API Gateway. Refatoração R.5, antes da fase 3. |
| Q302 | Topologia do stream (revê a Q90) | Um leitor: Lambda roteadora com filtro dos tipos de interesse, que envia cada evento para a fila do consumidor (`index`, `cognito-cleanup`, `mail`); cada consumidor com DLQ, redrive e idempotência. |
| Q303 | Chaves do Algolia (caminho revisto pela Q313) | O autor cria a aplicação (plano gratuito) e grava `/coursary/<stage>/algolia/app-id`, `write-key` e `search-key` no SSM Parameter Store como `SecureString`; as chaves não passam pela conversa nem pelo repositório. Cada função recebe só a sua (escrita no indexador, busca no `GET /search`). |
| Q304 | Histórias da fase 3 | R.5 escopo no JWT; 3.1 descrição em item à parte; 3.2 catálogo no Algolia (stream, roteador, falhas, fila `index`, indexador, reindexação, chaves); 3.3 `GET /search`; 3.4 limpeza do Cognito; 3.5 boas-vindas (`MailGateway` SES, fila `mail`); 3.6 aviso de arquivamento (fan-out); 3.7 apagar rascunho. O stream nasce na 3.2 (Q112). |
| Q305 | Leitura das chaves do Algolia | A função lê o seu parâmetro do SSM no cold start (`GetParameter` com decifragem) e guarda em memória; role da função com `ssm:GetParameter` no caminho dela e `kms:Decrypt`. A chave não entra no template nem nas variáveis de ambiente (o `${ssm:…}` do deploy a deixaria em texto puro). Nasce na 3.2. |
| Q306 | Descrição no domínio | `Course` perde `description`; `CourseRepository.findDescription(courseId)` só para quem a devolve; `CourseDetails.fromCourse(course, description)`. Os demais casos de uso leem só o item do curso. |
| Q307 | Item da descrição | `COURSE#c` / `DESCRIPTION`, `{ courseId, description, type: 'CourseDescription' }`, sem índice; só existe com texto, ausência lida como `''`. |
| Q308 | Contrato das rotas | Igual: criar, `PATCH`, publicar e arquivar devolvem o curso com a descrição (`GetItem` a mais em paralelo onde ela não foi escrita); catálogo e lista do instrutor seguem sem ela; a página pública a pega na `Query` da partição. |
| Q309 | Escritas da descrição | No `CourseRepository`. Criar com descrição: transação `Put` curso + `Put` descrição; sem: `Put` simples. `PATCH` título e descrição: `Update` do curso (existe e não arquivado) + `Put`/`Delete` da descrição (`Delete` quando vira `''`); só descrição: `ConditionCheck` do curso + `Put`/`Delete`; só título: `Update` de hoje. Motivo da falha pelo `ALL_OLD` (Q232). A transação não devolve `ALL_NEW`: a resposta do `PATCH` é o curso lido antes da escrita com as mudanças aplicadas (revê a Q204; os contadores podem estar uma escrita atrás). |
| Q310 | Backfill em `dev` | Script idempotente em `scripts/`, rodado depois do deploy: por curso com `description` no item, transação `Put` do `DESCRIPTION` (`attribute_not_exists`) + `Update` `REMOVE description` (condição `description = :lida`). Janela com `''` aceita em `dev`; o script fica como registro da evolução de schema. Em 2026-10-17 o `dev` não tinha curso gravado (19 itens, nenhum `Course`; o `--dry-run` não achou nada), então não há backfill a rodar nem medição antes/depois em `dev`: a prova da Q312 fica no teste de integração. |
| Q311 | Sub-imp da 3.1 | a. `CourseDescriptionItem`, `Course` sem descrição, escritas da Q309 e `findDescription`, testes de integração; b. casos de uso, `CourseDetails` e página pública; c. script de backfill com `--dry-run`; d. documentação, quadro, `/code-review`, PR; depois do merge, backfill e `e2e:dev`. |
| Q312 | Prova da entrega da 3.1 | Teste de integração: curso com descrição de 5.000 caracteres, `ADD` de contador com `ReturnConsumedCapacity` → 1 WCU (ou tamanho do item pela regra do DynamoDB, se o Local não seguir o tamanho). Medição em `dev` antes e depois do backfill com a CLI, registrada no `skill-findings`; sem credencial, fica pendente. |
| Q313 | Caminho das chaves e boundary (revê a Q303) | O boundary das funções só lia `parameter/coursary-api/*` e não tinha `kms:Decrypt`: as chaves passam para `/coursary-api/<stage>/algolia/{app-id,write-key,search-key}` (movidas em `dev` em 2026-10-17, conteúdo conferido por hash, antigas apagadas) e o boundary ganha `kms:Decrypt` com `kms:ViaService = ssm.<região>.amazonaws.com`. O bootstrap é reaplicado com o perfil admin. |
| Q314 | Registro do índice | `{ objectID: courseId, title, description, instructorName, publishedAt }`, só o que se busca; o `GET /search` (3.3) completa com `BatchGet` no DynamoDB (contadores frescos, Q38) e descarta o que não está publicado. Sem highlight. |
| Q315 | Roteador | Stream `NEW_AND_OLD_IMAGES`; filtro na origem por `type` `Course` e `CourseDescription`; o roteador compara as imagens e envia `{ courseId }` à fila `index` só quando muda `status`, `title`, `instructorName`, `publishedAt` ou a descrição. Contador sozinho não gera mensagem. |
| Q316 | Ordem no indexador | Fila `index` FIFO, `MessageGroupId = courseId`, `MessageDeduplicationId` = `eventID` do stream. O indexador lê curso e descrição com leitura forte: `PUBLISHED` → `saveObject`; qualquer outro estado ou curso ausente → `deleteObject`. |
| Q317 | Aviso dos alarmes | Tópico SNS com assinatura de e-mail; o endereço em `/coursary-api/<stage>/alarm-email` (`String`), lido pelo CloudFormation no deploy com `{{resolve:ssm:…}}`: um `${ssm:}` seria resolvido pelo framework no `sls package` do job `check`, cuja role do CI não tem permissão nenhuma. Alarmes na fila de falhas do stream e na DLQ da fila `index`. |
| Q318 | Reindexação | Função `reindexCatalog`, chamada à mão, lê o `GSI2` e envia um `{ courseId }` por curso publicado à fila `index`. Órfãos no Algolia não são apagados (a busca os descarta, Q314); limpar exige chave com `browse`, quando aparecer. |
| Q319 | Nome do índice | `<stage>_courses`. |
| Q320 | Aplicar o bootstrap | Aplicado pelo assistente com o perfil admin em 2026-10-17, depois de conferir o change set (só `Boundary`, `Modify`, sem substituição). |
| Q321 | E-mail dos alarmes | Endereço pessoal do autor, gravado só em `/coursary-api/dev/alarm-email` (fora do repositório público). |
| Q322 | Números das filas e do stream | Roteador: `batchSize: 100`, `maximumRetryAttempts: 2`, `bisectBatchOnFunctionError`, `onFailure` em `coursary-api-<stage>-stream-failures` (14 dias). Fila `coursary-api-<stage>-index.fifo`: visibilidade 180 s (6 × 30 s), `maxReceiveCount: 5`, DLQ FIFO de 14 dias. Indexador: `batchSize: 10`, `ReportBatchItemFailures`, 512 MB. |
| Q323 | Porta e chave | `CatalogIndex` (`save`, `remove`) na aplicação, `AlgoliaCatalogIndex` na infraestrutura; `SecureParameter` em `src/infra/clients` lê com decifragem na primeira chamada e guarda a promessa, refeita se falhar; `ALGOLIA_PARAMETERS_PATH` só no indexador, com `ssm:GetParameter` em `app-id` e `write-key`. |
| Q324 | Sub-imp da 3.2 | a. stream, filas e roteador; b. porta, adapter, `SecureParameter` e indexador; c. SNS, alarmes e e-mail; d. `reindexCatalog`; e. prova em `dev`, documentação, quadro, `/code-review`, PR. A prova entrou no `e2e:dev` em vez de um script à parte: a role de deploy decifra a search key (política da chave `aws/ssm`), e todo `e2e` passa a conferir que o curso publicado chega ao índice e o arquivado sai. |
| Q325 | Variáveis por função (revê a Q176, cumpre a Q295) | O provider fica só com `MAIN_TABLE_NAME`; `COGNITO_POOL_ID`, `COGNITO_CLIENT_ID` e `COGNITO_CLIENT_SECRET` vão em `sls/config/cognitoEnv.yml`, só para as 7 funções que usam o `AuthGateway`. Consumidores, triggers e as demais rotas deixam de receber o secret do app client. Refatoração R.6. |
| Q326 | O que a busca devolve | Itens no formato do catálogo, lidos da tabela pelo `BatchGet` e postos na ordem dos resultados do Algolia. O índice já só guarda publicados; a tabela só difere por segundos depois de um arquivamento (ou com um órfão de lote perdido). Item que a tabela recusa (ausente ou não `PUBLISHED`) é descartado, a página sai um item menor, os totais ficam os do Algolia, e o log registra `SearchHitDropped` com o `courseId`. |
| Q327 | Validação da busca | `q` obrigatório, aparado, de 1 a 200 caracteres (vazio → 400; listar tudo é o `GET /courses`); `perPage` de 1 a 50, padrão 20; `page` a partir de 0, aceita enquanto `page × perPage < 1.000` (a janela que o Algolia pagina), e `totalPages` é limitado às páginas dessa janela (revisto no `/code-review`: o limite fixo de 49 ignorava o `perPage`). Página a partir de 0 pela Q297, contra a skill `algolia-search-api`, que conta a partir de 1. |
| Q328 | Rota pública com limite (rajada revista pela Q339) | `GET /search` público, com throttling só nessa rota no stage do HTTP API (`RouteSettings`: 5 por segundo, rajada de 10) por `resources.extensions`; acima disso, 429 sem invocar a Lambda. Protege a cota do plano gratuito do Algolia. |
| Q329 | Configuração do índice | `searchableAttributes: ['title', 'instructorName', 'description']`; a busca pede `attributesToRetrieve: []` e `attributesToHighlight: []`. Aplicada por `scripts/apply-algolia-settings.js --stage <stage>`, à mão, com a role de deploy. |
| Q330 | Leitura dos cursos | `CourseRepository.findManyByIds(ids)`, extraído do `coursesOf` da lista de matrículas, com o mesmo tratamento de chaves não processadas; usado pela lista e pela busca. |
| Q331 | Porta e role da busca | `CatalogSearch.search({ query, page, perPage })` → `{ courseIds, totalItems, totalPages }`, adapter `AlgoliaCatalogSearch` com `app-id` e `search-key` pelo `SecureParameter`. Função `searchCatalog` com role própria: `BatchGetItem`, `ssm:GetParameter` nas duas chaves, `kms:Decrypt` via SSM. |
| Q332 | Sub-imp da 3.3 | a. `findManyByIds`; b. `CatalogSearch`, adapter e use case; c. controller, schema, rota com role e throttling, Postman; d. script de configuração do índice; e. `e2e:dev`, documentação, quadro, `/code-review`, PR. |
| Q333 | Configuração repetida no `sls/` | Variáveis e statements de IAM que mais de uma função usa ficam em `sls/config/<tema>.yml` e são citados com `${file(…):…}`: `algolia.yml` (variáveis, chave do indexador, chave da busca, `kms:Decrypt`), `catalogIndexQueue.yml` (URL e envio da fila `index`), `privateAuthorizer.yml` (authorizer com o escopo das 31 rotas privadas), além do `cognitoEnv.yml` da Q325. O template gerado ficou idêntico; a auditoria das rotas resolve a referência ao arquivo. Ficam como estão os dois alarmes e as duas retenções de 14 dias em `sls/resources`: recursos do CloudFormation não recebem parâmetro por arquivo. Regra no `CLAUDE.md`. |
| Q334 | Mapeamento do item do catálogo | `CatalogItem` (classe em `queries/catalog`) com `static fromCourse`, como as outras 13 respostas do projeto; a função solta `catalogItemOf` saiu. A entidade não conhece formato de resposta. |
| Q335 | Onde entrou a Q334 | Na branch da 3.3, com varredura do projeto atrás do mesmo erro: achados a página pública e o outline (Q336, Q337). |
| Q336 | Página pública com classe | `CoursePageQuery.Page` vira `CoursePage.fromCourse(course, description, outline)`, reaproveitando `CatalogItem.fromCourse` nos campos comuns. Refatoração R.7. |
| Q337 | Outline com classes | `CourseOutline.from(modules, lessons)` (agrupa e ordena na aplicação), `OutlineModule.fromModule(module, lessons)`, `OutlineLesson.fromSummary(summary)`; o `LessonItem` ganha `toSummary`, já que o sumário não tem corpo. Refatoração R.7. |
| Q338 | Quando entra a R.7 | PR à parte, depois do merge da 3.3, com `/code-review` próprio e a regra no `CLAUDE.md`: toda resposta montada a partir de entidade ou item é uma classe com `static from…` em `queries/` ou `usecases/`. |
| Q339 | Teto de concorrência da conta | A conta tem 10 execuções simultâneas de Lambda em `sa-east-1` (padrão de conta nova); uma rajada de 30 buscas deu 10 × 200, 10 × 429 (gateway) e 10 × 503 (Lambda sem concorrência), e o teto é compartilhado por todas as funções. Pedido de aumento para 1.000 aberto no Service Quotas em 2026-10-17 (`L-B99A9384`, pelo perfil admin). Enquanto isso, a rajada da busca cai de 10 para 3 (ritmo 5/s); volta a 10 quando o teto subir. Concorrência reservada não serve: a AWS exige 10 sem reserva. |
| Q340 | Sub-imp da R.7 | a. `CoursePage`; b. `CourseOutline`, `OutlineModule`, `OutlineLesson` e `LessonItem.toSummary` (o `ReorderOutlineUseCase`, que também montava o outline à mão, passa a usar as classes); c. regra no `CLAUDE.md`, `/code-review`, PR. |
| Q341 | Rota da limpeza no roteador | Padrão a mais no filtro: `REMOVE` com `userIdentity` `Service` / `dynamodb.amazonaws.com` (só o TTL) e `OldImage` `Account` `PENDING`. O roteador envia `{ accountId, email, externalId? }` da imagem antiga à fila padrão `coursary-api-<stage>-cognito-cleanup` (DLQ, `maxReceiveCount: 5`, alarme no tópico SNS). Remoções feitas pelo código e a reserva de e-mail ficam de fora. |
| Q342 | Prova de que o usuário é da conta vencida (revê a Q300) | `custom:internalId` do usuário igual ao `accountId` da imagem antiga, e usuário `UNCONFIRMED`. Cobre a conta sem `externalId` (cadastro que falhou depois do `SignUp`). Outro dono ou já confirmado: nada apagado, log `CleanupSkipped` com o motivo. |
| Q343 | Porta e caso de uso da limpeza | `AuthGateway.deleteExpiredSignUp({ email, accountId })` → `'deleted' \| 'not-found' \| 'confirmed' \| 'other-account'` (`AdminGetUser` e `AdminDeleteUser`); `CleanUpExpiredSignUpUseCase` chama e registra. O `deleteUnconfirmedUser` do sign-up fica. |
| Q344 | Variáveis do Cognito por uso (revê a Q325) | `cognitoEnv.yml` vira `cognitoPool.yml` (`COGNITO_POOL_ID`) e `cognitoClient.yml` (`COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`). A limpeza recebe só o pool e tem role própria com `AdminGetUser` e `AdminDeleteUser`. O teste exige o pool em quem usa o `AuthGateway` e o secret só em quem usa operação do app client. |
| Q345 | Varredura de órfãos (Q296) | `sweepUnconfirmedUsers`, chamada à mão: lista os `UNCONFIRMED` do pool e apaga, pelo mesmo caso de uso, os que não têm conta com o mesmo `custom:internalId` (conta vencida lê como ausente). Na implementação, o corte de 3 dias saiu: uma conta válida sempre existe enquanto o usuário é novo, e um órfão novo (compensação que falhou no Cognito) também deve sair. Conta presente em qualquer status protege o usuário. |
| Q346 | Prova em `dev` | Specs do roteador (remoção do TTL e pelo código) e do caso de uso com gateway falso; verificação única em `dev`: cadastro sem confirmar, `expiresAt` no passado, consulta ao Cognito até o usuário sumir, tempo do TTL registrado. |
| Q347 | Sub-imp da 3.4 | a. `cognitoPool.yml` e `cognitoClient.yml`, teste de variáveis; b. `deleteExpiredSignUp` e `CleanUpExpiredSignUpUseCase`; c. filtro e decisão no roteador, `CognitoCleanupQueue`, fila padrão com DLQ e alarme, consumidor com role própria; d. `sweepUnconfirmedUsers`; e. verificação única em `dev`, documentação, quadro, `/code-review`, PR. |
| Q112 | **Princípio: necessidade → implementação** | Nenhuma abstração, operação, índice ou permissão entra antes da história que a usa. `UnitOfWork` e `Saga` nascem no sign-up; `GSI2` com a primeira leitura por e-mail; `GSI1` com a lista do admin; container com o primeiro use case com porta; DynamoDB Local no CI com o primeiro teste de integração. |

#### Fases (Q27)

| Fase | Conteúdo |
|---|---|
| 1 | Tabela, CRUD de curso/módulo/aula, auth completa com grupos, rotas de admin |
| 2 | Matrícula, progresso, avaliações (relações, índices, contadores) |
| 3 | Stream → roteador → SQS → Algolia e e-mails do domínio pelo SES (idempotência, DLQ, redrive nas filas; Q293 a Q305) |
| 4 | Arquivos (avatar, capa, material da aula) com S3 e sharp, CDN para as imagens públicas, consistência do upload com TTL, CSV de alunos |
| 5 | Vídeo das aulas: upload multipart e reprodução por URL pré-assinada (Q54) |
| 6 | Frontend `web` em S3 + CloudFront |
| 7 | Evolução de schema: dividir a partição do catálogo (Q101) |
| Opcional | Google sign-in |

## Épico 0: planejamento e design

Histórias de decisão, antes de qualquer código. Ordem de dependência: PLAN-2 → PLAN-3 → PLAN-4. PLAN-6 corre em paralelo e fecha antes do primeiro commit de código.

| História | Conteúdo | Skills | Estado |
|---|---|---|---|
| PLAN-1 | Escopo e fases | | Feita (Q27) |
| PLAN-2 | Identidade e papéis: Q20, revisão de Q17 e Q18, e-mails (Cognito ou Resend) | `cognito-*` | Feita (Q18, Q20, Q32 a Q45) |
| PLAN-3 | Modelagem de dados: ERD → lista de padrões de acesso → quadro de entidades (PK/SK) → GSIs → desnormalização e contadores → validação percorrendo a lista | `designing-data-models`, `modeling-entity-relationships`, `defining-access-patterns`, `dynamodb-*` | Feita (Q46 a Q86; `docs/data-model.md`) |
| PLAN-4 | Arquitetura de execução: unidade de trabalho, consistência, paginação, stream → SQS, rotas, autorização | `dynamodb-*`, `sqs-*`, `serverless-*`, DI | Feita (Q87 a Q98) |
| PLAN-5 | Registro de achados e critério de pronto das fases | | Feita (Q99 a Q101) |
| PLAN-6 | Padrões do projeto: gerenciador de pacotes, versões fixadas, monorepo ou não, tsconfig, ESLint e Prettier, commitlint e hooks, scripts, CI, documentação | `typescript-*`, `vitest-setup`, `serverless-typescript-esbuild` (nenhuma skill cobre lint ou commitlint: anotar como skill que falta) | Feita (Q102 a Q111) |

## Fase 1: histórias

Quebra aprovada em 2026-10-14, seguindo a Q112. Em 2026-10-15 o sign-up foi dividido em 1.3 (persistência) e 1.4 (Cognito e rota), e as seguintes andaram uma casa. Cada história ganha as sub-imp quando começa, discutidas antes de codar. Durante a 1.3, a Q112 tirou dela a validação e o `esbuild-plugin-tsc` (vão para a 1.4, onde são usados) e a `UnitOfWork`: a conta e a reserva são do mesmo repositório, então a transação fica nele; a `UnitOfWork` nasce com a primeira transação entre repositórios.

| História | Entrega visível | O que nasce nela |
|---|---|---|
| 1.0 | Commit fora do padrão é recusado; CI verde | Ferramental da PLAN-6, teste do TypeScript 7 (Q104) |
| 1.1 | Deploy de `dev` com a tabela | `MainTable` só com `PK`/`SK` |
| 1.2 | `GET /health` responde | `Controller`, adapter HTTP, erros, config por função |
| 1.3 | Conta e reserva de e-mail numa transação, testadas no DynamoDB Local; e-mail repetido recusado | Container com `bind`, entidade `Account`, `AccountItem`, transação no próprio `AccountRepository`, TTL, DynamoDB Local nos testes e no CI |
| 1.4 | Sign-up (`POST /auth/sign-up`) | Validação com Zod, `ApplicationError` → HTTP no adapter, `esbuild-plugin-tsc`, user pool e client com secret, `AuthGateway`, `Saga`, primeira role por função |
| 1.5 | Confirmação e reenvio de código | |
| 1.6 | Sign-in e refresh | Trigger de pre token (o `GSI2` saiu pela Q144) |
| 1.7 | Recuperação de senha | SES e trigger de custom message |
| 1.8 | `GET` e `PATCH /me` | |
| 1.9 | Script do primeiro admin | `RoleChange`, troca de papel numa transação (o módulo de permissões passou para a 1.10, Q171) |
| 1.10 | Rotas de admin: papel, lista, busca por e-mail, histórico (Q178) | `GSI1` (papel), módulo de permissões (Q171), params e query no `Controller`, cursor de paginação |
| 1.11 | Desativar e reativar conta | `AdminDisableUser`/`AdminEnableUser` |
| 1.12 | Sessão única (Q210) | `session` na conta, checagem do `jti` no adapter; saem a sincronização com o Cognito da 1.11 e o sign-out global do reset (Q212) |
| 1.13 | Curso: criar, editar, meus cursos | |
| 1.14 | Módulos e aulas: CRUD e reordenação | `UnitOfWork` (primeira transação entre repositórios: aula + contador do curso) |
| 1.15 | Publicar, arquivar, catálogo, curso completo | Índice esparso do catálogo (`GSI2` num deploy antes do código, Q192) |

Fora da fase 1 de propósito: abrir aula (fase 2, precisa de matrícula) e apagar curso em rascunho (fase 3, usa o job com fila da Q86). As fases 2 a 7 ficam só com título até começarem.

## Fase 2: histórias

Quebra aprovada em 2026-10-15 (Q238), na ordem em que uma depende da outra.

| História | Entrega visível | O que nasce nela |
|---|---|---|
| 2.1 | Matricular, cancelar, rematricular | `Enrollment`, `enrollmentCount` na transação, índice esparso de alunos no `GSI1`, cópia e propagação do `studentName` |
| 2.2 | Minhas matrículas e alunos do curso | `BatchGet` dos cursos (Q80) |
| 2.3 | Abrir aula | Leitura forte da matrícula (8b); página de curso arquivado para matriculados |
| 2.4 | Progresso | `LessonProgress` com put condicional e `completedLessons` na transação; posição no vídeo em item à parte |
| 2.5 | Avaliações | `Review`, `ratingSum`/`ratingCount` na transação, lista pública paginada |

## Próximas perguntas (lista original de 2026-10-12)

| # | Tema | Onde foi resolvido |
|---|---|---|
| 1 | Tabela de chaves | Q71 a Q78; `docs/data-model.md`, seção 3 |
| 2 | Índices | Q75, Q79; seção 4 |
| 3 | Desnormalização | Q80 a Q82, Q85; seção 5 |
| 4 | Contadores | Q83 |
| 5 | Unidade de trabalho e `Saga` | Q87 |
| 6 | Consistência de leitura | Q88 |
| 7 | Paginação | Q89 |
| 8 | Stream e Algolia | Q90, Q91 |
| 9 | Rotas e formato de erro | Q93, Q96 |
| 10 | Autorização | Q94, Q95, Q98 |
| 11 | Evolução de schema (agora fase 7) | Q101 |
| 12 | Fases e critério de pronto | Q27, Q54, Q100 |
| 13 | Registro de achados sobre as skills | Q99 |
| 14 | Custo e capacidade | Q92 |

## O que a exploração do foodiary mostrou

Projeto de referência: o foodiary, uma API anterior do autor no mesmo estilo (lido em 2026-10-12, commit `177be03`).

### Trazer

- `kernel/`: `Registry` (container escrito à mão, cerca de 45 linhas, `reflect-metadata`), `@Injectable`, `@Schema` (Zod por decorator de classe).
- `application/contracts/Controller.ts`: `Controller<'public' | 'private', TBody>`, que tipa `accountId` como `string` ou `null`.
- `main/adapters/lambdaHttpAdapter.ts`, `main/utils/` e o modelo de handler de seis linhas.
- Hierarquia de erros e `ErrorCode`; corpo de erro `{ error: { code, message } }`.
- Padrão `shared/config` (`env.ts` com Zod + `AppConfig` injetável).
- Padrão `*Item`: `static type`, construtores de chave estáticos (`getPK`, `getSK`, `getGSI1PK`, `getGSI1SK`), `fromEntity` / `toEntity`, `id` como atributo próprio, ids KSUID.
- Convenção de repositório: `getPutCommandInput(entity)` exposto para reuso em transação.
- `AuthGateway` e os três triggers do Cognito; authorizer JWT do API Gateway; claim `internalId` (o KSUID próprio é a identidade, o `sub` do Cognito fica só como `externalId`).
- `serverless.yml` enxuto + divisão em `sls/` (config, functions, resources), incluindo `UserPool.yml`, `MainTable.yml` e `CustomDomain.yml`.
- `esbuild.config.mjs` (com `esbuild-plugin-tsc`, necessário para `design:paramtypes`), `tsconfig.json`, ESLint e Prettier.

### Corrigir na entrada

- `UnityOfWork.transactItems` e `Saga.compensations` nunca são limpos, e as instâncias vivem pelo container inteiro: em Lambda quente, uma segunda execução reenvia os itens da primeira.
- A unidade de trabalho só aceita `Put`. Avaliar, e liberar conforme utilizamos.
- Nenhuma condition expression em lugar nenhum; nenhuma paginação (`LastEvaluatedKey` nunca é lido).
- Token do container é `impl.name` com `minify: true` e sem `keepNames`: frágil.
- `application` importa classes concretas de `infra`; as queries falam direto com o `dynamoClient`.
- Unicidade de e-mail é "consulta o GSI, depois grava"; o erro do Cognito vira 500.
- Catches genéricos transformam qualquer erro do Cognito em 401 ou 400.
- `COGNITO_CLIENT_SECRET` exposto a todas as funções; `env.ts` exige todas as variáveis em toda função. *Aqui também ficou exposto até a Q325 (R.6): agora só as funções que chamam o Cognito o recebem, e um teste confere.*
- Uma role IAM única para todas as funções.
- Sem testes, sem scripts de `lint`, `build` ou `deploy`; versão do Serverless Framework não fixada.
- Renomear a função do trigger de pre token generation quebra a ligação manual no `UserPool.yml`.
- Os `CLAUDE.md` e o `README.md` do foodiary estão defasados em relação ao código; confiar no código.

### Não trazer

Entidades e regras do domínio (`Profile`, `Goal`, `Meal`, `GoalCalculator`), `MealsFileStorageGateway` e o bucket S3, o texto e as cores do template de e-mail, a org do Serverless e o sufixo de domínio pessoal do foodiary.

### O que o foodiary não cobre e este projeto precisa

Streams, TTL, delete, batch, paginação, condições, índice esparso, relação N:N, contadores, papéis de usuário, Algolia e testes.

## Skills que o projeto pretende exercitar

- **DynamoDB**: single-table-design, key-design, tables-and-keys, one-to-one, one-to-many, many-to-many, index-overloading, secondary-indexes, denormalization, queries, query-pagination, read-consistency, item-operations, document-client, schema-evolution, capacity-and-pricing, streams, stream-lambda-triggers, stream-event-filters.
- **Algolia**: algolia-indexing-from-dynamodb, algolia-search-api.
- **Serverless**: framework-setup, yml-basics, yml-splitting, lambda-functions, http-api-events, resources-and-iam, environment-variables, stages-regions-variables, typescript-esbuild, packaging, deploy-and-logs, cloudformation-intrinsic-functions.
- **Arquitetura e DI**: typescript-di-container, typescript-decorators-metadata, injecting-dependencies, inverting-dependencies, wiring-dependencies, structuring-use-cases, designing-testable-code.
- **Testes**: vitest-setup, vitest-writing-tests, writing-unit-tests, using-test-doubles, choosing-test-types.
- **Cognito**: user-pools, user-pool-iac, sign-up-and-confirmation, sign-in-and-refresh-tokens, password-reset, custom-message-lambda-trigger, pre-sign-up-lambda-trigger, api-gateway-jwt-authorizer, user-groups, role-based-route-protection, group-management-api. Opcionais: google-identity-provider, oauth-authorization-code-flow, oauth-token-exchange, federated-account-linking.
- **TypeScript**: tsconfig-files-and-strict, target-and-modules, on-node, branded-types, template-literal-and-conditional-types, literal-types-and-const-assertions, enums-and-alternatives, satisfies, narrowing, type-guards-and-assertion-functions, safe-indexed-access.
- **Modelagem**: designing-data-models, modeling-entity-relationships, defining-access-patterns, dynamodb-time-to-live.
- **S3 e uploads**: cloudfront-s3-distribution (imagens públicas), upload-strategies, presigned-post, bucket-cors, event-lambda-trigger, image-processing-sharp, upload-database-consistency, csv-export-from-dynamodb, presigned-download-url, lifecycle-rules; lambda-layers, lambda-native-dependencies. Opcional: multipart-upload.
- **Filas e e-mail**: sqs-queue-settings, sqs-lambda-queues, sqs-dlq-alarms-and-redrive, sqs-idempotent-consumers, dynamodb-streams-low-level-api. O `transactional-email-resend` fica fora (Q294: SES).
- **Frontend (fase 6)**: react-router-*, tanstack-table-*, react-vite-setup, react-query-*, react-hook-form-* (incluindo sortable-field-array), zustand-*, motion-reorder, react-pagination-ellipsis, react-intersection-observer, react-unsaved-changes-warning, multi-step-form-design, react-stepper, hosting-static-frontends, s3-static-site-bucket, cloudfront-*.
- **Testes, extra**: vitest-mock-extended.
- **Fora (outra stack)**: Next.js, Auth.js, Prisma, normalizing-relational-schemas, node-fastify-typescript-setup, react-class-components; dynamodb-search (Q12 fechou só Algolia).