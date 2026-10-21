# AGENTS.md — Sistema de Reservas de Ambientes e Equipamentos

> Documento de referência obrigatório para integrantes do grupo e assistentes de IA que colaborarem no repositório.
> Disciplina: GAC116 — Programação Web | Trabalho Prático de Implementação com Django | 2026/2.
> **Fase autorizada neste momento: Checkpoint 1 (entrega em 05/11/2026).**

## 1. Objetivo e autoridade deste documento

Desenvolver, de forma colaborativa e incremental, um sistema universitário para gerenciar **reservas de salas, laboratórios, auditórios e equipamentos vinculados às reservas**. Um solicitante poderá reservar um ambiente; um responsável poderá avaliar solicitações; administradores gerenciarão o cadastro e a operação do sistema.

O projeto deve cumprir o enunciado oficial da disciplina. Este arquivo detalha como executar o trabalho, mas **não substitui o enunciado nem a aprovação do tema pelo professor**. Em caso de conflito, prevalece o enunciado; decisões de escopo que alterem este documento devem ser discutidas com o grupo.

**Instrução central a qualquer IA:** trabalhe apenas na tarefa solicitada e na fase autorizada; não implemente o sistema inteiro de uma vez, não antecipe o Checkpoint 2 e não transforme uma solicitação pontual em refatoração geral.

## 2. Tecnologias obrigatórias e decisões de arquitetura

| Camada | Tecnologia/decisão | Regra |
| --- | --- | --- |
| Backend | **Python + Django** | Obrigatório; Django não pode ser substituído por FastAPI, Flask, Node.js etc. |
| Organização do backend | **Arquitetura MVT do Django** | Usar models, views e templates para a área administrativa do Django; preservar a organização do framework. |
| API para a futura interface | Django REST Framework (DRF) | Planejado para o Checkpoint 2; **não implementar agora**. |
| Banco de dados | **SQLite, banco relacional**, com ORM e migrations do Django | Escolha inicial para execução local simples. Não trocar por MongoDB, Firebase ou outros bancos não relacionais. |
| Interface dos usuários finais | **Angular** | Tecnologia obrigatória escolhida pelo grupo para a fase de interface, no Checkpoint 2. |
| Framework de CSS | **Bootstrap 5** | Angular é um framework frontend, **não é um framework CSS**. O uso de Bootstrap atende à exigência de CSS do professor. |
| Interface responsiva | Recursos do Bootstrap + CSS próprio mínimo | Obrigatória na versão final. |
| Temas | Claro e escuro | Obrigatórios na versão final; padronizar cores e componentes. |
| Área administrativa | **Django Admin com Jazzmin** | Obrigatório personalizar: o template padrão do Django Admin é proibido. Verificar compatibilidade das versões antes de instalar. |
| Autenticação | Usuário e senha com sistema nativo do Django | Obrigatória; nunca armazenar senhas em texto puro. |
| Controle de versão | Git + GitHub | Repositório público, colaboração real, branches e commits incrementais. |

**Observação arquitetural:** a aplicação terá **Django no backend** e **Angular para a interface do usuário final**. O Django Admin utiliza os templates do Django e satisfaz a parte administrativa em MVT. A interface Angular consumirá endpoints do Django na fase 2. Não tentar fazer o Angular substituir o Django nem construir outro backend. Preferir autenticação por sessão/cookie do Django, com proteção CSRF, quando essa integração for implementada; não adicionar JWT ou complexidade de infraestrutura sem necessidade demonstrada.

**Limite temporal:** a decisão de usar Angular e Bootstrap deve constar do planejamento, mas **não autoriza construir telas Angular, API REST, login ou cadastro durante o Checkpoint 1**, salvo nova instrução expressa do grupo.

## 3. Escopo funcional do sistema completo (referência; não implementar tudo agora)

### 3.1 Perfis previstos

- **Administrador:** gerencia usuários, ambientes, categorias, equipamentos, bloqueios e reservas; utiliza o Django Admin personalizado.
- **Responsável pelo ambiente:** consulta e decide solicitações de ambientes sob sua responsabilidade, dentro das permissões concedidas.
- **Solicitante:** consulta a disponibilidade, solicita reservas, visualiza suas próprias solicitações e pode cancelá-las conforme as regras.

