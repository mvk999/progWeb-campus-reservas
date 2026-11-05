# Campus Reservas

## Integrantes

- Marcos Vinícius Pereira
- Arthur Soares Marques
- Lana da Silva Miranda

## Descrição

O Campus Reservas é um sistema web para gerenciar reservas de ambientes e equipamentos universitários. Solicitantes poderão pedir reservas; responsáveis poderão avaliar pedidos dos ambientes sob sua responsabilidade; administradores poderão gerenciar os recursos do sistema.

O projeto está em desenvolvimento para o Checkpoint 1 da disciplina GAC116 — Programação Web. O backend usa os apps `usuarios`, `ambientes` e `reservas`; implementa o usuário customizado, as entidades e constraints do domínio, o Django Admin com Jazzmin, filtros, pesquisas, inline de equipamentos, grupos/permissões iniciais e dados sintéticos. O backend também valida regras de disponibilidade: impede aprovar reservas sobrepostas no mesmo ambiente ou durante bloqueios, controla o estoque de equipamentos por horário e preserva reservas concluídas. As telas de solicitação, avaliação e cancelamento para usuários finais continuam planejadas para o Checkpoint 2.

## Tecnologias

| Área | Tecnologia | Situação |
| --- | --- | --- |
| Backend | Python 3.12 e Django 5.2.18 | Oito modelos de domínio com constraints, autenticação nativa, Groups/Permissions iniciais, Admin/Jazzmin com filtros e inline, e dados de demonstração. |
| Banco de dados | SQLite relacional | Configurado para execução local. |
| Administração | Django Admin com Jazzmin 3.0.5 | Models registrados com autenticação e permissões nativas; identidade Campus Reservas e seletor de tema claro/escuro. |
| Frontend | Angular | Workspace inicial em `frontend/`, sem telas de domínio; telas e integração no Checkpoint 2. |
| Estilização | Bootstrap 5 | Reservado para o Checkpoint 2. |

