# Contratos e integração por fronteira

## C1: contrato entre projeto, dados e Admin

Confirme a configuração de usuário antes da aplicação das migrations, a descoberta dos três apps e a ordem de dependências. Confira os models existentes antes de registrar Admin ou referenciar campos em filtros. Integre Jazzmin na ordem de templates correta para a versão adotada. Não crie DRF, CORS, endpoints de sessão ou frontend para antecipar o C2.

A demonstração do C1 deve poder usar base descartável, migrations reais e dados sintéticos. Defina quem cria superusuário, grupos e registros e como repetir o preparo sem depender de dados manuais esquecidos. Não versione a base nem credenciais. Verifique o procedimento do README em vez de documentar comandos presumidos.

Se uma entrega exige alterar arquivo reservado a outro agente, suspenda a escrita simultânea e transfira a responsabilidade. Uma mudança de migration ou dependência depois do teste invalida as conclusões afetadas; apresente a nova versão ao validador.

## C2: contrato mínimo de uma fatia funcional

Crie o documento de contrato apenas quando uma tarefa C2 o exigir. Use a localização existente; se não houver padrão, `docs/contratos/<fluxo>.md` é uma opção. Não gere um catálogo de endpoints futuros como se já existissem.

O contrato da fatia deve conter o necessário para que os dois lados implementem o mesmo comportamento:

| Aspecto | Decisão necessária |
| --- | --- |
| Situação e versão | Proposto ou implementado; arquivos/versão que o sustentam |
| Operação | Rota, método, origem/base URL e finalidade |
| Ator e autorização | Anônimo/autenticado, grupo, propriedade do objeto e campos que não podem ser atribuídos pelo cliente |
| Entrada | Campos, tipos, obrigatoriedade, nulos, enumerações, limites e exemplo sintético |
| Saída | Forma da resposta e campos; lista/paginação somente quando adotada |
| Falhas | Erros de campo e gerais, sessão, permissão, ausência e conflito; status efetivamente acordados |
| Datas | Formato com offset, conversão de fuso e interpretação de `[inicio, fim)` |
| Sessão e CSRF | Emissão de token, cookie/header, credenciais, login/logout e proteção nas escritas |
| Persistência | Efeito esperado, verificação posterior e tratamento de repetição quando pertinente |
| Demonstração | Pré-condições, dados sintéticos, operação e resultado observável |

Prefira comportamento convencional do framework quando suficiente. Não invente um envelope JSON global, status customizado, paginação ou versionamento de API que a tarefa não pede. Mudança de contrato existente exige avaliar quem o consome; ajuste os dois lados na mesma entrega ou marque a dependência.

## Sessão, CSRF e ambiente

A escolha local é sessão/cookie do Django. Prefira requisições de mesma origem ou proxy de desenvolvimento coerente, quando atender ao setup. Se origens diferentes forem necessárias, documente os valores reais de origem, credenciais, cookies e CSRF; configure apenas o que o cenário requer. CORS e CSRF resolvem problemas diferentes.

Confira os nomes de cookie/header do Angular e Django na versão usada. Confirme que o servidor emite o token e protege a entrada de login/cadastro e outras escritas conforme o fluxo. Não assuma que autenticação DRF ou teste de usuário já logado garante CSRF em login. Não adicione JWT, token no armazenamento local ou permissões abertas como atalho.

Teste uma escrita autorizada com sessão/token corretos e a rejeição pertinente sem token. Clientes de teste que relaxam CSRF não provam proteção; o validador deve usar cliente configurado para impor a checagem ou navegador real. Não registre cookies, tokens e senhas nas evidências.

## Disponibilidade e resultado composto

Disponibilidade exibida é uma informação temporal, não uma reserva de estoque. A decisão que altera disponibilidade precisa refazer a validação no servidor. Respostas de conflito devem chegar à interface como conflito compreensível; não apresentar sucesso antes da persistência.

Para aprovações concorrentes ou alterações de reserva aprovada, combine com backend o mecanismo e a prova no banco efetivamente usado. `atomic` e `select_for_update()` não devem ser apresentados como garantia de bloqueio de linha em SQLite. Não migre para outro banco sem necessidade e decisão explícitas.

Um fluxo integrado é demonstrado por ação na interface, requisição real, autorização, persistência e resultado consultável. O caso negativo deve não produzir o efeito proibido. Registrar apenas um status HTTP ou uma tela de sucesso não basta. A tabela de provas em `docs/agentes/protocolo.md` define o alcance de cada evidência.

## Falha e encaminhamento

Reduza uma incompatibilidade a entrada, rota, usuário, resposta e efeito observado. Corrija aqui somente o ponto de ligação atribuído; devolva regra de domínio ao backend e comportamento de componente ao frontend. Evite retries silenciosos que dupliquem escrita. Após ajuste, entregue a nova versão e os critérios afetados ao validador independente.