Implementar os perfis com **Groups e Permissions do Django**, evitando manter duas fontes conflitantes de verdade (por exemplo, um campo `perfil` e um `Group` com valores divergentes). O vínculo `Ambiente.responsavel` identifica quem administra cada espaço, mas **não concede, sozinho, poderes globais de administrador**. Verificações por objeto deverão garantir que o responsável só atue sobre seus ambientes e que o solicitante só acesse suas reservas.

### 3.2 Funcionalidades previstas

- Autenticação com login, logout e tela de cadastro.
- CRUD das principais entidades.
- Consulta de ambientes e equipamentos.
- Solicitação, aprovação, rejeição, cancelamento e consulta de reservas.
- Controle de indisponibilidade e prevenção de sobreposição de horários.
- Administração protegida, personalizada e com filtros.
- Área do usuário protegida, menus coerentes, layout responsivo, tema claro e tema escuro.

Recursos como calendário interativo, gráficos, envio de e-mail, notificações, relatórios avançados e implantação em nuvem **não são prioritários**. Não adicioná-los por iniciativa própria.

## 4. Modelagem obrigatória para o Checkpoint 1

A modelagem deve estar **completa para o escopo planejado**, com tabelas, relacionamentos, migrations aplicáveis e documentação. Usar **pelo menos dois apps Django**; a estrutura acordada é:

```text
projeto/
├── config/                  # settings, urls, configuração principal
├── usuarios/                # usuário e gestão de grupos/permissões
├── ambientes/               # categorias, ambientes e equipamentos
├── reservas/                # reservas, itens reservados e bloqueios
├── docs/                    # modelagem e decisões técnicas
├── requirements.txt
├── manage.py
├── .gitignore
├── README.md
└── AGENTS.md
```

A pasta `frontend/` (Angular) **fica reservada para o Checkpoint 2**; não é necessária agora.

### 4.1 Entidades mínimas e campos fundamentais

| App | Entidade | Campos e observações essenciais |
| --- | --- | --- |
| `usuarios` | `Usuario` | Usuário customizado herdando de `AbstractUser`, definido **antes da primeira migration**, com identificadores e dados nativos de autenticação. Os perfis são `Groups`. |
| `ambientes` | `CategoriaAmbiente` | `nome` único e `descricao`. |
| `ambientes` | `Ambiente` | `codigo` único, `nome`, `descricao`, `localizacao`, `capacidade`, `ativo`, `categoria` (FK), `responsavel` (FK para usuário). |
| `ambientes` | `CategoriaEquipamento` | `nome` único e `descricao`. |
| `ambientes` | `Equipamento` | `codigo` único, `nome`, `descricao`, `quantidade_total`, `ativo`, `categoria` (FK). Representa estoque compartilhado. |
| `reservas` | `Reserva` | `solicitante` (FK), `ambiente` (FK), `inicio`, `fim`, `status`, `observacoes`, `criado_em`, `atualizado_em`, campos opcionais de decisão (`avaliado_por`, `avaliado_em`, `justificativa`). |
| `reservas` | `ReservaEquipamento` | Tabela intermediária entre `Reserva` e `Equipamento`, com `quantidade` positiva e combinação `(reserva, equipamento)` única. |
| `reservas` | `BloqueioAmbiente` | `ambiente` (FK), `inicio`, `fim`, `motivo`, `criado_por` (FK). Indica manutenção ou indisponibilidade do espaço. |

### 4.2 Relacionamentos e regras de integridade

