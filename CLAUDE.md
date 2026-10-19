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
- **Small commits** (pedido do autor em 2026-10-19): um commit por mudança mínima que compila e passa nos testes, nunca uma sub-imp inteira num commit só. Porta, adapter, caso de uso, handler, recurso do `sls`, teste novo e documentação vão em commits separados sempre que der; testes que provam a mudança entram no mesmo commit dela. Conventional Commits, em inglês. Nada de commit em `main` ou `develop` (ruleset e hook recusam). Branch, commit, push e PR para a `develop` são livres; **o merge só com a autorização do o autor** (merge commit, sem squash). O merge na `develop` deploya `dev` pelo CI (Q131).
- **Antes de abrir um PR, passar o `/code-review`** na branch (Q267): corrigir o que ele confirmar em commits novos e citar no corpo do PR o que foi apontado e o que ficou de fora.
- **Necessidade → implementação** (Q112): nenhuma abstração, operação, índice ou permissão antes da história que a usa.
- **A aplicação é a fonte da verdade** (Q38): serviços externos ficam atrás de portas.
- **Comentários só quando muito úteis.**
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
