# Catálogo de verificações por risco

Selecione o que comprova a tarefa e a fase. Não cobre C2 em uma entrega C1 nem trate a aprovação de uma etapa como aprovação do checkpoint. Não execute comandos mutáveis em banco compartilhado. Fontes técnicas: `docs/agentes/fontes.md`.

## Preparação e confiança da evidência

Inspecione arquivos e scripts antes de executar. Registre o estado avaliado, inclusive arquivos não rastreados relevantes. Localize ambiente e banco efetivos; uma configuração com nome “test” não prova que o banco é descartável. Prefira cópia isolada da aplicação ou configuração temporária compatível com o setup existente, sem alterar arquivos versionados.

Capture código de saída e resumo de execução. Não aceite “OK” quando o runner descobriu zero testes, o comando escondeu o exit code ou os casos pertinentes foram ignorados. Um teste de fumaça pode passar enquanto a regra alegada não é exercitada: leia os testes relevantes e acrescente uma probe descartável quando necessário.

Um relatório antigo, captura descontextualizada ou declaração de outro agente é um insumo, não prova independente. Se ferramentas/rede não estiverem disponíveis, registre `NÃO VERIFICADO`; se o arquivo obrigatório realmente não existe na versão final avaliada, registre a falha de implementação.

## Modelagem, migrations e banco — C1

- Compare o diagrama e os modelos do AGENTS com código e migrations reais: FKs, intermediária com quantidade, unicidade e política de exclusão.
- Verifique o usuário customizado na migration inicial e a configuração antes do primeiro `migrate` de autenticação. Detecte dependências incoerentes e alterações indevidas de histórico.
- Em base descartável, aplique migrations do zero e confira `showmigrations` quando útil. Aplique sobre uma versão anterior somente quando houver mudança com dados existentes que exija essa prova.
- Rode `check`, detecção de migrations pendentes e testes relevantes. Eles são provas diferentes. Não rode `makemigrations` sem `--check --dry-run` durante auditoria para consertar código alheio.
- Para intervalo e quantidade, inclua valores de fronteira: `inicio == fim`, fim anterior, capacidade zero, estoque zero permitido, quantidade reservada zero rejeitada e par reserva/equipamento duplicado, conforme a tarefa.
- Se a alegação é constraint de banco, tente a persistência inválida em transação de teste; chamar somente `full_clean()` não comprova a constraint. Confira exclusão protegida e preservação de histórico quando forem critérios.

## Admin, filtros e permissões — C1

Confira o redirecionamento/negação apropriado para anônimo e usuário comum e o acesso do staff autorizado. `200` pode ser a página de login ou uma mensagem de erro: confira destino, conteúdo e efeito. Login somente com superusuário não prova as restrições dos outros papéis.

Para uma entidade da tarefa, confira listagem, consulta, cadastro/edição e rejeição de dados inválidos. Para filtros, crie pelo menos valores contrastantes pertinentes e confira o conjunto resultante. A mera presença de `list_filter` ou de um widget não comprova filtragem. Buscas, combinações e inlines entram quando a tarefa os altera.

No navegador, confirme Jazzmin carregado, navegação e recursos estáticos. Screenshot de login não prova o visual da área autenticada. Processo `runserver` ativo não prova que alguém abriu a interface.

Se responsável/solicitante possuem operações expostas no Admin, teste acesso direto a objetos alheios e controles relacionados. Se ainda não há esse fluxo na fase avaliada, não exija um endpoint futuro: registre o escopo e verifique os papéis atualmente expostos.

## Autenticação e autorização — C2 autorizado

Inclua os casos pertinentes: cadastro válido/inválido, credenciais erradas, login, logout, acesso protegido após logout, anônimo e usuário inativo quando aplicável. Confira senha com hash e ausência de autoatribuição de privilégio no cadastro. Não exponha senhas ou cookies nas saídas.

Use dois solicitantes e dois responsáveis com propriedades diferentes. Tente ler/editar/cancelar reserva alheia e decidir solicitação de ambiente alheio nos caminhos existentes. Verifique IDs na URL, payloads e campos de privilégio, não somente menus. Confira persistência para provar que a operação negada não ocorreu.

Para sessão/CSRF, exercite escrita com token válido e caso ausente/inválido. O cliente Django de testes normalmente relaxa CSRF; configure `Client(enforce_csrf_checks=True)` ou prova equivalente. `force_login` serve para certos testes de permissão, mas não demonstra o fluxo de login nem a proteção de suas entradas.

## Disponibilidade — somente no escopo funcional solicitado

- Sobreposição parcial, contenção, intervalo idêntico e horários consecutivos.
- PENDENTE não ocupa definitivamente; aprovação conflitante é negada; REJEITADA/CANCELADA não ocupa. Preserve o histórico definido.
- Edição da própria reserva sem autoconflito; alterações que introduzem conflito precisam falhar quando a operação estiver exposta.
- Bloqueio de ambiente incompatível e equipamentos inativos/sem estoque, conforme o contrato.
- Estoque exatamente no limite e acima; demanda simultânea em segmentos. Exemplo de análise: estoque 5, aprovadas A 10h–11h com 3 e B 11h–12h com 3; nova 10h–12h com 2 cabe em todos os instantes. Não exigir uma política diferente do contrato sem relatar a divergência.
- Para garantia alegada de concorrência, use operações realmente concorrentes em conexões/processos independentes contra base descartável e confira o estado final. Um teste sequencial e `select_for_update()` em SQLite não comprovam a garantia. Se não foi demonstrada, delimite a conclusão.

## Interface e integração — C2 autorizado

Confira o contrato efetivo e o uso da API real. Prove uma alteração pela interface e leia o resultado persistido. Mocks, fallback local, status HTTP e toast de sucesso isolados não demonstram a conexão completa.

Verifique apenas os estados pertinentes da tarefa: carregamento, vazio, erro de formulário, erro geral, conflito, sessão expirada e acesso negado. Confira teclado, foco, labels, telas estreita/ampla e temas claro/escuro para o que foi alterado. Um build não demonstra esses comportamentos; registre limitações se o navegador não estiver disponível.

## GitHub, documentação e entrega acadêmica

Leia o README e confira os oito itens com o estado real, sem tratar planejado como implementado. Reproduza a instalação/execução documentada no ambiente acordado quando for requisito da revisão; não instale ferramentas extras só para uma auditoria de texto.

Consulte o remoto para repositório público e branches obrigatórias. Branches locais e remote-tracking refs antigas não comprovam estado remoto atual. Confira colaboração e commits próprios de cada integrante somente com evidência disponível; se faltou acesso à lista de colaboradores, declare o limite.

Aprovação do tema, envio no Campus Virtual, apresentação e nota são eventos externos. Não marque nenhum deles como ocorrido porque a documentação foi escrita ou o link existe. Não fabrique commits de estudantes nem estime nota como se fosse avaliação do professor.