- `Usuario 1:N Ambiente` (responsável) e `Usuario 1:N Reserva` (solicitante).
- `CategoriaAmbiente 1:N Ambiente`; `CategoriaEquipamento 1:N Equipamento`.
- `Ambiente 1:N Reserva` e `Ambiente 1:N BloqueioAmbiente`.
- `Reserva N:N Equipamento` **por meio de `ReservaEquipamento`**, com quantidade solicitada.
- `Reserva.status`: **PENDENTE, APROVADA, REJEITADA, CANCELADA, CONCLUIDA**. Padrão: `PENDENTE`.
- Uma reserva deve ter `inicio < fim`; um bloqueio também deve ter `inicio < fim`.
- Capacidade e quantidades devem respeitar os limites coerentes: `capacidade >= 1`, `quantidade_total >= 0`, `ReservaEquipamento.quantidade >= 1`.
- Manter códigos únicos e restrição de unicidade para itens repetidos da mesma reserva.
- Usar chaves estrangeiras, índices e políticas `on_delete` deliberadas; evitar exclusão em cascata que apague históricos relevantes. Considerar `PROTECT` para entidades referenciadas por reservas.
- Trabalhar com datas e horas conscientes de fuso (`USE_TZ=True`); documentar o fuso de exibição como `America/Sao_Paulo`.
- Registrar migrations no Git. **Não editar uma migration aplicada por outros integrantes nem apagar dados para corrigir erros sem aprovação.**

### 4.3 Política de disponibilidade prevista

Estabelecer a seguinte regra de intervalo: duas reservas se sobrepõem quando `inicio_existente < fim_novo` **e** `fim_existente > inicio_novo`. Horários consecutivos (por exemplo, 14h–16h e 16h–18h) são permitidos.

- Reservas **APROVADAS** ocupam o ambiente no intervalo correspondente.
- Bloqueios impedem a aprovação de reservas incompatíveis.
- Solicitações **PENDENTES** não consomem definitivamente a disponibilidade; duas solicitações podem disputar um mesmo horário, mas não podem ser aprovadas ambas.
- Reservas **REJEITADAS** ou **CANCELADAS** não ocupam horários; `CONCLUIDA` mantém valor histórico e não deve ser apagada.
- Para equipamento compartilhado, a soma das quantidades aprovadas em intervalos sobrepostos não poderá superar o estoque total.
- Validar mudanças de status e permissões no backend, nunca exclusivamente no frontend.

**Checkpoint 1:** implementar no mínimo as validações de integridade locais ao modelo e testes correspondentes. Se o grupo tiver concluído os itens obrigatórios, poderá demonstrar uma validação simples de conflito via backend/admin para reforçar a complexidade, **sem iniciar a API nem a interface Angular**. Conflitos de concorrência e transações de aprovação serão tratados na implementação funcional posterior.

## 5. Escopo AUTORIZADO: somente Checkpoint 1 — 05/11/2026

O Checkpoint 1 vale **20 pontos**, distribuídos da seguinte forma:

| Item exigido | Peso | Pontos | Evidência exigida |
| --- | ---: | ---: | --- |
| Modelagem completa do banco de dados | 20% | 4 | Models, relações, constraints, migrations e diagrama ER documentado. |
| Ambiente administrativo configurado | 20% | 4 | Django Admin acessível com autenticação, models registrados e dados de demonstração. |
| Template do ambiente administrativo | 10% | 2 | Jazzmin ativo e visualmente verificável (não usar Admin padrão). |
| Diferentes filtros no Admin | 10% | 2 | `list_filter` de múltiplas entidades, filtros realmente funcionando. |
| Repositório organizado no GitHub | 10% | 2 | Repositório público, branches e histórico incremental visível. |
| Complexidade do projeto | 30% | 6 | Relacionamentos significativos, tabela intermediária, restrições, regras de disponibilidade documentadas e, se possível, validações demonstráveis. |

**Prazo formal:** enviar o link do repositório público no Campus Virtual **até 05/11/2026, às 12h00**. A apresentação ocorre em 05/11/2026, ao professor, nos computadores do laboratório ou em notebook do estudante. Há aula destinada a dúvidas em **22/10/2026**.

### 5.1 Permitido nesta fase

1. Criar e configurar o projeto Django, ambiente Python e dependências essenciais.
2. Criar `usuarios`, `ambientes` e `reservas` como apps Django.
3. Definir `AUTH_USER_MODEL` antes das primeiras migrations.
4. Implementar todas as entidades, relacionamentos, restrições e migrations.
5. Configurar SQLite como banco **relacional** via ORM do Django.
6. Configurar o Django Admin com Jazzmin, autenticação, registro de models, colunas e filtros úteis.
7. Implementar `ModelAdmin` com `list_display`, `list_filter`, `search_fields`, `ordering` e `inlines` quando fizer sentido.
8. Criar grupos/permissões iniciais e um procedimento reproduzível para popular dados de demonstração, **sem versionar senhas reais**.
9. Escrever testes de modelos, integridade, acesso ao Admin e validações básicas.
10. Manter `README.md`, `.gitignore`, `requirements.txt`, diagrama ER e documentação das decisões coerentes com o estado real do projeto.
11. Organizar branches e commits no Git, com colaboração de todos os integrantes.

