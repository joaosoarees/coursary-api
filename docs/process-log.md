# Registro do processo: como um projeto novo é planejado

Este arquivo guarda o **método**, não as decisões do Coursary (essas ficam em `PLANNING.md`). Ele é a matéria-prima de uma futura skill de "quero criar um projeto novo": cada etapa diz o objetivo, o que precisa estar fechado antes, as perguntas genéricas (com o exemplo do Coursary), as skills que alimentam a etapa, quando pular ou adaptar, e as lições.

Atualizado ao fim de cada história (no Épico 0 e na implementação).

## Regras que valem em todas as etapas

- **Grilling em rodadas.** Cada rodada traz só as perguntas cujos pré-requisitos já estão fechados, numeradas e com uma recomendação. Perguntas que dependem de outra aberta ficam para a rodada seguinte.
- **Ler as skills antes de recomendar.** Fatos (o que existe no ambiente, o que uma skill diz) são trabalho do assistente; decisões são do dono do projeto.
- **Discutir antes de criar.** Nada de arquivo, tarefa ou página sem pedido explícito.
- **Commits pequenos.** Cada decisão fechada entra no documento de planejamento em um commit, com push. O histórico do git é o registro do projeto.
- **Princípios valem mais que recomendações.** Quando o dono declara um princípio (no Coursary: "a aplicação é a fonte da verdade"), registrá-lo como decisão e reabrir as decisões que ele contradiz.

## Etapa 1: objetivo, domínio e superfície

- **Objetivo**: saber por que o projeto existe e como se mede o sucesso.
- **Pré-requisitos**: nenhum.
- **Perguntas**: qual é o objetivo (produto, estudo, prova de conceito)? Qual é o domínio, e por que não outro? Qual é a superfície (só API, API e front, CLI)? Onde roda (local, nuvem real)? Qual é o tamanho e como se divide em entregas? Precisa de autenticação de verdade?
  - *Coursary*: campo de prova das skills; plataforma de cursos (e-commerce descartado por ser o exemplo das próprias skills); API em Lambda; deploy real na AWS; algumas semanas em fases; auth real.
- **Skills**: nenhuma específica. `choosing-rendering-strategy` e `hosting-static-frontends` se houver front.
- **Adaptar**: um projeto que é produto mede sucesso por uso, não por cobertura de skills.
- **Lição**: escolher um domínio que não seja o exemplo das skills evita copiar o exemplo em vez de aplicar a skill.

## Etapa 2: domínio, atores e padrões de acesso iniciais

- **Objetivo**: entidades, atores, ciclos de vida e uma primeira lista de padrões de acesso.
- **Pré-requisitos**: etapa 1.
- **Perguntas**: quem são os atores e o que cada um faz? Qual é a hierarquia das entidades? Que estados uma entidade atravessa? O que fica de fora? Quais leituras cada tela ou rota faz?
  - *Coursary*: aluno, instrutor e admin; Curso → Módulo → Aula; rascunho → publicado → arquivado; 15 padrões de acesso.
- **Skills**: `defining-access-patterns`, `dynamodb-single-table-design`.
- **Lição**: a lista de padrões é revisada na modelagem (etapa 7), depois que o escopo final é conhecido.

## Etapa 3: projeto de referência

- **Objetivo**: decidir se parte de um projeto existente e o que se traz, corrige ou deixa.
- **Pré-requisitos**: etapa 1.
- **Perguntas**: existe um projeto anterior com a mesma stack? O que se reaproveita? Que defeitos dele não podem entrar?
  - *Coursary*: foodiary lido por inteiro; listas "Trazer", "Corrigir na entrada" e "Não trazer".
- **Lição**: confiar no código do projeto de referência, não na documentação dele, que estava defasada.

## Etapa 4: escopo cruzado com as skills instaladas

