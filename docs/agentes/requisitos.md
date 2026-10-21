# Requisitos e provas de aceitação

Base: enunciado de GAC116 fornecido pelo usuário nesta conversa em 19/10/2026. Os IDs abaixo organizam a rastreabilidade; não acrescentam funcionalidades. O escopo detalhado de entidades e as decisões do grupo continuam em [AGENTS.md](../../AGENTS.md). Ajustes posteriores do professor precisam ser registrados como nova informação.

## Exigências gerais do enunciado

| ID | Exigência | Responsabilidade principal | Prova relevante |
| --- | --- | --- | --- |
| TEC-01 | Usar Django e pelo menos dois apps | Backend + integração | Apps reais registrados e utilizados; estrutura e execução |
| BD-01 | Banco relacional com modelagem adequada, tabelas e relacionamentos | Backend | Models, migrations aplicadas, constraints e diagrama coerente |
| AUT-01 | Autenticação por usuário e senha; login, logout e cadastro na versão final | Backend + frontend + integração | Fluxos reais, senha com hash, falhas de credencial e sessão após logout |
| CRUD-01 | Cadastro, consulta, edição e exclusão das entidades principais | Backend + frontend | Persistência e erros coerentes; exclusão pode ser protegida para preservar relações/histórico |
| PER-01 | Perfis distintos e permissões diferentes | Backend | Matriz de ações e provas positivas/negativas no servidor |
| ADM-01 | Área administrativa autenticada, com tema personalizado e filtros | Backend + frontend + integração | Acesso protegido, Jazzmin visível e filtros alterando os resultados |
| USR-01 | Área dos usuários finais protegida por autenticação | Backend + frontend + integração | Anônimo impedido; usuário acessa apenas ações e objetos permitidos |
| NAV-01 | Menus e navegação adequados ao domínio | Frontend | Rotas reais, links válidos e ações coerentes com o papel |
| UI-01 | Framework CSS, responsividade, tema claro/escuro e consistência visual | Frontend | Dependência usada; navegador nos temas e tamanhos da tarefa |
| GIT-01 | Git/GitHub e repositório público | Integração / grupo | Estado remoto consultado; acesso público comprovado |
| GIT-02 | O enunciado original menciona branches literais `main`, `develop`, `feature`; o grupo decidiu usar `main`, `develop` e `feature/*` | Integração / grupo | Referências locais e remotas observadas; conferir a divergência com o professor antes de afirmar cumprimento do enunciado |
| GIT-03 | Todos os integrantes colaboradores e pelo menos dois commits de cada um | Grupo / validador | Colaboradores e histórico real por pessoa; não inventar autoria |
| DOC-01 | README com oito itens mínimos | Integração + donos das partes | Nome, integrantes, descrição, tecnologias, instalação, execução, funcionalidades e estrutura correspondem ao estado entregue |

O enunciado permite Django Admin com Grappelli, Jazzmin, Unfold ou equivalente; proíbe o template padrão. O grupo escolheu Jazzmin. O professor exige framework CSS, sem obrigar Angular; Angular e Bootstrap 5 são decisões do grupo. Não apresentar preferências locais como exigências literais do professor.

### Divergência na convenção de branches

O enunciado original pede uma branch chamada literalmente `feature`. O grupo decidiu adotar `feature/nome-da-funcionalidade`, sempre criada a partir de `develop`, e não criar a branch literal. A decisão organiza o trabalho por funcionalidade, mas diverge do texto original; a conformidade deve ser confirmada com o professor antes da entrega. Não apagar branches remotas nem histórico compartilhado para resolver a colisão de nomes.

## Decisões do grupo, sem nova autorização de execução

- Tema: reservas de ambientes universitários e equipamentos vinculados às reservas; aprovação do professor é uma dependência externa.
- Três apps: `usuarios`, `ambientes`, `reservas`. Modelos, campos, estados e relacionamentos são definidos no AGENTS raiz; não duplicá-los em quatro skills divergentes.
- SQLite inicialmente, ORM/migrations, `Usuario(AbstractUser)` desde a primeira migration, Groups/Permissions e fuso `America/Sao_Paulo`.
- C1: modelagem e Admin/Jazzmin; C2: Angular, Bootstrap, API DRF e fluxos de usuário quando autorizados.
- Solicitante, responsável pelo ambiente e administrador são os papéis previstos. Relação com um ambiente não concede permissão global. O backend impõe os limites por objeto nos fluxos existentes.
- Calendários, notificações, relatórios avançados, deploy, Docker e serviços externos não estão liberados pela criação dos agentes.

