# Campus Reservas

## Integrantes

- Marcos Vinícius Pereira
- Arthur Soares Marques
- Lana da Silva Miranda

## Descrição

O Campus Reservas é um sistema web para gerenciar reservas de ambientes e equipamentos universitários. Solicitantes poderão pedir reservas; responsáveis poderão avaliar pedidos dos ambientes sob sua responsabilidade; administradores poderão gerenciar os recursos do sistema.

O backend em Django usa os apps `usuarios`, `ambientes` e `reservas` e oferece duas áreas protegidas por autenticação:

- **Área administrativa:** Django Admin com tema Jazzmin, filtros, pesquisas e inline de equipamentos.
- **Área dos usuários finais:** uma API REST (Django REST Framework) consumida pelo frontend Angular, com cadastro, login, logout, consulta de ambientes e disponibilidade, solicitação e cancelamento de reservas e a gestão de pedidos pelos responsáveis.

As regras de negócio ficam nos modelos e valem nas duas áreas: o sistema impede aprovar reservas sobrepostas no mesmo ambiente ou durante bloqueios, controla o estoque de equipamentos por horário, limita os participantes à capacidade do ambiente e preserva reservas concluídas.

## Tecnologias

| Área | Tecnologia | Situação |
| --- | --- | --- |
| Backend | Python 3.12 e Django 5.2.18 | Oito modelos de domínio com constraints, autenticação nativa, Groups/Permissions, Admin/Jazzmin com filtros e inline, e dados de demonstração. |
| API | Django REST Framework 3.18.3 | API REST com autenticação por sessão e proteção CSRF, consumida pelo frontend. Contrato em [`docs/api.md`](docs/api.md). |
| Banco de dados | SQLite relacional | Configurado para execução local, com transações em modo `IMMEDIATE` para operações simultâneas. |
| Administração | Django Admin com Jazzmin 3.0.5 | Models registrados com autenticação e permissões nativas; identidade Campus Reservas e seletor de tema claro/escuro. |
| Frontend | Angular | Telas em `frontend/`; integração com a API em andamento. |
| Estilização | Bootstrap 5 | Planejado para a interface do frontend. |

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

O arquivo `requirements.txt` fixa Django 5.2.18, Jazzmin 3.0.5 e Django REST Framework 3.18.3. Sempre que ele mudar (por exemplo, depois de um `git pull`), rode o `pip install -r requirements.txt` de novo.

## Banco de dados e conta administrativa

O projeto configura `AUTH_USER_MODEL = "usuarios.Usuario"` antes das migrations iniciais. Em um ambiente novo, aplique as migrations e crie uma conta administrativa:

```bash
python manage.py migrate
python manage.py createsuperuser
```

O modelo herda de `AbstractUser`, mantém autenticação por nome de usuário e senha com hash e oferece suporte aos mecanismos nativos de Groups e Permissions. Os grupos são configurados pelo comando `configurar_perfis`. Os usuários finais se cadastram e entram pela API (`/api/auth/cadastro/` e `/api/auth/login/`), usando o mesmo modelo e as mesmas regras de senha.

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
cria registros sintéticos, incluindo um equipamento inativo para contrastar o
filtro de situação; não apaga registros e pode ser executado novamente. Códigos,
usuários e marcadores levam `DEMO`/`DEMO:C1.11`; as categorias têm nomes simples
(como "Sala de aula" e "Audiovisual"), porque aparecem nos filtros do frontend, e
são reconhecidas como sintéticas pela descrição. As contas `demo.c111.*` são fictícias, não são
staff nem superusuários e recebem senha inutilizável; não há credencial demo
fixa. Crie uma conta administrativa própria com `createsuperuser`.

O comando também cria as 21 salas que aparecem no mapa do campus do frontend, com os mesmos códigos e prédios usados pelo mapa (por exemplo, AMB-003 no prédio PV1). Sem elas no banco, o mapa não encontra as salas quando passar a usar a API. As salas dos prédios PV1 a PV3 ficam sob responsabilidade de demo.c111.responsavel.01, e as dos prédios PV4 a PV6 e DCC, de demo.c111.responsavel.02.

Para entrar com uma conta de demonstração na área dos usuários finais (por
exemplo, para mostrar a gestão de reservas com um responsável), defina uma
senha para ela:

```bash
python manage.py changepassword demo.c111.responsavel.01
```

Contas novas de solicitante podem ser criadas pela tela de cadastro.