- **Objetivo**: descobrir o que as skills disponíveis permitem acrescentar ao que já foi combinado.
- **Pré-requisitos**: etapas 1 e 2.
- **Como**: listar as skills instaladas, agrupar por área, e para cada área propor uma funcionalidade real do domínio que a exercite. Marcar as que não encaixam (outra stack) e as que contradizem decisões fechadas.
  - *Coursary*: S3 (capa do curso com sharp, consistência do upload com TTL, CSV), SQS (fila entre o stream e os efeitos), Resend, rotas de admin, frontend, branded types e template literal types. Ficaram fora Next.js, Auth.js, Prisma e busca dentro do DynamoDB.
- **Lição**: as propostas reabrem decisões antigas (no Coursary, "fora: upload" e "só backend"). Listar explicitamente quais.

## Etapa 5: fases

- **Objetivo**: ordenar o escopo em fases entregáveis sozinhas.
- **Pré-requisitos**: etapa 4.
- **Perguntas**: o que entra em cada fase? O que é opcional? Qual é a ordem de dependência?
  - *Coursary*: 6 fases mais um grupo opcional (`PLANNING.md`, Q27).

## Etapa 6: onde ficam as tarefas e o template

- **Objetivo**: decidir a ferramenta e o formato das tarefas.
- **Pré-requisitos**: etapa 5.
- **Perguntas**: onde ficam (Jira, Notion, página do claude.ai, arquivo)? Qual é a hierarquia (épico → história → sub-imp)? Que campos toda história tem?
  - *Coursary*: página do claude.ai com banco de dados; história = entrega visível pela API; sub-imp por camada; campos fase, padrões de acesso, skills (label), critério de pronto; seção "Achados sobre a skill" (Q28, Q29).
- **Lições**:
  - Se o conector do Jira é da conta da empresa, não criar projeto pessoal nele.
  - **Não criar as tarefas das fases antes da modelagem**: elas nasceriam desatualizadas. Primeiro um épico de planejamento (Épico 0) com histórias de decisão.
  - Padrões do projeto (lint, commitlint, CI) entram como uma história de decisão do Épico 0 e como a primeira história de implementação da fase 1.

## Etapa 7: identidade e papéis

- **Objetivo**: decidir quem é o usuário para a aplicação, como se cadastra e como o papel é verificado.
- **Pré-requisitos**: etapas 2 e 4. Vem **antes** da modelagem, porque mexe na entidade de usuário e nos padrões de acesso dela.
- **Perguntas**: qual é o id do usuário (o do provedor ou um próprio)? Onde vive a unicidade do e-mail? Quando nasce o registro do usuário e o que acontece com contas não confirmadas? Como se confirma o cadastro? Quanto dura o token? Onde vive o papel e quanto tempo ele pode ficar desatualizado? Quem envia os e-mails de autenticação?
  - Também: o que o provedor guarda (só credenciais, ou perfil também)? Quem pode escrever cada atributo? O papel é um valor ou uma lista, e há hierarquia? Quem troca papel e com que limites (o próprio, o último admin, auditoria)? O que acontece com os recursos de quem perde o papel?
  - *Coursary*: ver Q18, Q20 e Q32 a Q45 em `PLANNING.md`. Fechada em três rodadas.
- **Skills**: `cognito-user-pools`, `cognito-user-pool-iac`, `cognito-sign-up-and-confirmation`, `cognito-sign-in-and-refresh-tokens`, `cognito-user-groups`, `cognito-role-in-custom-attribute`, `cognito-role-based-route-protection`, `cognito-custom-message-lambda-trigger`, `dynamodb-time-to-live`.
- **Lições**:
  - Uma recomendação feita antes das skills existirem (Q20) mudou quando elas apareceram, e mudou de novo quando o dono declarou o princípio da fonte da verdade. **Perguntar pelos princípios do dono antes das perguntas de identidade**: "o provedor de identidade pode ser trocado?", "quem é a fonte da verdade?".
  - As skills tendem a recomendar o recurso do provedor (grupos, unicidade do Cognito). Pesar isso contra o acoplamento que o dono aceita.
  - **Quando a aplicação é a fonte da verdade, o provedor vira uma réplica que pode divergir.** Toda escrita em dois lugares pede uma pergunta de reconciliação: o que sobra no provedor quando o nosso registro some (no Coursary, o usuário `UNCONFIRMED` depois do TTL)? Prever uma limpeza assíncrona e uma correção no caminho síncrono.
  - Contas não confirmadas que reservam um e-mail são um vetor de bloqueio (alguém cadastra o e-mail de outra pessoa). TTL no registro pendente resolve.
  - Pedir para os handlers perguntarem por **ação**, não por papel, deixa aberto mover papéis e permissões para dados depois (um painel de admin), sem mudar os handlers.

