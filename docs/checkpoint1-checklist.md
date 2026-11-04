# Checklist final — Checkpoint 1

Revisão técnica C1.14. Esta lista registra o estado observado; não estima a nota do professor nem substitui aprovação acadêmica.

## Versão e evidências

- Branch de integração remota: `develop`, HEAD `c9b9676a73fa63cfeb040c877b1f37b9bcd28e95`.
- A branch pública `origin/develop` foi consultada diretamente e estava nesse HEAD. O clone descartável de `develop` reproduziu o mesmo hash.
- Ambiente: Python 3.12.3, Django 5.2.18, Jazzmin 3.0.5.
- Banco usado para migrations, comandos e verificações: SQLite descartável em `/tmp/campus-c114-clean.sqlite3`. O `db.sqlite3` local não foi usado.
- Baseline independente: `check` e `makemigrations --check --dry-run` sem erros; suíte completa com **119 testes, 0 falhas e 0 skips**; `git diff --check` limpo; migrations aplicadas do zero; `PRAGMA foreign_key_check` vazio e `PRAGMA integrity_check` igual a `ok`.
- Instalação reproduzida em clone temporário da branch `develop`, com venv novo e `pip install -r requirements.txt`; `pip check` não encontrou dependências quebradas.

## Matriz de conformidade

| Requisito | Situação | Evidência observada | Responsável por pendências |
| --- | --- | --- | --- |
| C1-MOD — modelagem, relações, migrations e ER | **ATENDE** | Oito modelos conferidos com migrations e diagrama. Migrations aplicadas do zero; chaves estrangeiras e integridade SQLite verificadas. | — |
| C1-ADM — Django Admin autenticado e operações administrativas | **ATENDE** | Oito modelos registrados. Provas HTTP cobriram anônimo, usuário comum, staff sem permissão (403) e usuário autorizado. No Chrome, foi criado um bloqueio e uma reserva com `ReservaEquipamento`; quantidade e associação persistiram no banco descartável. | — |
| C1-TEM — Jazzmin e apresentação administrativa | **ATENDE** | Jazzmin 3.0.5 carregado no Admin; login, Dashboard e navegação observados em Chrome/CDP. Temas claro e escuro renderizaram; viewport mobile testado em 390 × 844. | — |
| C1-FIL — filtros, buscas, listagens e inline | **ATENDE** | Com dados contrastantes, categoria de ambiente retornou 1 de 3, busca de equipamento retornou `DEMO-EQP-01`, filtro inativo retornou somente `DEMO-EQP-04` e status `APROVADA` retornou 1 reserva. Os 16 testes focados de filtros, pesquisa e inline passaram. | — |
| C1-COM — complexidade implementada | **ATENDE** | Oito entidades, FKs protegidas, relação N:N com quantidade, cinco estados, constraints, grupos/permissões e Admin com filtros e inline foram inspecionados e exercitados. Disponibilidade temporal e fluxos finais continuam corretamente planejados. | — |
| DOC-01 — README em `develop` | **ATENDE** | README contém nome, integrantes declarados, descrição, tecnologias, instalação, execução, funcionalidades e estrutura; separa implementado de planejado. Documentação de modelos, ER e apresentação confere com o código. | — |
| GIT-01 — repositório público e `develop` remota | **ATENDE** | API pública informou `private: false`; consulta ao remoto confirmou `develop` em `c9b9676a73fa63cfeb040c877b1f37b9bcd28e95` e `main` em `b657f4eed0e60b0d34f364f6cbda5914ab252f19`. | — |
| GIT-02 — convenção `feature/*` | **NÃO VERIFICADO** | As branches remotas usam `feature/*`, conforme decisão do grupo. O enunciado original menciona uma branch literal `feature`; a confirmação dessa divergência com o professor não está registrada. | Grupo / professor |
| GIT-03 — colaboração e dois commits próprios por integrante | **FALHA** | `git shortlog -sne --all` nas refs locais disponíveis atribui 60 commits a Marcos (59 com e-mail institucional e 1 alias GitHub); não há autoria registrada de Arthur ou Lana. A API de colaboradores exige autenticação (HTTP 401), então a associação de cada pessoa à lista de colaboradores não foi conferida. Nenhuma autoria foi alterada. | Arthur, Lana e grupo |
| README na branch padrão do GitHub | **FALHA** | A branch padrão remota é `main` (`b657f4e`), cujo README ainda descreve a aplicação como não implementada. O README completo está em `develop`. `main` não foi alterada nesta revisão. | Grupo; decidir como apresentar o link sem alterar `main` nesta tarefa |
| Aprovação do tema pelo professor | **NÃO VERIFICADO** | Não há confirmação no repositório nem na sessão. | Grupo / professor |
| Envio do link no Campus Virtual | **NÃO VERIFICADO** | A auditoria confirma o endereço público, mas não acessa nem submete ao Campus Virtual. Prazo informado: 05/11/2026 às 12h00. | Grupo |

## Verificações reproduzidas

No clone temporário da branch `develop`:

```text
python manage.py check                         → sem problemas
python manage.py makemigrations --check --dry-run → nenhuma migration pendente
python manage.py test                          → 119 testes, 0 falhas, 0 skips
python manage.py migrate --noinput             → migrations aplicadas em SQLite descartável
python manage.py configurar_perfis              → três grupos criados
python manage.py popular_demo                   → dados sintéticos criados
python manage.py popular_demo                   → nenhum registro duplicado
python manage.py createsuperuser --noinput      → superusuário temporário criado
PRAGMA foreign_key_check                       → []
PRAGMA integrity_check                         → ok
git diff --check                               → limpo
```

O comando de demonstração criou categorias, ambientes, usuários, equipamentos (incluindo um inativo), reservas nos cinco estados, associações e bloqueio. A segunda execução não duplicou registros. A senha usada para criar o superusuário descartável foi gerada em memória e não foi registrada no projeto.

## Pendências para o grupo antes da apresentação

1. Arthur e Lana devem registrar contribuições reais próprias no repositório; depois, conferir as autorias e a lista de colaboradores autenticada. Não alterar autores ou datas de commits existentes.
2. Conferir com o professor a divergência entre `feature` literal e `feature/*` e confirmar a aprovação do tema.
3. Para apresentar o código atual, usar o endereço da branch integrada: <https://github.com/mvk999/progWeb-campus-reservas/tree/develop>. O endereço raiz do repositório abre `main`, cujo README ainda é inicial.
4. Enviar o link público no Campus Virtual até 05/11/2026 às 12h00; esta revisão não realizou a submissão.

## Veredicto

**REPROVADO para declarar todos os requisitos do Checkpoint 1 concluídos**, exclusivamente pelas falhas registradas no critério GIT-03 e no README da branch padrão. A versão de aplicação em `develop` passou nas verificações técnicas, administrativas, de integridade, documentação dessa branch e inspeção visual acima. As confirmações externas permanecem pendentes. Não implemente funcionalidades do Checkpoint 2.

## Revalidação da suíte em 04/11/2026

Arthur executou esta revalidação na branch `feature/validacao-checkpoint1-arthur`, sobre o código do commit `5bb1474`:

```text
Teste focado de POST no Admin sem token CSRF → 1 teste aprovado
python manage.py test                     → 120 testes, 0 falhas, 0 erros, 0 skips
System check do Django                    → sem problemas
git diff --check                          → limpo
```

Ambiente: Python 3.12.14 e Django 5.2.18, em ambiente temporário. O banco de teste foi criado pela suíte e descartado ao final; o banco local do projeto não foi usado. O total de 120 testes inclui o novo caso de rejeição do POST sem token CSRF.
