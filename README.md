# Campus Reservas

## Integrantes

- Marcos Vinícius Pereira
- Arthur Soares Marques
- Lana da Silva Miranda

## Descrição

O Campus Reservas é um sistema web para gerenciar reservas de ambientes e equipamentos universitários. Solicitantes poderão pedir reservas; responsáveis poderão avaliar pedidos dos ambientes sob sua responsabilidade; administradores poderão gerenciar os recursos do sistema.

O projeto está em desenvolvimento para o Checkpoint 1 da disciplina GAC116 — Programação Web. A etapa C1.02 preparou a estrutura inicial do backend Django. Modelos de domínio, autenticação customizada e migrations ainda serão implementados nas etapas seguintes.

## Tecnologias

| Área | Tecnologia | Situação |
| --- | --- | --- |
| Backend | Python 3.12 e Django 5.2.18 | Estrutura inicial configurada; modelos ainda não implementados. |
| Banco de dados | SQLite relacional | Configurado para execução local. |
| Administração | Django Admin | Rota inicial configurada; estará pronta para uso após a configuração de usuário e banco nas próximas etapas. |
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

O servidor local ficará disponível em `http://127.0.0.1:8000/`. Nesta etapa, o caminho `/admin/` está configurado, mas o Admin ainda depende da configuração do usuário customizado e da aplicação das migrations em etapas posteriores.

**Não execute `migrate` nesta etapa.** O modelo customizado `Usuario` deverá ser definido antes das primeiras migrations de autenticação na C1.03.

## Funcionalidades

### Implementado

- Estrutura inicial do projeto Django e dos apps `usuarios`, `ambientes` e `reservas`.
- Configuração do SQLite e do fuso `America/Sao_Paulo`, com `USE_TZ=True`.
- Rota inicial do Django Admin.

### Planejado

- Usuários, grupos e permissões.
- Cadastro de ambientes e equipamentos.
- Solicitação, avaliação, cancelamento e consulta de reservas.
- Controle de disponibilidade e bloqueios.
- Django Admin personalizado com Jazzmin.
- Interface de usuário com Angular e Bootstrap 5 no Checkpoint 2.

## Estrutura do backend

```text
.
├── config/                 # Settings, URLs e gateways ASGI/WSGI
├── usuarios/               # App de usuários (modelos em etapa posterior)
├── ambientes/              # App de ambientes e equipamentos
├── reservas/               # App de reservas
├── docs/                   # Documentação do projeto
├── requirements.txt
├── manage.py
└── .gitignore
```

Os três apps estão registrados em `INSTALLED_APPS`. A pasta `frontend/` será criada no Checkpoint 2.