## Etapa 8: modelagem de dados

- **Objetivo**: chegar a um modelo em que todo padrão de acesso é servido sem scan, documentado num arquivo próprio (`docs/data-model.md`).
- **Pré-requisitos**: etapas 4, 5 e 7 (escopo, fases, identidade).
- **Ordem** (`dynamodb-single-table-design`): ERD → lista de padrões de acesso → quadro de entidades → índices → cópias e contadores → validação. Cada passo vira uma seção do documento e um commit.
- **Perguntas por passo**:
  - *ERD*: quais entidades o escopo cria? A quem pertence cada uma quando duas relações competem (no Coursary, a avaliação é do par aluno + curso porque sobrevive ao cancelamento)? O que pode ser apagado e o que acontece com os dependentes? Exclusão física ou lógica?
  - *Padrões*: falta alguma tela ou ação? Quais ordens e filtros ficam no banco e quais vão para a busca? Quais padrões são críticos pela frequência?
  - *Chaves*: posição em atributo ou na chave? Conteúdo grande no mesmo item ou separado? De que lado mora cada relação N:N? Filtro ou índice para listas pequenas?
  - *Índices*: projeção.
  - *Cópias*: para cada valor duplicado, qual é o tipo (exibição, retrato, contador, índice, referência) e quem o mantém?
  - *Validação*: o assistente percorre a lista sozinho e só traz as lacunas como perguntas.
- **Skills**: `designing-data-models`, `modeling-entity-relationships`, `defining-access-patterns`, `dynamodb-single-table-design`, `dynamodb-key-design`, `dynamodb-one-to-many-relationships`, `dynamodb-many-to-many-relationships`, `dynamodb-index-overloading`, `dynamodb-secondary-indexes`, `dynamodb-denormalization`.
- **Lições**:
  - **Ideias de domínio aparecem durante o ERD** (no Coursary: vários arquivos por dono, vídeo como fase própria, versões de curso). Tratar cada uma como pergunta com consequências, e oferecer a versão simples quando a ideia complica demais (as versões foram descartadas).
  - **Mostrar o ERD desenhado**, não só em texto: o dono pediu uma visualização mais clara. No repositório, Mermaid, que o GitHub desenha.
  - **Explicar com itens concretos em JSON** quando a decisão é sobre o formato de um item. "Copiar no AccountItem" só ficou claro com o antes e o depois.
  - **O dono pode rejeitar uma decisão de modelagem que a skill recomenda** (o item de unicidade do e-mail como entidade). Separar o que o dono quer (o e-mail pertence à conta, busca por e-mail) do que o banco exige (um índice nunca é único) e achar o desenho que atende os dois: o item de reserva virou detalhe do repositório.
  - O limite de 100 ações por transação aparece cedo; decidir o padrão "marcar e terminar num job" na modelagem, não na implementação.

## Etapa 9: arquitetura de execução

- **Objetivo**: decidir como o código executa o modelo: transações, leituras, listas, eventos, rotas e autorização.
- **Pré-requisitos**: etapa 8 (o modelo pronto); a validação da modelagem já aponta necessidades desta etapa (no Coursary, o stream com imagem antiga).
- **Perguntas**: como a unidade de trabalho evita estado entre invocações? Onde a leitura precisa ser forte? Qual é o formato do cursor e o tamanho das páginas? Quantos consumidores o stream tem, e o que vai para fila? O que entra no índice de busca? Quais stages existem e o que é protegido em produção? Qual é a lista de rotas? Como a rota declara a permissão, e onde se verifica a posse? 404 ou 403? Formato de erro? Uma função e uma role por rota?
  - *Coursary*: Q87 a Q98, em duas rodadas mais um detalhe de TypeScript.
