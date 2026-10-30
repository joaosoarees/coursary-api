# Coursary API

API serverless de uma plataforma de cursos (Lambda + DynamoDB single-table). O projeto existe para exercitar as skills instaladas e registrar onde cada uma acerta ou falha.

## Onde está cada coisa

- `PLANNING.md`: todas as decisões, numeradas (Q1, Q2…). Antes de propor algo, confira se já foi decidido.
- `docs/data-model.md`: ERD, padrões de acesso, quadro de entidades, índices, cópias e contadores.
- `docs/system-design.md`: todos os recursos (AWS e externos) e como se comunicam, com diagramas Mermaid; espelhado em https://claude.ai/artifact/QCf14uyJkj4eKMqpy625QZ.
- `docs/skill-findings.md`: achados sobre as skills e skills que faltam.
- `docs/process-log.md`: o método de planejamento, para uma futura skill de projeto novo.
- Quadro de tarefas: https://claude.ai/artifact/2Q6GjZ5cPXusYktJJw4LNj

## Como trabalhar

- **"Começar tarefa X.X"**: atualizar a `develop`, criar `feat/X.X-<slug>` a partir dela, propor as sub-imp e só implementar depois do acordo.
- **Small commits** (pedido do autor em 2026-10-19; um arquivo por commit desde a 3.7, Q374): cada commit muda um arquivo só e compila e passa nos testes sozinho. Para isso, arquivos novos entram primeiro (sem uso ainda), a implementação de um método entra antes da interface que o declara, e o teste de um arquivo vai no commit logo depois dele. Quando dois arquivos não puderem ser separados sem quebrar a compilação (renomear um símbolo usado nos dois), o commit leva os dois e diz por quê. Conventional Commits, em inglês. Nada de commit em `main` ou `develop` (ruleset e hook recusam). Branch, commit, push e PR para a `develop` são livres; **o merge só com a autorização do o autor** (merge commit, sem squash). O `dev` é deployado à mão, pelo workflow `Deploy dev` na `develop`, ao fechar cada história (Q516, Q517).
- **Sem atribuição** (pedido do autor em 2026-10-20, Q376): nenhum `Co-Authored-By` nos commits e nenhuma linha de atribuição ("Generated with…") no corpo ou nos comentários dos PRs.
- **Antes de abrir um PR, passar o `/code-review`** na branch (Q267): corrigir o que ele confirmar em commits novos e citar no corpo do PR o que foi apontado e o que ficou de fora.
- **Skills primeiro.** Antes de codar, liste as skills instaladas que tocam a tarefa (as da história no quadro e qualquer outra cujo nome ou descrição caiba) e leia cada uma **inteira**; siga o que ela manda e, quando o projeto decidir diferente, cite a Qxxx. Biblioteca ou serviço novo entra com a skill de setup dele inteira, não só a instalação. Vale para a sessão principal e para todo agente que ela lançar: o agente recebe este arquivo.
- **Commits passam pelos hooks**: nada de `--no-verify`/`-n`; o CI também roda o commitlint em cada PR.
- **Necessidade → implementação** (Q112): nenhuma abstração, operação, índice ou permissão antes da história que a usa.
- **A aplicação é a fonte da verdade** (Q38): serviços externos ficam atrás de portas.
- **Comentário só quando alguém erraria sem ele** (Q511, Q514): um limite externo, um porquê que o código não mostra, um motivo de segurança. Nunca o que a função ou a linha faz, narração de teste, cabeçalho que repete o nome do arquivo ou citação de decisão (Qxxx: o `PLANNING.md` e o git guardam). Fica: `// S3 refuses a middle part under 5 MiB.`, `// No package cache in the job that holds the deploy role: a poisoned cache would run with it.` Sai: `// Completing twice answers the same without writing (Q9, Q278).`, `// What the route and processUpload leave behind for one sent file.`, `// Every call carries the session cookie (Q467).`
- **Toda resposta que expõe uma entidade ou item (uma visão: item de lista, página, detalhe) é uma classe com `static from…`** (Q334, Q338), em `queries/` (leituras) ou `usecases/` (escritas), como `CourseSummary.fromCourse`. Nada de função solta nem de mapeamento campo a campo dentro de query, use case ou entidade. Resultado curto de operação (`{ id, role }`, `{ accountId, changed }`) fica literal no próprio use case.
- **Configuração repetida entre funções vai para `sls/config/<tema>.yml`** (Q333): variáveis em `environment`, statements de IAM em `statements.<nome>`, referenciados com `${file(./sls/config/<tema>.yml):…}`. Uma função cita o que usa; nenhum ARN ou bloco igual escrito duas vezes em `sls/functions`.
- Toda rota nova entra em `docs/api/coursary-api.postman_collection.json` (importável no Yaak) no mesmo PR.
- Ao fechar uma sub-imp: registrar os achados no quadro e em `docs/skill-findings.md`; atualizar `docs/data-model.md` se alguma chave ou item mudou; atualizar `docs/system-design.md` (e republicar a página) se mudou recurso, fila, função, permissão ou fluxo (Q366).
- Confie no código, não em documentação antiga: nenhum `CLAUDE.md` por pasta (Q107).

## Comandos

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format
pnpm check:bundles   # empacota e carrega cada handler como a Lambda (precisa de credencial AWS)
```
