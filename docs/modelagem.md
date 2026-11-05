# Modelo de dados e integridade

Esta documentação descreve o esquema implementado no Checkpoint 1. O código dos modelos e as migrations do Django são a fonte de verdade. O banco local é SQLite relacional; as chaves primárias usam `BigAutoField` por configuração global. Datas e horários são armazenados como `DateTimeField`, com `USE_TZ=True` e fuso de apresentação `America/Sao_Paulo`.

As tabelas abaixo correspondem aos oito modelos de domínio. `Usuario` herda os campos e mecanismos de autenticação de `AbstractUser`; grupos e permissões pertencem ao sistema nativo de autenticação do Django e não são duplicados por um campo de perfil.

## Entidades

### `usuarios.Usuario`

Usuário autenticável do sistema. Não declara campos próprios além de `AbstractUser`.

| Campo | Obrigatoriedade | Descrição |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `username` | Obrigatório, único | Identificador de login herdado. |
| `password` | Obrigatório | Hash de senha gerenciado pelo Django; não se armazena senha em texto puro. |
| `first_name`, `last_name`, `email` | Opcionais | Dados nativos de identificação. |
| `is_active`, `is_staff`, `is_superuser` | Obrigatórios, com padrões Django | Estado da conta e controles de autenticação/administração. |
| `groups`, `user_permissions` | Opcionais | Relações nativas com Groups e Permissions. |

Também são herdados campos como `last_login` e `date_joined`. Não existe coluna `perfil`: os grupos `Administrador`, `Responsável` e `Solicitante` são configurados por comando.

### `ambientes.CategoriaAmbiente`

Classifica ambientes.

| Campo | Obrigatoriedade | Regra |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `nome` | Obrigatório | Único; até 100 caracteres. |
| `descricao` | Opcional | Texto livre (`blank=True`). |

Uma categoria pode classificar vários ambientes. A FK `Ambiente.categoria` é obrigatória e usa `PROTECT`, impedindo a exclusão da categoria enquanto houver ambientes associados.

### `ambientes.Ambiente`

Representa sala, laboratório, auditório ou outro espaço reservável.

| Campo | Obrigatoriedade | Regra |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `codigo` | Obrigatório | Único; até 30 caracteres. |
| `nome` | Obrigatório | Até 150 caracteres. |
| `descricao` | Opcional | Texto livre. |
| `localizacao` | Obrigatório | Até 200 caracteres. |
| `capacidade` | Obrigatório | Inteiro de pelo menos 1; validado no modelo e no SQLite. |
| `ativo` | Obrigatório | Booleano, padrão `True`. |
| `categoria_id` | Obrigatório | FK para `CategoriaAmbiente`, `PROTECT`. |
| `responsavel_id` | Obrigatório | FK para `Usuario`, `PROTECT`; `related_name="ambientes_sob_responsabilidade"`. |

As relações reversas são `CategoriaAmbiente.ambientes` e `Usuario.ambientes_sob_responsabilidade`.

### `ambientes.CategoriaEquipamento`

Classifica equipamentos compartilhados.

| Campo | Obrigatoriedade | Regra |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `nome` | Obrigatório | Único; até 100 caracteres. |
| `descricao` | Opcional | Texto livre (`blank=True`). |

Uma categoria pode ter vários equipamentos. A FK obrigatória `Equipamento.categoria` usa `PROTECT`; a relação reversa é `CategoriaEquipamento.equipamentos`.

### `ambientes.Equipamento`

Representa um tipo de equipamento e seu estoque total compartilhado.

| Campo | Obrigatoriedade | Regra |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `codigo` | Obrigatório | Único; até 30 caracteres. |
| `nome` | Obrigatório | Até 150 caracteres. |
| `descricao` | Opcional | Texto livre. |
| `quantidade_total` | Obrigatório | Inteiro não negativo; zero é permitido. O tipo e a restrição SQLite foram verificados em base descartável. |
| `ativo` | Obrigatório | Booleano, padrão `True`. |
| `categoria_id` | Obrigatório | FK para `CategoriaEquipamento`, `PROTECT`. |