| Grupo | Permissões de modelo configuradas | Limites nesta etapa |
| --- | --- | --- |
| `Administrador` | add, view, change e delete para categorias, ambientes, equipamentos, reservas, associações de equipamentos e bloqueios | Não recebe permissões de usuários, grupos ou credenciais. Para acesso ao Admin, `is_staff` deve ser concedido separadamente por uma conta autorizada; o comando não altera essa flag. |
| `Responsável` | Nenhuma permissão padrão de modelo global atribuída pelo comando | Pela API, lista, aprova e rejeita reservas apenas dos ambientes pelos quais responde (autorização por objeto). Ser responsável por um ambiente também dá esse perfil, mesmo sem o grupo. |
| `Solicitante` | Nenhuma permissão padrão de modelo global atribuída pelo comando | Pela API, solicita reservas e consulta e cancela apenas as próprias. Todo cadastro novo entra neste grupo. |

`configurar_perfis` sincroniza apenas as permissões padrão dos modelos
administrados e dos modelos sensíveis de usuário/grupo, preservando permissões
customizadas e permissões fora dessa matriz. Não modifica usuários, associações
de grupo, `user_permissions`, `is_staff`, `is_superuser` ou senhas. Superusuários
mantêm o comportamento nativo do Django.

Os registros com os cinco estados de reserva são sintéticos, servem à
demonstração das listagens e respeitam as regras de disponibilidade e de
avaliação; o comando apenas cria os registros.

O perfil que o frontend usa para montar menus vem do endpoint `/api/auth/me/`:
`administrador` (superusuário ou grupo `Administrador`), `responsavel` (grupo
`Responsável` ou responsável por algum ambiente) ou `solicitante`.

## API

A API fica em `/api/` e está documentada em [`docs/api.md`](docs/api.md). Com
`DJANGO_DEBUG=1`, abrir uma rota no navegador mostra a página navegável do
Django REST Framework; entre antes pelo `/admin/` para testar as rotas que
exigem login.

| Grupo de rotas | Endpoints |
| --- | --- |
| Autenticação | `GET /api/csrf/`, `POST /api/auth/login/`, `POST /api/auth/logout/`, `POST /api/auth/cadastro/`, `GET /api/auth/me/` |
| Consulta | `GET /api/ambientes/`, `GET /api/ambientes/<code>/`, `GET /api/ambientes/<code>/disponibilidade/`, `GET /api/categorias/`, `GET /api/equipamentos/` |
| Reservas do usuário | `GET` e `POST /api/reservas/`, `GET /api/reservas/<id>/`, `POST /api/reservas/<id>/cancelar/` |
| Gestão | `GET /api/gestao/reservas/`, `POST /api/gestao/reservas/<id>/aprovar/`, `POST /api/gestao/reservas/<id>/rejeitar/`, `GET /api/gestao/ocupacao/` |

A pasta [`docs/postman/`](docs/postman/) tem uma coleção do Postman com as
rotas em ordem: cadastro, login, consulta, solicitação, aprovação, rejeição e
cancelamento. Para usar, importe o arquivo no Postman (**Import**), rode
`popular_demo` em um banco novo, defina a senha do responsável de demonstração
com `python manage.py changepassword demo.c111.responsavel.01`, coloque-a na
variável `senhaResponsavel` da coleção e execute as pastas na ordem. O token
CSRF é enviado automaticamente, e cada requisição confere o código de resposta
esperado.

Quem não está logado recebe 401; quem está logado sem permissão recebe 403.
Toda requisição `POST` exige o cabeçalho `X-CSRFToken` com o valor do cookie
`csrftoken`. Em desenvolvimento, o Angular acessa a API pelo proxy do
`ng serve`, na mesma origem do Django.

## Documentação

- [Contrato da API](docs/api.md).
- [Modelo de dados, relacionamentos e integridade](docs/modelagem.md).
- [Diagrama entidade-relacionamento](docs/diagrama-er.md).
- [Roteiro prático de apresentação](docs/apresentacao-checkpoint1.md).
- [Checklist de revisão final do Checkpoint 1](docs/checkpoint1-checklist.md).

## Verificações

Execute a suíte automatizada com:

```bash
python manage.py test
```