### 5.2 NÃO implementar nesta fase

- Frontend Angular, componentes visuais de usuário, páginas de login/cadastro ou Bootstrap da área do usuário.
- API REST com DRF, serializers, endpoints de frontend, CORS ou autenticação para SPA.
- Dashboards, calendários interativos, gráficos, notificações, e-mails ou geração de relatórios.
- Deploy, Docker, integrações externas, pagamentos ou serviços em nuvem.
- Fluxos completos de aprovação/cancelamento para usuários finais e todas as regras transacionais do Checkpoint 2.
- Funcionalidades não previstas neste arquivo sem aprovação do grupo.

**Não confundir planejamento com implementação:** a documentação deve descrever o que está previsto, diferenciando claramente o que já foi concluído.

## 6. Plano incremental de execução do Checkpoint 1

**Cada etapa abaixo deve ser solicitada e implementada separadamente**, em mudanças pequenas e verificáveis. Não executar várias etapas automaticamente porque uma IA recebeu acesso ao repositório.

| Etapa | Tarefa delimitada | Critério de conclusão |
| --- | --- | --- |
| **C1.01** | Preparar repositório, `.gitignore`, `AGENTS.md`, README inicial e branches obrigatórias. | Organização mínima publicada e instruções consistentes. |
| **C1.02** | Criar projeto Django, configurar SQLite, fuso horário e apps. | `manage.py check` funciona; sem entidades de negócio ainda. |
| **C1.03** | Criar `Usuario` customizado e configurar autenticação nativa no backend. | `AUTH_USER_MODEL` correto; migrations limpas; superusuário pode ser criado. |
| **C1.04** | Criar categorias e `Ambiente` com relacionamentos e constraints. | Models e migrations validados. |
| **C1.05** | Criar `Equipamento` e categoria de equipamento com constraints. | Models e migrations validados. |
| **C1.06** | Criar `Reserva`, status e relacionamentos com usuário e ambiente. | Models e migrations validados. |
| **C1.07** | Criar `ReservaEquipamento` e `BloqueioAmbiente`. | Tabela intermediária e bloqueios com integridade validada. |
| **C1.08** | Registrar e configurar todos os modelos no Django Admin. | Cadastros e consultas disponíveis pelo Admin autenticado. |
| **C1.09** | Instalar/configurar Jazzmin compatível com Django. | Template customizado visível e Admin funcional. |
| **C1.10** | Adicionar filtros, buscas, colunas e, quando útil, inlines no Admin. | Filtros utilizáveis para reservas, ambientes, equipamentos e bloqueios. |
| **C1.11** | Preparar grupos/permissões e dados de demonstração reproduzíveis. | É possível reproduzir cenário de apresentação em uma base limpa. |
| **C1.12** | Testar modelos, integridade, Admin e políticas básicas. | Testes e `manage.py check` passam. |
| **C1.13** | Documentar diagrama ER, setup, decisões e roteiro de demonstração. | README e docs correspondem ao código real. |
| **C1.14** | Revisão integrada do checkpoint e conferência do GitHub. | Itens de avaliação verificáveis e link público pronto para entrega. |

Essas etapas são **marcos de trabalho, não commits obrigatoriamente únicos**. Uma etapa pode exigir vários commits pequenos, mas um commit não deve misturar assuntos independentes. Se um problema anterior impedir a etapa atual, corrigir só a dependência necessária e informar a razão.

**Ordem de dependências:** não criar as migrations de reservas antes de estabilizar a entidade de usuário e os modelos de ambiente/equipamento; não configurar o Admin de uma entidade antes de ela existir; não iniciar interface/API enquanto o Checkpoint 1 estiver em andamento.