## Checkpoint 1 — 05/11/2026, 20 pontos

| ID | Critério | Peso / pontos | Evidência mínima adequada | Papéis |
| --- | --- | --- | --- | --- |
| C1-MOD | Modelagem completa | 20% / 4 | Relações do domínio, integridade, migrations em base limpa e diagrama ER coerente | Backend; validação independente |
| C1-ADM | Admin configurado | 20% / 4 | Autenticação, models registrados, operações autorizadas e dados sintéticos reproduzíveis | Backend + integração |
| C1-TEM | Sistema de template administrativo | 10% / 2 | Jazzmin renderizado no Admin real, recursos carregados e navegação utilizável | Frontend + integração |
| C1-FIL | Diferentes filtros administrativos | 10% / 2 | Dados contrastantes, filtros individuais/combinados e resultado conferido | Backend; navegador/validador |
| C1-REP | Repositório GitHub organizado | 10% / 2 | Público, organização, documentação, branches e histórico observados | Integração + grupo |
| C1-COM | Complexidade | 30% / 6 | Relações significativas, intermediária com quantidade e restrições demonstradas; regras previstas documentadas | Backend + grupo |

Estas são provas operacionais propostas para os itens do enunciado; a avaliação e a nota pertencem ao professor. Quantidade de tabelas, linhas ou testes não mede sozinha complexidade. O C1 não exige a interface Angular pronta. A meta antecipada de dois commits de cada integrante é uma decisão do grupo para não deixar a comprovação para o fim.

Enviar o link do repositório público no Campus Virtual **até 05/11/2026 às 12h00**, horário `America/Sao_Paulo`. Link pronto não prova envio. A sequência C1.01–C1.14 e suas dependências está no AGENTS raiz.

## Checkpoint 2 — 19/11/2026, 25 pontos

| ID | Critério | Peso / pontos | Evidência mínima adequada | Papéis |
| --- | --- | --- | --- | --- |
| C2-AUT | Login, logout e cadastro | 20% / 5 | Cadastro sintético, login, sessão, logout e casos inválidos nos caminhos reais | Backend + frontend + integração |
| C2-BD | Banco integrado ao ambiente administrativo | 20% / 5 | Dados criados/alterados nos fluxos pertinentes persistem e podem ser conferidos no Admin com acesso correto | Backend + integração |
| C2-UI | Framework CSS e interface amigável | 10% / 2,5 | Bootstrap utilizado, fluxo usável, responsividade e temas da exigência geral | Frontend |
| C2-DOC | Documentação | 10% / 2,5 | README completo e procedimento de instalação/execução reproduzido | Integração + grupo |
| C2-COM | Complexidade | 40% / 10 | Regras funcionais do domínio e integração demonstrável, incluindo disponibilidade e autorização | Todos; validador independente |

A versão final deve cumprir também os requisitos gerais, mesmo quando não aparecem como linha isolada dessa tabela. A organização local não altera os pesos do professor.

## Dependências humanas e acadêmicas

Grupo de 2 ou 3 estudantes; o README identifica Marcos Vinícius Pereira, Arthur Soares Marques e Lana da Silva Miranda. Cada um precisa colaborar e realizar commits próprios reais. Não gerar commits com identidade de colega para cumprir quantidade.

Aula para desenvolvimento e dúvidas em 22/10/2026. Apresentações em 05/11 e 19/11, ao professor, no horário de aula, no laboratório ou notebook do estudante. O trabalho vale 45 pontos: 20 + 25. A entrega/apresentação equivale a seis presenças (12 créditos), conforme o texto recebido. Agentes podem preparar o roteiro e conferir evidências; não podem afirmar presença, aprovação do tema, nota ou envio sem prova externa.