- **Skills**: `dynamodb-read-consistency`, `dynamodb-query-pagination`, `dynamodb-streams`, `dynamodb-stream-lambda-triggers`, `dynamodb-stream-event-filters`, `algolia-indexing-from-dynamodb`, `sqs-queue-settings`, `structuring-use-cases`, `cognito-role-based-route-protection`, `typescript-enums-and-alternatives`.
- **Lições**:
  - **Um limite de serviço pode desfazer uma decisão de escopo**: "stream → SQS → Algolia" (fase 3) mudou porque o stream aguenta dois consumidores por fragmento; a fila foi para os jobs.
  - **O dono traz preferências de implementação** (enums, manter o `Saga`). Comparar com a skill e mostrar o código das duas formas; a preferência de fundo (constantes nomeadas) cabe no desenho que a skill recomenda.
  - **O ritmo de implementação é decisão do dono**: no Coursary, tarefas pequenas, uma de cada vez, com operações e permissões liberadas conforme o uso. Perguntar isso antes de criar as tarefas.

## Etapa 10: registro de achados e critério de pronto

- **Objetivo**: decidir como o projeto mede o próprio critério de sucesso e quando uma história ou fase está pronta.
- **Perguntas**: onde e em que formato se anota o que cada skill acertou, errou ou não cobriu? O que uma história precisa para estar pronta? E uma fase? Qual mudança real exercita a evolução de schema?
  - *Coursary*: Q99 a Q101; `docs/skill-findings.md` criado já com os achados do planejamento.
- **Lição**: os achados começam no planejamento, não na implementação. Registrar desde a primeira rodada (recomendação da skill contrariada por um princípio, limite de serviço que mudou a topologia).

## Etapa 11: padrões do projeto

- **Objetivo**: fixar ferramentas e convenções antes do primeiro commit de código.
- **Pré-requisitos**: nenhum do modelo; precisa fechar antes da primeira história de implementação.
- **Como**: levantar os fatos antes (ferramental do projeto de referência, versões que as skills testaram, versões instaladas na máquina) e só então perguntar.
- **Perguntas**: monorepo ou repositórios separados? Quais versões ficam fixadas? Qual versão da linguagem, e há risco de compatibilidade? Lint e formatação? Fluxo de git (branch, PR, merge)? Onde fica a documentação? `tsconfig`? Padrão de commit e hooks? CI e deploy?
  - *Coursary*: Q102 a Q111.
- **Lições**:
  - **Um risco de compatibilidade que nenhuma skill responde vira um teste medido na primeira tarefa**, não uma aposta (TypeScript 7 com metadados de decorators, Q104).
  - **O dono pode preferir simplicidade operacional à conveniência** (repositórios separados para não acoplar deploys, Q102). Perguntar pelo deploy futuro antes de propor monorepo.
  - Regras de arquitetura viram regras de lint sempre que possível (`no-restricted-imports` por camada).

## Etapa 12: quebrar uma fase em histórias

- **Objetivo**: transformar uma fase em histórias pequenas, cada uma com uma entrega visível pela API.
- **Pré-requisitos**: o modelo (etapa 8) e as rotas (etapa 9) da fase.
- **Como**: uma história nasce da primeira coisa que a usa (necessidade → implementação, Q112): o índice nasce com a primeira leitura que precisa dele, a unidade de trabalho com a primeira transação entre repositórios, a role por função com a primeira permissão. A ordem segue as dependências. Cada história ganha as sub-implementações só quando começa.
- **Perguntas**: qual é a entrega visível de cada história? O que nasce nela? Que história depende de qual? Uma decisão nova (no Coursary, a sessão única) vira história própria antes da que estava na fila?
  - *Coursary*: fase 1 em 16 histórias (1.0 a 1.15), renumerada três vezes; fase 2 em cinco (Q238).
