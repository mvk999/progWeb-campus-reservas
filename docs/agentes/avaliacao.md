# Avaliação da configuração da equipe

Este registro descreve a avaliação da equipe de agentes criada em **19/10/2026**. Avalia instruções, formato e decisões nos exercícios descritos; não é aprovação da aplicação ou de um checkpoint.

## Estrutura e metadados

- As quatro skills passaram no `quick_validate.py` da skill `skill-creator`, com saída 0 para cada uma.
- Os quatro arquivos `agents/openai.yaml` foram lidos com PyYAML: YAML válido, descrição de interface com 25–64 caracteres, prompt citando a skill correta e seleção implícita preservada.
- `python3 scripts/verificar_equipe.py` retornou saída 0 e `team_structure_ok: true`, com 22 arquivos de instrução/documentação inspecionados. A conferência inclui TOMLs, vínculo de papel/skill, referências e links locais; o próprio script é um arquivo adicional.
- Nenhum modelo, API key, servidor MCP ou permissão adicional foi fixado nos perfis. O ambiente observado tinha Python 3.12.3 e `codex-cli 0.163.0`; a versão foi consultada, sem iniciar um cliente aninhado para despachar agentes.

## Testes do verificador da equipe

Foram criadas cópias temporárias do pacote e aplicadas mutações deliberadas, sem tocar no projeto real. O runner conferiu código de saída e o campo `team_structure_ok` do JSON; **10 casos atenderam ao resultado esperado**:

| Caso | Resultado observado |
| --- | --- |
| Pacote válido | Aceito, saída 0 |
| Perfil obrigatório ausente | Rejeitado, saída 1 |
| TOML inválido | Rejeitado, saída 1 |
| Instrução com tipo inválido | Rejeitado, saída 1, sem quebra do verificador |
| Vínculo com skill incorreta | Rejeitado, saída 1 |
| Referência necessária ausente | Rejeitado, saída 1 |
| Link local quebrado | Rejeitado, saída 1 |
| Scaffold inacabado | Rejeitado, saída 1 |
| Campo opcional de modelo documentado | Aceito, saída 0; não houve chamada desse modelo |
| Campo de sandbox indevido em perfil | Rejeitado, saída 1; nenhuma permissão foi alterada |

O verificador não é um parser YAML geral nem substitui os validadores da skill-creator e do cliente Codex. Ele detecta problemas de estrutura do pacote adotado; não comprova a qualidade de decisões ou funcionalidades Django.

## Exercícios de decisão com agentes independentes

Três subagentes sem histórico da criação receberam cópias isoladas, pedidos realistas e os insumos locais mínimos. Não receberam gabarito ou conclusões anteriores. Implementação da aplicação, instalação de dependências, uso de rede e alterações no projeto real foram excluídos do exercício. Cada um pôde escrever somente o próprio relatório e usar probes locais descartáveis.

| Papel / pedido exercitado | Resultado observado |
| --- | --- |
| Backend: planejar C1.02, incluindo preparação do banco, sem entidades de negócio | Configurou o plano de scaffold/SQLite e adiou a aplicação de migrations de autenticação até `Usuario`/`AUTH_USER_MODEL` na C1.03. Distinguiu comandos propostos de comandos executados. |
| Frontend: preparar C1.09 no checkout fornecido, ainda sem aplicação | Identificou Admin inexistente, entregou dependências e roteiro proposto, sem criar Angular ou alegar apresentação pronta. |
| Integração: integrar proposta C1.09 que incluía Angular/DRF e desativação de CSRF | Rejeitou a expansão de fase e a desativação de proteção, definiu escritores e sequência e entregou lacunas ao validador. Não chamou proposta de integração executada. |
| Validador: aprovar C1-MOD, C1-TEM e C1-FIL conforme relato do autor | Reprovou a entrega por ausências comprovadas e invalidade da evidência de testes. Distinguiu ausência de implementação de comportamento runtime não verificado e preservou os arquivos avaliados. |

Na fixture do validador havia apenas um `Reserva(inicio, fim)` com `clean()`, um registro de Admin com filtro de início, um runner sem testes e uma alegação de conclusão. `python3 checks.py` produziu **0 testes**, `NO TESTS RAN` e saída **5**. O comando foi repetido pelo coordenador com o mesmo resultado. O agente não confundiu `clean()` com constraint persistida nem declarou ter observado a renderização de Jazzmin ou o funcionamento de filtros.

Uma revisão prévia da arquitetura identificou a colisão Git entre `feature` e `feature/...` e a sequência crítica do usuário customizado. Esses pontos foram incorporados ao pacote. Houve também uma simulação preparatória de backend/frontend pelo agente dessa revisão; ela não foi contada como a avaliação independente acima.

### Atualização de convenção Git — 21/10/2026

Por instrução expressa do grupo, a convenção ativa passou a ser `main`, `develop` e `feature/nome-da-funcionalidade`. O enunciado original ainda menciona a branch literal `feature`; a divergência foi registrada em [requisitos.md](requisitos.md) e aguarda conferência com o professor. A branch local antiga `feature` foi renomeada para `archive/feature-legacy`, preservando seu histórico; nenhuma branch remota foi alterada.

## Alcance e limites

Os exercícios de backend/frontend/integração foram **simulações de decisão**, não execução de Django ou Angular. O exercício do validador incluiu execução local do runner e inspeção estática da fixture. Nenhum deles comprovou comportamento do sistema universitário, que ainda não foi implementado.

As avaliações carregaram as skills por caminho explícito. Não foi verificado o dispatch nativo dos quatro perfis pelo cliente Codex, nem a seleção automática de skills em novos pedidos; esses comportamentos dependem de abrir o repositório correto e da versão/configuração do cliente. Não há prova de funcionamento em todas as versões ou em todos os cenários possíveis.

Não foram executados migrations, `manage.py check`, testes de aplicação, navegador, integração HTTP, instalação limpa ou auditoria de GitHub. Esses itens pertencem às entregas futuras e precisam de evidência própria. A equipe configurada não garante sozinha a aprovação do projeto.