Django 5.2 foi escolhido por ser uma versão LTS compatível com Python 3.12. O projeto fixa a versão patch 5.2.18, publicada em 6 de outubro de 2026. Confira as [notas oficiais de Django 5.2.18](https://docs.djangoproject.com/en/5.2/releases/5.2.18/) e a [tabela oficial de compatibilidade com Python](https://docs.djangoproject.com/en/5.2/faq/install/).

## Requisitos

- Python 3.12, compatível com Django 5.2.
- `venv` e `pip` disponíveis.

## Instalação

Na raiz do repositório, crie e ative um ambiente virtual.

Linux ou macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

Instale as dependências:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

O arquivo `requirements.txt` fixa Django 5.2.18 e Jazzmin 3.0.5.

## Banco de dados e conta administrativa

O projeto configura `AUTH_USER_MODEL = "usuarios.Usuario"` antes das migrations iniciais. Em um ambiente novo, aplique as migrations e crie uma conta administrativa:

```bash
python manage.py migrate
python manage.py createsuperuser
```

O modelo herda de `AbstractUser`, mantém autenticação por nome de usuário e senha com hash e oferece suporte aos mecanismos nativos de Groups e Permissions. Os grupos iniciais são configurados na C1.11; telas de login/cadastro de usuários finais permanecem planejadas para o Checkpoint 2.

## Configuração e execução

As configurações locais podem ser fornecidas por variáveis de ambiente. A chave padrão do projeto é exclusiva para desenvolvimento local; defina uma chave própria fora do repositório para qualquer outro ambiente.

Linux ou macOS:

```bash
export DJANGO_SECRET_KEY='substitua-por-uma-chave-local'
export DJANGO_DEBUG=1
export DJANGO_ALLOWED_HOSTS='localhost,127.0.0.1,[::1]'
python manage.py check
python manage.py runserver
```

Windows PowerShell:

```powershell
$env:DJANGO_SECRET_KEY = 'substitua-por-uma-chave-local'
$env:DJANGO_DEBUG = '1'
$env:DJANGO_ALLOWED_HOSTS = 'localhost,127.0.0.1,[::1]'
python manage.py check
python manage.py runserver
```

`DJANGO_SECRET_KEY` define a chave de assinatura local; `DJANGO_DEBUG` controla o modo de depuração (`1` habilita); `DJANGO_ALLOWED_HOSTS` recebe hosts separados por vírgulas e, se omitida, usa `localhost,127.0.0.1,[::1]`. A chave padrão do código é somente para desenvolvimento local.

Depois de aplicar as migrations e criar o superusuário conforme a seção anterior, o servidor local ficará disponível em `http://127.0.0.1:8000/`. O caminho `/admin/` usa a autenticação nativa do Django e o modelo customizado `usuarios.Usuario`, com apresentação do Jazzmin identificada como Campus Reservas.

## Perfis e dados de demonstração

Configure os grupos e, se desejar, dados sintéticos em uma base local após aplicar
as migrations:

```bash
python manage.py configurar_perfis
python manage.py popular_demo
python manage.py createsuperuser
python manage.py runserver
```

O acesso administrativo fica em `http://127.0.0.1:8000/admin/`. `popular_demo`
cria registros identificados com `DEMO`/`DEMO:C1.11`, incluindo um equipamento
inativo para contrastar o filtro de situação; não apaga registros e pode ser
executado novamente. As contas `demo.c111.*` são fictícias, não são
staff nem superusuários e recebem senha inutilizável; não há credencial demo
fixa. Crie uma conta administrativa própria com `createsuperuser`.

| Grupo | Permissões de modelo configuradas | Limites nesta etapa |
| --- | --- | --- |
| `Administrador` | add, view, change e delete para categorias, ambientes, equipamentos, reservas, associações de equipamentos e bloqueios | Não recebe permissões de usuários, grupos ou credenciais. Para acesso ao Admin, `is_staff` deve ser concedido separadamente por uma conta autorizada; o comando não altera essa flag. |
| `Responsável` | Nenhuma permissão padrão de modelo global atribuída pelo comando | A relação com os ambientes não concede acesso global. Decisões sobre reservas dos próprios ambientes e autorização por objeto ficam para o Checkpoint 2. |
| `Solicitante` | Nenhuma permissão padrão de modelo global atribuída pelo comando | Consulta e gestão das próprias reservas ainda não estão disponíveis; ficam para o Checkpoint 2. |

`configurar_perfis` sincroniza apenas as permissões padrão dos modelos
administrados e dos modelos sensíveis de usuário/grupo, preservando permissões
customizadas e permissões fora dessa matriz. Não modifica usuários, associações
de grupo, `user_permissions`, `is_staff`, `is_superuser` ou senhas. Superusuários
mantêm o comportamento nativo do Django.

Os registros com os cinco estados de reserva são sintéticos e servem à
demonstração das listagens e respeitam as regras de disponibilidade e de
avaliação; o comando apenas cria os registros. Acesso por objeto de Responsáveis, a área de
usuários finais, a API e a interface Angular continuam planejados para o
Checkpoint 2.

## Documentação do Checkpoint 1

- [Modelo de dados, relacionamentos e integridade](docs/modelagem.md).
- [Diagrama entidade-relacionamento](docs/diagrama-er.md).
- [Roteiro prático de apresentação](docs/apresentacao-checkpoint1.md).
- [Checklist de revisão final do Checkpoint 1](docs/checkpoint1-checklist.md).

## Verificações

Execute a suíte automatizada com:

```bash
python manage.py test
```

Na versão de 05/11/2026 a suíte tem 163 testes (18 em `usuarios`, 20 em `ambientes` e 125 em `reservas`).

## Funcionalidades

### Implementado

- Estrutura inicial do projeto Django e dos apps `usuarios`, `ambientes` e `reservas`.
- Configuração do SQLite e do fuso `America/Sao_Paulo`, com `USE_TZ=True`.
- Modelo `usuarios.Usuario`, baseado em `AbstractUser`, configurado como `AUTH_USER_MODEL`.
- Autenticação nativa do Django, com suporte a senha segura, superusuários, Groups e Permissions.
- `CategoriaAmbiente`, com `nome` único e `descricao`.
- `Ambiente`, com `codigo` único, `nome`, `descricao`, `localizacao`, `capacidade` e `ativo`; relaciona-se à categoria e a `Usuario` como responsável, protegendo essas referências contra exclusão.
- A capacidade mínima de 1 consta na validação do modelo e em uma `CheckConstraint` na migration. A migration inicial de ambientes depende do modelo customizado de usuário.
- `CategoriaEquipamento`, com `nome` único e `descricao` opcional.
- `Equipamento`, com `codigo` único, `nome`, `descricao`, `quantidade_total` não negativa e `ativo`; pertence a uma categoria protegida contra exclusão. A quantidade representa estoque compartilhado, aceita zero e pode ser associada às reservas por `ReservaEquipamento`.
- `Reserva`, relacionada a `usuarios.Usuario` como solicitante e a `Ambiente`, preservando essas referências contra exclusão. Armazena início, fim, status, observações, campos opcionais de avaliação e timestamps de criação e atualização. Os estados são `PENDENTE`, `APROVADA`, `REJEITADA`, `CANCELADA` e `CONCLUIDA`; o padrão é `PENDENTE`.
- A reserva valida `inicio < fim` no modelo e no banco SQLite. A restrição SQL também limita o status aos cinco valores definidos. A avaliação aponta para um usuário protegido contra exclusão e precisa ser coerente com o status: `APROVADA` e `REJEITADA` exigem avaliador e data, `REJEITADA` exige justificativa, `PENDENTE` não tem avaliador e o solicitante não avalia a própria reserva.
- Reservas no estado `CONCLUIDA` preservam seu histórico: só podem ser concluídas após o fim do período, não têm status, horário, ambiente ou solicitante alterados e não podem ser excluídas (modelo/QuerySet e Django Admin). Essas regras não são triggers SQL.
- `ReservaEquipamento`, associação entre `Reserva` e `Equipamento` por meio de `Reserva.equipamentos`, com quantidade mínima de 1, combinação `(reserva, equipamento)` única e referências protegidas contra exclusão.
- `BloqueioAmbiente`, associado obrigatoriamente a um `Ambiente` e ao usuário que o registrou. Armazena motivo e intervalo; a regra `inicio < fim` é validada pelo modelo e por constraint no SQLite. Um bloqueio impede aprovar reservas do ambiente no período; ao salvar um bloqueio que coincide com reservas já aprovadas, o Admin exibe um alerta listando-as para revisão manual.
- Os oito models (`Usuario`, categorias, ambientes, equipamentos, reservas, itens de equipamento e bloqueios) estão disponíveis no Django Admin autenticado em `/admin/`, com criação, consulta, edição e exclusão sujeitas às permissões nativas e às restrições dos modelos. `Reserva` exibe seus campos de auditoria como somente leitura.
- Regras de disponibilidade validadas no backend e exibidas como erro no Admin: duas reservas `APROVADA` do mesmo ambiente não podem se sobrepor (horários consecutivos são permitidos); reservas não podem ser aprovadas durante bloqueios; ambientes e usuários inativos não originam reservas novas; a quantidade de um equipamento não excede o estoque total nem, em reservas aprovadas, o saldo do horário; equipamentos inativos não podem ser adicionados. Detalhes em [Regras de disponibilidade e consistência](docs/modelagem.md#regras-de-disponibilidade-e-consistência).
- A conta administrativa pode ser criada com `python manage.py createsuperuser`. A aprovação ou rejeição é registrada alterando o status da reserva no Admin, sujeita às regras acima; não há permissões por objeto.
- O Django Admin utiliza Jazzmin 3.0.5, com identidade visual Campus Reservas, navegação organizada por app, tema Flatly e seletor nativo de esquema claro, escuro ou automático. Fontes externas e CSS de marca customizados não são necessários.
- As listagens administrativas de ambientes, equipamentos, reservas, bloqueios e associações de equipamentos exibem campos úteis e oferecem filtros nativos por categoria, situação, responsável, status, ambiente, solicitante, equipamento e período, conforme cada entidade. Pesquisas por código, nome, localização e identificação de usuários estão disponíveis nos modelos pertinentes; reservas (pela data de início) e bloqueios também oferecem navegação por data.
- A edição de uma reserva inclui um inline para consultar, adicionar, alterar e remover equipamentos solicitados. As permissões nativas do Django e as validações existentes de quantidade positiva e associação única continuam aplicadas.
- Os grupos `Administrador`, `Responsável` e `Solicitante` e a matriz inicial do Admin são configuráveis com `python manage.py configurar_perfis`. O comando `python manage.py popular_demo` cria registros sintéticos repetíveis, sem credenciais utilizáveis ou exclusão de dados.

### Planejado

- Login, logout e cadastro de usuários finais.
- Telas de solicitação, avaliação, cancelamento e consulta de reservas para usuários finais, com autorização por objeto (responsável apenas nos próprios ambientes, solicitante apenas nas próprias reservas).
- API Django para o frontend e controle de concorrência nas aprovações.
- Interface de usuário com Angular e Bootstrap 5, responsiva e com tema claro/escuro, no Checkpoint 2.

## Estrutura do backend

```text
.
├── config/                 # Settings, URLs e gateways ASGI/WSGI
├── usuarios/               # App de usuários com Usuario e comando de configuração de grupos
├── ambientes/              # Categorias, ambientes (C1.04) e equipamentos (C1.05)
├── reservas/               # Reserva (C1.06), itens e bloqueios (C1.07); fluxos posteriores
├── docs/
│   ├── modelagem.md         # Entidades, relações, constraints e permissões
│   ├── diagrama-er.md      # Diagrama Mermaid das oito entidades
│   ├── apresentacao-checkpoint1.md # Roteiro prático de demonstração
│   └── checkpoint1-checklist.md   # Checklist de revisão do Checkpoint 1
├── frontend/               # Workspace Angular inicial (sem telas de domínio)
├── requirements.txt
├── manage.py
└── .gitignore
```

Os três apps estão registrados em `INSTALLED_APPS`. A pasta `frontend/` contém apenas o workspace inicial do Angular; as telas e a integração com o backend fazem parte do Checkpoint 2.