O equipamento não pertence a um ambiente específico. As reservas o utilizam por meio de `ReservaEquipamento`; o saldo por horário não é uma coluna persistida, e sim calculado na validação do item (ver [Regras de disponibilidade e consistência](#regras-de-disponibilidade-e-consistência)).

### `reservas.Reserva`

Registra a solicitação de uso de um ambiente.

| Campo | Obrigatoriedade | Regra |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `solicitante_id` | Obrigatório | FK para `Usuario`, `PROTECT`; relação reversa `Usuario.reservas_solicitadas`. |
| `ambiente_id` | Obrigatório | FK para `Ambiente`, `PROTECT`; relação reversa `Ambiente.reservas`. |
| `inicio`, `fim` | Obrigatórios | `DateTimeField`; `inicio < fim` é validado no modelo e por `CheckConstraint` no SQLite. |
| `status` | Obrigatório | Um dos cinco estados documentados abaixo; padrão `PENDENTE`, choices no modelo e constraint no banco. |
| `observacoes` | Opcional | Texto livre. |
| `criado_em`, `atualizado_em` | Automáticos | Data de criação e última atualização pelo ORM convencional. |
| `avaliado_por_id` | Condicional | FK nullable para `Usuario`, `PROTECT`; relação reversa `Usuario.reservas_avaliadas`. Exigido em `APROVADA`/`REJEITADA`, vazio em `PENDENTE` e diferente do solicitante. |
| `avaliado_em` | Condicional | `DateTimeField` nullable. Exigido em `APROVADA`/`REJEITADA` e vazio em `PENDENTE`. |
| `justificativa` | Condicional | Texto livre; obrigatório em `REJEITADA`. |
| `equipamentos` | Opcional | Relação N:N com `Equipamento` por `ReservaEquipamento`. |

Estados: `PENDENTE` (aguarda avaliação), `APROVADA` (solicitação aceita), `REJEITADA` (não autorizada), `CANCELADA` e `CONCLUIDA` (período encerrado, registro histórico). O campo padrão é `PENDENTE`. A aprovação ou rejeição é registrada alterando o status no Admin, sujeita às regras de disponibilidade e consistência descritas adiante; não há tela de aprovação para usuários finais. Uma reserva só pode ser marcada como `CONCLUIDA` depois do fim do período; a partir daí status, horário, ambiente e solicitante não podem ser alterados, e a exclusão é bloqueada pelo modelo/QuerySet e pelo Admin. Essas proteções são regras da aplicação, não triggers SQL.

### `reservas.ReservaEquipamento`

Tabela intermediária entre reservas e equipamentos.

| Campo | Obrigatoriedade | Regra |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `reserva_id` | Obrigatório | FK para `Reserva`, `PROTECT`; relação reversa `Reserva.itens_equipamento`. |
| `equipamento_id` | Obrigatório | FK para `Equipamento`, `PROTECT`; relação reversa `Equipamento.itens_reserva`. |
| `quantidade` | Obrigatório | Inteiro maior ou igual a 1, validado no modelo/formulário e no banco. |

Uma `UniqueConstraint` impede associar o mesmo equipamento mais de uma vez à mesma reserva. O equipamento pode aparecer em outras reservas. A quantidade não pode exceder o estoque total, equipamentos inativos não podem ser adicionados e, em reservas aprovadas, a soma por horário respeita o estoque (ver regras adiante).

### `reservas.BloqueioAmbiente`

Registra período de indisponibilidade de um ambiente.

| Campo | Obrigatoriedade | Regra |
| --- | --- | --- |
| `id` | Obrigatório | Chave primária. |
| `ambiente_id` | Obrigatório | FK para `Ambiente`, `PROTECT`; relação reversa `Ambiente.bloqueios`. |
| `inicio`, `fim` | Obrigatórios | `DateTimeField`; `inicio < fim` é validado no modelo e por `CheckConstraint` no SQLite. |
| `motivo` | Obrigatório | Texto livre. |
| `criado_por_id` | Obrigatório | FK para `Usuario`, `PROTECT`; relação reversa `Usuario.bloqueios_criados`. |

Um bloqueio impede aprovar reservas do mesmo ambiente no período. Ao salvar um bloqueio que coincide com reservas já aprovadas, o Admin salva o registro normalmente e exibe um alerta listando essas reservas para revisão manual; nenhuma reserva tem o status alterado automaticamente.

## Relações e exclusões

| Relação | Cardinalidade | Política/observação |
| --- | --- | --- |
| `CategoriaAmbiente` → `Ambiente` | 1:N | FK obrigatória, `PROTECT`. |
| `Usuario` → `Ambiente` (responsável) | 1:N | FK obrigatória, `PROTECT`; não concede por si só permissão global. |
| `CategoriaEquipamento` → `Equipamento` | 1:N | FK obrigatória, `PROTECT`. |
| `Usuario` → `Reserva` (solicitante) | 1:N | FK obrigatória, `PROTECT`. |
| `Ambiente` → `Reserva` | 1:N | FK obrigatória, `PROTECT`. |
| `Usuario` → `Reserva` (avaliador) | 1:N; cada reserva tem 0 ou 1 avaliador | FK pode ser nula, `PROTECT` quando preenchida. |
| `Reserva` ↔ `Equipamento` | N:N | Intermediada por `ReservaEquipamento`, com quantidade e unicidade por par. |
| `Ambiente` → `BloqueioAmbiente` | 1:N | FK obrigatória, `PROTECT`. |
| `Usuario` → `BloqueioAmbiente` (criador) | 1:N | FK obrigatória, `PROTECT`. |

As chaves relacionadas a ambientes, categorias, usuários, reservas e equipamentos usam `PROTECT`; apagar uma entidade referenciada é impedido em vez de remover seus registros dependentes em cascata.

## Regras e camadas de integridade

| Regra | Modelo/formulário | Banco SQLite |
| --- | --- | --- |
| Código de ambiente e equipamento único | Campo `unique=True`; formulários validam duplicidade. | Índice/constraint de unicidade. |
| Nome de cada categoria único | Campo `unique=True`. | Índice/constraint de unicidade. |
| Capacidade do ambiente `>= 1` | Tipo positivo e `clean()`. | `CheckConstraint` `ambiente_capacidade_gte_1`. |
| Estoque total do equipamento `>= 0` | `PositiveIntegerField`; zero permitido. | Check do campo no SQLite; persistência inválida foi testada. |
| Intervalo de reserva `inicio < fim` | `clean()`. | `CheckConstraint` `reserva_inicio_menor_que_fim`. |
| Estado da reserva permitido | `TextChoices`. | `CheckConstraint` `reserva_status_valido`. |
| Quantidade solicitada `>= 1` | `MinValueValidator` e `clean()`. | `CheckConstraint` `reserva_equip_quantidade_gte_1`. |
| Um item de equipamento por reserva | Formulário/modelo e unicidade. | `UniqueConstraint` `reserva_equipamento_unico`. |
| Intervalo de bloqueio `inicio < fim` | `clean()`. | `CheckConstraint` `bloqueio_inicio_menor_que_fim`. |
| Referências válidas | FKs e formulários Django Admin. | Chaves estrangeiras do SQLite. |

`clean()` oferece erros legíveis quando chamado pela validação do modelo; `save()` não chama `full_clean()` automaticamente. Os ModelForms do Admin validam a entrada e exibem erros de formulário. Constraints e FKs protegem a persistência no banco mesmo se a entrada não passar pelo Admin. As provas SQL foram executadas em SQLite descartável, sem usar o banco local do grupo.

## Regras de disponibilidade e consistência

Regras implementadas no `clean()` dos modelos. São executadas pela validação do Django (`full_clean()`), usada pelos formulários do Admin, que exibem a mensagem no campo correspondente. Por dependerem de consultas a outros registros, não são constraints SQL.

Dois intervalos se sobrepõem quando `inicio_existente < fim_novo` **e** `fim_existente > inicio_novo`. Horários consecutivos (por exemplo, 14h–16h e 16h–18h) não conflitam.

| Regra | Onde |
| --- | --- |
| Duas reservas `APROVADA` do mesmo ambiente não podem se sobrepor. Pendentes, rejeitadas, canceladas e concluídas não ocupam o ambiente. | `Reserva._validar_conflito_com_aprovadas()` |
| Uma reserva não pode ser aprovada durante um `BloqueioAmbiente` do mesmo ambiente; como `PENDENTE`, pode ser registrada. | `Reserva._validar_conflito_com_bloqueios()` |
| Ambiente inativo e usuário inativo não originam reservas novas (nem por troca de ambiente/solicitante); reservas antigas continuam editáveis. | `Reserva._validar_ambiente_e_solicitante_ativos()` |
| `APROVADA`/`REJEITADA` exigem avaliador e data; `REJEITADA` exige justificativa; `PENDENTE` não tem avaliador nem data; o solicitante não avalia a própria reserva. `CANCELADA`/`CONCLUIDA` não exigem avaliação. | `Reserva._validar_dados_de_avaliacao()` |
| `CONCLUIDA` apenas após o fim do período; depois, status, início, fim, ambiente e solicitante ficam imutáveis. | `Reserva._validar_reserva_concluida()` |
| Quantidade do item `<=` `quantidade_total`; em reserva `APROVADA`, a soma das quantidades do equipamento em reservas aprovadas sobrepostas não excede o estoque. | `ReservaEquipamento._validar_estoque()` |
| Equipamento inativo não pode ser adicionado nem trocado em um item; itens existentes continuam editáveis. | `ReservaEquipamento._validar_equipamento_ativo()` |
| Ao salvar um bloqueio, reservas aprovadas coincidentes são listadas em alerta no Admin. | `BloqueioAmbiente.reservas_aprovadas_sobrepostas()` e `BloqueioAmbienteAdmin.save_model()` |

O cálculo do saldo de equipamentos é conservador: soma todas as reservas aprovadas que cruzam o intervalo, mesmo que elas não se cruzem entre si. Duas aprovações simultâneas (concorrência) não são tratadas nesta etapa.

## Grupos e permissões configurados

O comando `python manage.py configurar_perfis` administra permissões padrão `add`, `view`, `change` e `delete` para os modelos de domínio abaixo. A matriz descreve essas permissões que o comando configura; permissões customizadas são preservadas. `is_staff` é independente das permissões de grupo e não é alterado pelo comando.

| Modelo | Administrador | Responsável | Solicitante |
| --- | --- | --- | --- |
| `CategoriaAmbiente` | add, view, change, delete | Nenhuma padrão atribuída pelo comando | Nenhuma padrão atribuída pelo comando |
| `Ambiente` | add, view, change, delete | Nenhuma padrão atribuída pelo comando | Nenhuma padrão atribuída pelo comando |
| `CategoriaEquipamento` | add, view, change, delete | Nenhuma padrão atribuída pelo comando | Nenhuma padrão atribuída pelo comando |
| `Equipamento` | add, view, change, delete | Nenhuma padrão atribuída pelo comando | Nenhuma padrão atribuída pelo comando |
| `Reserva` | add, view, change, delete | Nenhuma padrão atribuída pelo comando | Nenhuma padrão atribuída pelo comando |
| `ReservaEquipamento` | add, view, change, delete | Nenhuma padrão atribuída pelo comando | Nenhuma padrão atribuída pelo comando |
| `BloqueioAmbiente` | add, view, change, delete | Nenhuma padrão atribuída pelo comando | Nenhuma padrão atribuída pelo comando |
| `Usuario`, `Group`, `Permission` | Nenhuma padrão concedida | Nenhuma padrão concedida | Nenhuma padrão concedida |

Superusuários mantêm o comportamento nativo do Django. Pertencer ao grupo Administrador não torna a conta staff nem superusuária. A associação `Ambiente.responsavel` não restringe objetos no Admin; autorização por objeto para responsáveis e acesso de solicitantes às próprias reservas continuam planejados para o Checkpoint 2.

## Complexidade implementada no Checkpoint 1

Os elementos verificáveis da modelagem são os oito modelos relacionados, duas cadeias categoria→recurso, relações de usuários com ambientes/reservas/bloqueios, a relação N:N de reservas e equipamentos com quantidade, cinco estados de reserva, constraints de intervalo/quantidade/unicidade, FKs protegidas e grupos nativos com permissões de menor privilégio. O Admin inclui registros, filtros, pesquisas e inline da tabela intermediária, e a suíte cobre validações, acesso HTTP e comandos reproduzíveis. Além disso, as regras de disponibilidade e consistência descritas acima (conflitos entre reservas aprovadas, bloqueios, estoque por horário, situação de recursos, coerência da avaliação e preservação de reservas concluídas) são validadas no backend e exercitadas pela suíte. Autorização por objeto e fluxos para usuários finais permanecem fora do escopo implementado.

## Escopo ainda planejado

O Checkpoint 1 fornece modelos, validações de integridade e de disponibilidade e administração. Ficam para o Checkpoint 2: telas de solicitação, aprovação, rejeição e cancelamento para usuários finais, autorização por objeto (responsável atuar só nos próprios ambientes, solicitante só nas próprias reservas), API para o frontend e controle de concorrência nas aprovações.