## 7. Regras obrigatórias para IAs e integrantes

### 7.1 Antes de qualquer alteração

1. Ler este `AGENTS.md`, o `README.md` e os arquivos diretamente ligados à tarefa.
2. Identificar a etapa `C1.xx` solicitada e verificar o que já está implementado.
3. Conferir a branch atual e se há alterações não commitadas de outros integrantes.
4. Planejar **a menor alteração capaz de concluir a tarefa**.
5. Se houver divergência entre a implementação e este documento, relatar a divergência antes de alterar arquitetura, entidades ou regras de negócio.

### 7.2 Durante a implementação

- Alterar somente arquivos necessários à tarefa. Não reescrever o projeto, trocar tecnologias ou reorganizar apps sem autorização.
- Seguir convenções do Django e Python; nomes de apps e modelos consistentes, código claro e sem abstrações desnecessárias.
- Manter configurações e segredos fora do repositório. Não publicar `.env`, `db.sqlite3`, `venv/`, `node_modules/`, credenciais ou chaves.
- Para alterações de modelos, criar migrations explícitas e conferir se aplicam em uma base limpa.
- Preferir regras de integridade no banco e validações de domínio no backend. Não depender de comportamento do Angular para proteger dados.
- Testar a parte alterada; não afirmar que um teste passou sem executá-lo.
- Não preencher lacunas com funcionalidades inventadas. Adições devem ter relação direta com o enunciado e com a etapa solicitada.
- Tratar o Django Admin como ambiente administrativo real: proteger o acesso, usar permissões adequadas, filtros e personalização visual.
- Nunca remover código ou migrations de colegas apenas para fazer uma mudança passar.

### 7.3 Ao concluir a tarefa

Informar objetivamente:

1. Etapa executada e arquivos alterados.
2. Funcionalidade concluída e qualquer decisão técnica relevante.
3. Comandos de validação executados e seus resultados.
4. Commit(s) criado(s), com mensagem e hash, **se estiver autorizado a efetuar commits**.
5. Pendências ou riscos reais, sem iniciar automaticamente a próxima etapa.

Se a tarefa solicitada exigir algo do Checkpoint 2, **não implementar**: explicar que está fora do escopo ativo e aguardar uma atualização explícita deste documento.

## 8. Git, branches e convenção de commits

### 8.1 Organização de branches

O projeto usa o padrão `main`, `develop` e `feature/nome-da-funcionalidade`:

- `main`: branch principal, com versões estáveis e integradas. Agentes não fazem commits nem push diretamente nela.
- `develop`: branch de integração, que recebe funcionalidades revisadas e aprovadas. Agentes não fazem commits nem push diretamente nela.
- `feature/*`: branches de desenvolvimento, uma por funcionalidade ou etapa, criadas a partir de `develop`. Os agentes podem implementar e fazer commits nelas; a integração em `develop` ocorre depois, mediante revisão.

Exemplos válidos: `feature/configuracao-inicial`, `feature/estrutura-django`, `feature/usuarios`, `feature/cadastro-ambientes`, `feature/equipamentos`, `feature/reservas`, `feature/admin`, `feature/filtros-admin` e `feature/testes-backend`.

**Regras obrigatórias:**

1. Use sempre `feature/nome-da-funcionalidade`; não crie uma branch chamada apenas `feature`.
2. Nunca crie branches com prefixo `codex/`.
3. Toda branch `feature/*` deve partir de `develop`. Reutilize uma feature apropriada existente quando isso for seguro.
4. Nunca implemente diretamente em `main` ou `develop`, nem faça push diretamente para essas branches.
5. Não faça merge automaticamente. A integração será realizada posteriormente pelo grupo, mediante revisão.
6. Não use `git push --force`, `git reset --hard` ou rebase destrutivo.
7. Não descarte, sobrescreva ou atribua artificialmente alterações, autores ou datas de commits.
8. Se encontrar uma branch antiga chamada literalmente `feature`, reconheça a colisão de nomes com `feature/*`. Não exclua branches remotas nem histórico compartilhado sem autorização específica.
9. Commits em branches `feature/*` são permitidos quando autorizados na tarefa. Faça-os incrementalmente, após unidades lógicas reais, coesas e verificáveis.
10. Se o remoto estiver configurado e não houver impedimento, a branch `feature/*` pode ser publicada; nunca publique diretamente em `main` ou `develop`.

