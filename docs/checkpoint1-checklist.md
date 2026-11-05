# Checklist final — Checkpoint 1

Revisão da versão entregue no Checkpoint 1. Esta lista registra o estado observado; não estima a nota do professor nem substitui aprovação acadêmica.

## Versão e evidências

- Revisão de 05/11/2026 sobre a branch `main`, HEAD `3d633c46ab6f6901b3ee86d89b3921dc45198c6c` (merge da `develop`, que integra o pull request #1 `feature/validacao-conflitos`). Nesse ponto `main` e `develop` têm o mesmo conteúdo.
- Ambiente: Python 3.13, Django 5.2.18, Jazzmin 3.0.5, em venv novo com `pip install -r requirements.txt`.
- Banco usado para migrations, comandos e verificações: SQLite descartável, fora do projeto. O `db.sqlite3` local não foi usado.
- `check` e `makemigrations --check --dry-run` sem erros; suíte completa com **163 testes, 0 falhas, 0 erros e 0 skips** (18 em `usuarios`, 20 em `ambientes`, 125 em `reservas`); migrations aplicadas do zero; `PRAGMA foreign_key_check` vazio e `PRAGMA integrity_check` igual a `ok`.

## Matriz de conformidade

| Requisito | Situação | Evidência observada | Responsável por pendências |
| --- | --- | --- | --- |
| C1-MOD — modelagem, relações, migrations e ER | **ATENDE** | Oito modelos conferidos com migrations e diagrama ER. Migrations aplicadas do zero em banco descartável; chaves estrangeiras e integridade SQLite verificadas. As regras novas não alteraram o esquema (nenhuma migration nova). | — |
| C1-ADM — Django Admin autenticado e operações administrativas | **ATENDE** | Oito modelos registrados. Testes HTTP cobrem anônimo, usuário comum, staff sem permissão (403), usuário autorizado, rejeição de POST sem token CSRF e as mensagens de erro das regras de disponibilidade nos formulários e no inline. | — |
| C1-TEM — Jazzmin e apresentação administrativa | **ATENDE** | Jazzmin 3.0.5 instalado antes de `django.contrib.admin`; testes de `reservas/test_jazzmin.py` passaram. A inspeção visual (temas claro/escuro e viewport 390 × 844) foi registrada na revisão C1.14 e não foi repetida nesta revisão. | Conferir no computador da apresentação |
| C1-FIL — filtros, buscas, listagens e inline | **ATENDE** | Filtros e pesquisas testados com dados contrastantes em ambientes, equipamentos, reservas, bloqueios e associações. Reservas passaram a ser navegadas e filtradas pela data de início. | — |
| C1-COM — complexidade implementada | **ATENDE** | Além de FKs protegidas, N:N com quantidade, cinco estados, constraints e grupos/permissões, o backend valida: conflito entre reservas aprovadas, aprovação durante bloqueio, estoque de equipamentos por horário, recursos e usuários inativos, coerência dos dados de avaliação e preservação de reservas concluídas; o Admin alerta sobre reservas aprovadas ao criar bloqueios. | — |
| DOC-01 — README e documentação | **ATENDE** | README com nome, integrantes, descrição, tecnologias, instalação, execução, funcionalidades e estrutura, separando implementado de planejado. README, modelagem, roteiro e este checklist atualizados para as regras de disponibilidade. | — |
| GIT-01 — repositório público, `main` e `develop` | **ATENDE** | API pública do GitHub informou `private: false` e branch padrão `main`. A `main` contém a versão integrada do Checkpoint 1. | — |
| GIT-02 — branches de funcionalidade | **ATENDE** | O grupo adotou o padrão `feature/nome-da-funcionalidade` para a exigência de branches `feature`: há 16 branches `feature/*` criadas a partir de `develop` e integradas por merge, incluindo o pull request #1. | — |
| GIT-03 — commits próprios de cada integrante | **ATENDE** | `git shortlog -sne --no-merges` em `3d633c4`: Marcos 48 commits (incluindo 1 com alias GitHub), Lana 9 e Arthur 4. Todos têm ao menos dois commits. | — |
| GIT-04 — integrantes como colaboradores | **ATENDE** | Marcos, Arthur e Lana constam como colaboradores do repositório, conforme conferido pelo grupo em 05/11/2026. | — |
| Aprovação do tema pelo professor | **NÃO VERIFICADO** | Não há confirmação registrada no repositório. | Grupo / professor |
| Envio do link no Campus Virtual | **NÃO VERIFICADO** | Prazo informado: 05/11/2026 às 12h00. Esta revisão não acessa o Campus Virtual. | Grupo |

**Observação:** a `main` também contém `frontend/`, com o workspace inicial do Angular (sem telas de domínio, autenticação ou chamadas à API). Ele não faz parte dos critérios do Checkpoint 1; as telas e a integração pertencem ao Checkpoint 2.

## Verificações reproduzidas

Na branch `main` (`3d633c4`):

```text
python manage.py check                            → sem problemas
python manage.py makemigrations --check --dry-run → nenhuma migration pendente
python manage.py test                             → 163 testes, 0 falhas, 0 erros, 0 skips
python manage.py migrate                          → migrations aplicadas em SQLite descartável
python manage.py configurar_perfis (2 vezes)      → grupos configurados; segunda execução sem mudanças
python manage.py popular_demo (2 vezes)           → dados sintéticos criados; segunda execução sem registros novos
full_clean() nos 25 registros de ambientes/reservas do demo → todos válidos pelas regras atuais
PRAGMA foreign_key_check                          → []
PRAGMA integrity_check                            → ok
git diff --check                                  → limpo
```

## Pendências para o grupo antes da apresentação

1. Confirmar com o professor a aprovação do tema.
2. Repetir a inspeção visual do Admin (tema claro/escuro e tela estreita) no computador da apresentação.
3. Enviar o link público do repositório no Campus Virtual até 05/11/2026 às 12h00.

## Veredicto

**Requisitos técnicos do Checkpoint 1 atendidos** na versão da `main` verificada: modelagem, Admin, Jazzmin, filtros, repositório público com `main`, `develop` e branches `feature/*`, colaboradores, commits de todos os integrantes, documentação e complexidade, com a suíte completa passando. Permanecem apenas a aprovação do tema e o envio do link no Campus Virtual.

## Histórico de revisões

| Data | Versão | Resultado |
| --- | --- | --- |
| 03/11/2026 | `develop` em `c9b9676` (revisão C1.14) | 119 testes; reprovado apenas por falta de commits de Arthur e Lana e pelo README inicial na `main`. |
| 04/11/2026 | `5bb1474` (revalidação de Arthur) | 120 testes, incluindo a rejeição de POST sem token CSRF. |
| 05/11/2026 | `main` em `3d633c4` | 163 testes, com as regras de disponibilidade; pendências anteriores de autoria e README resolvidas. |