- **Lição**: renumerar é barato; misturar uma mudança de autenticação dentro de uma história de curso não é. Quando uma decisão muda o que vem a seguir, ela ganha história própria (Q178, Q213).

## Etapa 13: o ciclo de uma história

- **Objetivo**: levar uma história de "começar" a "pronta em `dev`" sem perder decisões nem achados.
- **Pré-requisitos**: a história existe na fase (etapa 12).
- **Passos**:
  1. "Começar tarefa X.X": atualizar a branch de integração e criar a branch da história.
  2. Reler as decisões e as skills apontadas no "Como retomar"; olhar o projeto de referência.
  3. Grilling em rodadas só sobre o que ainda não está decidido; ler fatos no código e nas skills antes de perguntar.
  4. Registrar as decisões num commit; criar as sub-implementações no quadro.
  5. Implementar uma sub-imp por vez, com um ou mais commits pequenos; ao fim de cada uma, anotar os achados no quadro.
  6. Achados no documento de skills, modelo de dados atualizado, estado do planejamento; PR, CI, merge (que deploya `dev`), chamadas reais.
  7. Fechar: PR de documentação com o "Como retomar" apontando para a próxima história.
- **Lições**:
  - **Uma ação de nuvem por operação nova entra no mesmo commit** (Q192): o `ConditionCheck` sem `dynamodb:ConditionCheckItem` passou em todos os testes locais e deu 500 em `dev`.
  - **Índice novo vai num deploy antes do código que o consulta** e é conferido `ACTIVE`: o deploy termina antes do backfill, que levou ~20 minutos numa tabela pequena (Q236).
  - **Provar que um teste de auditoria pega a falha**: tirar a checagem por um instante e ver o teste falhar (mutation check manual).
  - **Um fake que conta operações precisa contar como o real**: o fake de aula devolvia uma operação por movimentação e escondeu o limite de 100 (1.14.e).
  - **Revisar a proposta contra o fluxo real antes de registrar**: a primeira versão da sessão única deixava o dispositivo antigo retomar a sessão; a correção veio antes do código (Q211).
  - **Uma regra que o lint recusa vira desvio registrado**, não briga com a ferramenta (classe só de estáticos, Q191).

## Etapa 14: chamadas reais automatizadas

- **Objetivo**: conferir cada história no ambiente real sem depender do dono para colar tokens e códigos.
- **Pré-requisitos**: um ambiente de `dev` deployado e uma credencial do projeto para administrar o provedor de identidade e a tabela.
- **Como**: um script (`pnpm e2e:dev`) cria contas descartáveis pelas próprias rotas, com endereços de um simulador de e-mail; ativa-as escrevendo o que a confirmação escreve; promove uma a admin pelo script operacional; roda as checagens da história; apaga tudo no fim. Cada história acrescenta os seus casos.
- **Lições**:
  - **O dono não quer ser o operador do teste** ("não vou ficar pegando token e código"). Automatizar na primeira vez que o teste real pede intervenção humana.
  - **Rodar o script contra o ambiente antigo antes do deploy**: falharam exatamente as checagens que a história muda, o que prova que o script mede a mudança.
  - O que o script não alcança (reset de senha, que exige o código do e-mail) fica dito na saída e coberto pelos testes de integração.

## Etapa 15: pausas de revisão

