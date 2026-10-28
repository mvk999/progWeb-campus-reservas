# Campus Reservas

## Integrantes

- Marcos Vinícius Pereira
- Arthur Soares Marques
- Lana da Silva Miranda

## Descrição

O Campus Reservas é um sistema web para gerenciar reservas de ambientes e equipamentos universitários. Solicitantes poderão pedir reservas; responsáveis poderão avaliar pedidos dos ambientes sob sua responsabilidade; administradores poderão gerenciar os recursos do sistema.

O projeto está em desenvolvimento para o Checkpoint 1 da disciplina GAC116 — Programação Web. A etapa C1.02 preparou a estrutura inicial do backend Django; a C1.03 configurou a autenticação nativa com o modelo customizado `usuarios.Usuario`. Os modelos de ambientes, equipamentos e reservas serão implementados nas etapas seguintes.

## Tecnologias

| Área | Tecnologia | Situação |
| --- | --- | --- |
| Backend | Python 3.12 e Django 5.2.18 | Estrutura inicial e modelo customizado de usuário configurados; modelos de domínio ainda não implementados. |
| Banco de dados | SQLite relacional | Configurado para execução local. |
| Administração | Django Admin | Compatível com `usuarios.Usuario`; requer migrations aplicadas e superusuário criado. A personalização Jazzmin será feita em etapa posterior. |
| Frontend | Angular | Reservado para o Checkpoint 2. |
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

O arquivo `requirements.txt` fixa Django 5.2.18. Nenhuma outra biblioteca externa é necessária nesta etapa.

## Configuração e execução

As configurações locais podem ser fornecidas por variáveis de ambiente. A chave padrão do projeto é exclusiva para desenvolvimento local; defina uma chave própria fora do repositório para qualquer outro ambiente.

Linux ou macOS:

```bash
export DJANGO_SECRET_KEY='substitua-por-uma-chave-local'
export DJANGO_DEBUG=1
python manage.py check
python manage.py runserver
```

Windows PowerShell:

```powershell
$env:DJANGO_SECRET_KEY = 'substitua-por-uma-chave-local'
$env:DJANGO_DEBUG = '1'
python manage.py check
python manage.py runserver
```

O servidor local ficará disponível em `http://127.0.0.1:8000/`. O caminho `/admin/` usa a autenticação nativa do Django e o modelo customizado `usuarios.Usuario`.

## Banco de dados e conta administrativa

O projeto configura `AUTH_USER_MODEL = "usuarios.Usuario"` antes das migrations iniciais. Em um ambiente novo, aplique as migrations e crie uma conta administrativa:

```bash
python manage.py migrate
python manage.py createsuperuser
```

O modelo herda de `AbstractUser`, mantém autenticação por nome de usuário e senha com hash e oferece suporte aos mecanismos nativos de Groups e Permissions. A definição dos grupos de Administrador, Responsável e Solicitante e suas permissões específicas fica para a etapa C1.11. Telas de login/cadastro de usuários finais não fazem parte desta etapa e permanecem planejadas para o Checkpoint 2.

## Funcionalidades

### Implementado

- Estrutura inicial do projeto Django e dos apps `usuarios`, `ambientes` e `reservas`.
- Configuração do SQLite e do fuso `America/Sao_Paulo`, com `USE_TZ=True`.
- Modelo `usuarios.Usuario`, baseado em `AbstractUser`, configurado como `AUTH_USER_MODEL`.
- Autenticação nativa do Django, com suporte a senha segura, superusuários, Groups e Permissions.
- Migrations iniciais configuradas para uma base nova.

### Planejado

- Grupos e permissões específicos para os perfis do sistema (C1.11).
- Cadastro de ambientes e equipamentos.
- Solicitação, avaliação, cancelamento e consulta de reservas.
- Controle de disponibilidade e bloqueios.
- Django Admin personalizado com Jazzmin.
- Interface de usuário com Angular e Bootstrap 5 no Checkpoint 2.

## Estrutura do backend

```text
.
├── config/                 # Settings, URLs e gateways ASGI/WSGI
├── usuarios/               # App de usuários com Usuario; grupos e permissões específicos em etapas posteriores
├── ambientes/              # App de ambientes e equipamentos
├── reservas/               # App de reservas
├── docs/                   # Documentação do projeto
├── requirements.txt
├── manage.py
└── .gitignore
```

Os três apps estão registrados em `INSTALLED_APPS`. A pasta `frontend/` será criada no Checkpoint 2.