**Divergência a conferir com o professor:** o enunciado original menciona uma branch denominada literalmente `feature`. O grupo decidiu usar `feature/*` para permitir branches por funcionalidade. Esta convenção orienta o trabalho local, mas não deve ser apresentada como cumprimento confirmado do requisito original até que a divergência seja conferida com o professor.

**Fluxo de desenvolvimento:**

1. Partir da branch `develop`.
2. Criar ou reutilizar uma branch `feature/nome-da-funcionalidade` apropriada.
3. Implementar a funcionalidade em pequenas unidades.
4. Executar verificações pertinentes e realizar commits incrementais autorizados.
5. Solicitar validação ao agente `campus_validador`.
6. Corrigir possíveis problemas e registrar as correções.
7. Encerrar a tarefa mantendo a branch separada, sem realizar merge.

Todos os integrantes devem ser colaboradores do repositório público e realizar pelo menos dois commits próprios, reais e relevantes durante o desenvolvimento.

### 8.2 Commits pequenos e incrementais

Usar o padrão **Conventional Commits**:

```text
feat: adiciona modelo de ambiente
feat: relaciona reservas aos solicitantes
fix: corrige validacao de intervalo da reserva
refactor: simplifica configuracao do admin de reservas
test: cobre restricao de quantidade reservada
docs: documenta entidades no diagrama ER
chore: configura gitignore e dependencias
```

Prefixos aceitos: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `build:`, `ci:` e, quando apropriado, `perf:`. **Para correção de bug usar `fix:`**, não um tipo `bug:`.

Regras:

- **Nunca criar um commit único com todo o projeto.**
- Um commit deve conter **uma alteração lógica** e ser fácil de revisar ou reverter.
- Não misturar models, frontend, documentação irrelevante e personalização do Admin em um único commit.
- Commits devem descrever mudanças que realmente ocorreram; não gerar commits vazios só para atingir quantidade.
- Usar `git status` e revisar o diff antes de commitar; adicionar somente arquivos pertinentes (`git add <arquivos>` quando possível).
- Não utilizar `git push --force`, `reset --hard`, rebase destrutivo ou sobrescrita de alterações compartilhadas sem consentimento.
- Não commitar alterações produzidas por outra pessoa como se fossem próprias.
- Quando uma IA estiver encarregada de um commit, ela deve criá-lo **apenas se houver autorização operacional e se o ambiente permitir**. Caso contrário, propor a mensagem e os arquivos para revisão humana.

## 9. Critérios de qualidade e aceitação do Checkpoint 1

Antes de declarar esta fase pronta, verificar:

- [ ] O professor aprovou o tema (dependência externa).
- [ ] Projeto com Django e **três apps** (`usuarios`, `ambientes`, `reservas`).
- [ ] Banco **SQLite relacional** configurado e migrations versionadas/aplicáveis.
- [ ] Usuário customizado definido corretamente desde a primeira migration.
- [ ] Entidades e relacionamentos da seção 4 implementados, coerentes e documentados em diagrama ER.
- [ ] Restrições básicas e testes de integridade existentes.
- [ ] `python manage.py check` e `python manage.py test` executam sem erros.
- [ ] `python manage.py migrate` funciona em base limpa.
- [ ] Django Admin protegido, com usuários autorizados.
- [ ] Django Admin **personalizado com Jazzmin**, não padrão.
- [ ] Models registrados com listagens, pesquisas e diferentes filtros testados.
- [ ] Há maneira documentada de criar superusuário e dados de demonstração.
- [ ] `README.md` explica nome da aplicação, integrantes, descrição, tecnologias, instalação, execução, funcionalidades e estrutura (distingue implementado de planejado).
- [ ] `.gitignore` evita versionar segredos, base local e arquivos gerados.
- [ ] GitHub público com `main`, `develop` e branches `feature/*`, colaboradores e histórico incremental.
- [ ] Divergência entre a branch literal `feature` citada no enunciado e a convenção do grupo `feature/*` conferida com o professor.
- [ ] Funcionalidades desenvolvidas em branches `feature/*`, com commits incrementais e sem merges automáticos.
- [ ] Cada integrante possui ao menos dois commits significativos durante o desenvolvimento (meta antecipada para esta fase).
- [ ] Roteiro de apresentação evidencia modelagem, Admin, tema, filtros e complexidade.
- [ ] Link do GitHub enviado no Campus Virtual até **05/11/2026 às 12h00**.