- **Objetivo**: pegar o que saiu "no automático" depois de várias histórias: o que funciona, mas tem forma mais simples, barata ou rápida.
- **Quando**: a pedido do dono, ou ao fim de uma fase.
- **Como**: medir antes de perguntar (arquivos por pasta, recursos no template, versões acumuladas, leituras repetidas) e apresentar cada achado como pergunta com recomendação. As mudanças viram uma história de refatoração própria, sem mudança de comportamento, antes de seguir.
- **Lições** (R.1, Q245 a Q257):
  - **O dono pode recusar as duas alternativas e preferir o que existe** (forma do controller, modelos de resposta). Uma proposta que mexe em gosto vem com protótipo compilado, e "manter" é uma resposta válida.
  - Achados baratos aparecem na medição, não na leitura do código: `versionFunctions` ligado por padrão acumulava uma versão por deploy em 34 funções.
  - A organização de pastas é parte do que o dono chama de "confuso": três convenções para a mesma coisa pesam mais que a escolha entre camada e domínio.
  - **Refatoração mecânica por script, conferida pelo compilador**: mover 62 arquivos e reescrever imports a partir de um mapa único; levar a montagem das fábricas para os arquivos de função; dividir testes por bloco e limpar imports pelo relatório do lint. O typecheck, os testes e o carregamento de cada pacote provam que nada mudou.
  - **Uma pergunta deixada aberta vira uma refatoração curta própria** (R.2, Q258): os fakes de conta saíram num PR só de testes, antes de retomar a história de produto, para que ela não carregasse a mudança.
  - **Varredura de irmãos** (R.3, Q260 a Q267): um agente lê todos os arquivos de cada grupo (itens, repositórios, use cases, controllers, funções, testes) e aponta só o que destoa da maioria, com a contagem. O que é gosto vira pergunta; o resto entra em lote. Achou cerca de 30 desvios que o lint não pega.
  - **Revisão antes do PR**: depois da R.3, todo PR passa pelo `/code-review` antes de abrir.
  - **Auditoria por skill e `/code-review` acham coisas diferentes** (revisão de 2026-10-16, R.4): as quatro auditorias mediram aderência, custo e testes; o `/code-review` do código antigo achou os três bugs de correção (decisões tomadas sobre leitura eventual, perda de atualização). Na pausa de revisão, rodar os dois e juntar numa lista única antes de decidir o escopo. O consolidado fica em `docs/reviews/<data>.md`.
  - **Uma revisão alimenta a quebra da fase seguinte**: as contradições que a análise das skills levantou (Q90, Q170/Q176, Q89, Q37, Q86, Q169) viraram a primeira rodada da quebra da fase 3, antes das histórias.
  - **Segredo: confirmar onde ele aparece, não só onde ele mora** (Q303/Q305): guardar no SSM como `SecureString` não basta se o deploy resolver o valor para dentro do template e das variáveis de ambiente.
  - **Medir antes de cortar** (Q291): a memória das funções saiu da linha `REPORT` do CloudWatch, não de um palpite.
  - **Refatoração "sem mudança de comportamento" ainda pode quebrar o deploy** (Q277): renomear parâmetros de rota passou em todos os testes locais e falhou só no API Gateway. Mudanças em nomes que viram id lógico na IaC precisam de um plano de deploy, não só de testes.
  - **Uma branch anterior à refatoração não é rebaseada; é refeita** (2.1): nova branch da `develop`, os commits de documentação trazidos por cherry-pick e o código portado reescrevendo os caminhos por um mapa, com o commit antigo como referência.
  - **Uma ambiguidade na pergunta aparece na execução** (a Q250 falava dos use cases com transação; o resumo, de "fakes só para o Cognito"): fazer o escopo sem dúvida e perguntar o resto, em vez de escolher em silêncio.
  - **Decisão que cita um recurso da conta confere o teto de permissões antes** (Q303 → Q313): o caminho das chaves no SSM foi decidido sem ler o boundary do `aws/bootstrap.yml`, que só liberava `parameter/coursary-api/*` e não tinha `kms:Decrypt`; só apareceu ao começar a 3.2, depois de as chaves estarem gravadas. Toda decisão que cria nome de recurso (parâmetro, fila, tópico, bucket) passa pelo prefixo e pelas ações do boundary e da role de deploy.

## Etapas seguintes (ainda não percorridas)

16. Criar a skill a partir deste registro (uma para planejar o projeto, etapas 1 a 12; outra para o ciclo de uma história, etapas 13 a 15).