Em 18/11/2026 a suíte tem 258 testes (48 em `usuarios`, 35 em `ambientes` e 175 em `reservas`). Além dos modelos e do Admin, os testes cobrem cada endpoint da API: respostas, permissões por perfil e por objeto, proteção CSRF e regras de negócio.

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
- A conta administrativa pode ser criada com `python manage.py createsuperuser`. No Admin, a aprovação ou rejeição é registrada alterando o status da reserva, sujeita às regras acima.
- O Django Admin utiliza Jazzmin 3.0.5, com identidade visual Campus Reservas, navegação organizada por app, tema Flatly e seletor nativo de esquema claro, escuro ou automático. Fontes externas e CSS de marca customizados não são necessários.
- As listagens administrativas de ambientes, equipamentos, reservas, bloqueios e associações de equipamentos exibem campos úteis e oferecem filtros nativos por categoria, situação, responsável, status, ambiente, solicitante, equipamento e período, conforme cada entidade. Pesquisas por código, nome, localização e identificação de usuários estão disponíveis nos modelos pertinentes; reservas (pela data de início) e bloqueios também oferecem navegação por data.
- A edição de uma reserva inclui um inline para consultar, adicionar, alterar e remover equipamentos solicitados. As permissões nativas do Django e as validações existentes de quantidade positiva e associação única continuam aplicadas.
- Os grupos `Administrador`, `Responsável` e `Solicitante` e a matriz inicial do Admin são configuráveis com `python manage.py configurar_perfis`. O comando `python manage.py popular_demo` cria registros sintéticos repetíveis, incluindo as salas do mapa do campus, sem credenciais utilizáveis ou exclusão de dados.
- Campos `predio` no ambiente e `finalidade` e `participantes` na reserva; o número de participantes é limitado à capacidade do ambiente.
- **Autenticação da área de usuários finais (API):** cadastro com as regras de senha do Django e ingresso automático no grupo `Solicitante`, login, logout e consulta do usuário logado com o perfil calculado no servidor. Login e cadastro exigem token CSRF, e a mensagem de erro de login não revela quais usuários existem.
- **Consulta (API):** ambientes ativos com filtros por categoria, prédio, capacidade mínima e busca; detalhe; disponibilidade de um ambiente por dia (reservas aprovadas e pendentes e bloqueios); categorias e equipamentos ativos.
- **Reservas do usuário (API):** solicitação de reserva com equipamentos, recusando horários passados, horários com reserva aprovada ou bloqueio e estoque insuficiente; consulta das próximas reservas e do histórico; cancelamento de reservas pendentes ou aprovadas que ainda não começaram. Cada usuário só acessa as próprias reservas.
- **Gestão (API):** responsáveis listam, aprovam e rejeitam (com justificativa) reservas dos próprios ambientes, e administradores de todos; aviso de conflito antes da aprovação; validação do estoque de equipamentos no horário ao aprovar; calendário de ocupação por período.
- Transações do SQLite em modo `IMMEDIATE`, para que duas aprovações ou cancelamentos simultâneos não passem juntos pela validação.

### Planejado

- Integração das telas Angular com a API, substituindo os dados de demonstração.
- Interface de usuário com Bootstrap 5, responsiva e com tema claro/escuro.

## Estrutura do backend

```text
.
├── config/                 # Settings (inclui DRF e SQLite), URLs e gateways ASGI/WSGI
├── usuarios/               # Usuario, perfis, comando configurar_perfis e API de autenticação
├── ambientes/              # Categorias, ambientes e equipamentos; API de consulta
├── reservas/               # Reservas, itens e bloqueios; API de reservas e de gestão; popular_demo
├── docs/
│   ├── api.md              # Contrato da API entre backend e frontend
│   ├── postman/            # Coleção do Postman com as rotas da API
│   ├── modelagem.md         # Entidades, relações, constraints e permissões
│   ├── diagrama-er.md      # Diagrama Mermaid das oito entidades
│   ├── apresentacao-checkpoint1.md # Roteiro prático de demonstração
│   └── checkpoint1-checklist.md   # Checklist de revisão do Checkpoint 1
├── frontend/               # Aplicação Angular (área dos usuários finais)
├── requirements.txt
├── manage.py
└── .gitignore
```

Os três apps estão registrados em `INSTALLED_APPS`. Em cada app, a API segue a mesma divisão: `serializers.py` (conversão e validação dos dados), `views.py` (endpoints), `urls.py` (rotas, incluídas sob `/api/` em `config/urls.py`) e arquivos `test_*.py`. A gestão de reservas fica em `reservas/views_gestao.py`, com a permissão de perfil em `reservas/permissions.py`.