### Comandos mínimos esperados para verificação

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py test
python manage.py runserver
```

O comando `runserver` é usado para inspecionar o Admin no navegador. A execução pressupõe ambiente virtual e dependências previamente instalados, conforme o `README.md`.

## 10. Requisitos reservados para o Checkpoint 2 — NÃO EXECUTAR AGORA

**Data: 19/11/2026 | Valor: 25 pontos.** Esta seção existe somente para evitar decisões estruturais que dificultem a fase seguinte:

- Login, logout e cadastro pelo usuário final (**20% = 5 pontos**).
- Banco de dados integrado ao ambiente administrativo (**20% = 5 pontos**).
- Interface amigável com **Angular + Bootstrap**, responsiva, com tema claro/escuro (**10% = 2,5 pontos**, além das exigências gerais de interface).
- README e documentação completos (**10% = 2,5 pontos**).
- Regras de negócio funcionais e complexidade demonstrável (**40% = 10 pontos**).
- CRUD da área do usuário e permissões por perfil, consumo da API Django, solicitação/aprovação/cancelamento de reservas e validação efetiva de disponibilidade.

**Só liberar esse desenvolvimento após conclusão e revisão do Checkpoint 1 e autorização explícita do grupo.** Não criar arquivos ou dependências do frontend apenas por estarem previstos aqui.

## 11. Regra final para execução por IA

Ao receber uma tarefa, o agente deve responder com uma implementação limitada à etapa solicitada, testável e compatível com este documento. Se a solicitação for genérica, como “continue o projeto”, escolher **somente a próxima etapa `C1.xx` ainda não concluída**, informar qual foi escolhida e executar apenas ela, com alterações e commits pequenos quando autorizados. **Jamais gerar todo o projeto de uma vez, antecipar fases, simular testes ou afirmar que algo está concluído sem evidência.**


## 12. Agentes e skills do projeto

A equipe local está definida em `.codex/agents/`, com skills em `.agents/skills/`:

| Agente | Skill | Responsabilidade |
| --- | --- | --- |
| `campus_backend` | `$campus-backend` | Models, migrations, domínio e Admin funcional. |
| `campus_frontend` | `$campus-frontend` | Apresentação Jazzmin no C1; Angular/Bootstrap no C2 autorizado. |
| `campus_integracao` | `$campus-integracao` | Dependências, contratos, configuração compartilhada e ligação das entregas. |
| `campus_validador` | `$campus-validador` | Reprodução independente e evidências por requisito, sem corrigir silenciosamente a implementação. |

Ao usar esses papéis, ler [docs/agentes/protocolo.md](docs/agentes/protocolo.md). O agente principal coordena; delegar partes independentes quando isso ajudar a tarefa e respeitar os slots reais da sessão. Não é necessário ativar os quatro agentes para toda alteração. Se delegação não estiver disponível, declarar a execução sequencial e a ausência de revisão independente.

Definir tarefa, fase, dependências, arquivos de escrita e critérios antes de delegar. Um único escritor por arquivo e mutações compartilhadas em sequência. A entrega do autor passa pela integração quando necessário e pelo validador na versão estabilizada. Usar a matriz [docs/agentes/requisitos.md](docs/agentes/requisitos.md) para distinguir exigências do professor, decisões do grupo e provas de aceitação.

Criar esta equipe não autoriza executar etapas da aplicação nem iniciar o C2. Não aplicar migrations de autenticação na etapa C1.02 antes de definir `Usuario` e `AUTH_USER_MODEL` na C1.03. O frontend pode aguardar uma dependência real; não criar Angular para mantê-lo ocupado. O validador só aprova o que demonstrou, com limites e evidências registrados.
