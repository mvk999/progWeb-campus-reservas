# Campus Reservas

## Integrantes do grupo

- Marcos Vinícius Pereira
- Arthur Soares Marques
- Lana da Silva Miranda

## Descrição do projeto

O Campus Reservas é um sistema web planejado para gerenciar reservas de ambientes e equipamentos universitários. Estudantes e professores poderão consultar ambientes, solicitar reservas e acompanhar suas solicitações. Responsáveis poderão analisar solicitações relacionadas aos ambientes sob sua responsabilidade, e administradores poderão gerenciar os recursos e usuários da plataforma.

O projeto está em desenvolvimento para o Checkpoint 1 da disciplina GAC116 — Programação Web. Neste momento, o repositório ainda não contém a aplicação implementada.

## Tecnologias utilizadas

As tecnologias abaixo foram definidas para o projeto. A coluna de situação diferencia as escolhas planejadas da configuração já presente no repositório.

| Área | Tecnologia | Situação |
| --- | --- | --- |
| Backend | Python e Django | Planejados para o Checkpoint 1; ainda não configurados. |
| Banco de dados | SQLite relacional | Escolhido para o Checkpoint 1; ainda não configurado. |
| Frontend | Angular | Planejado para o Checkpoint 2. |
| Estilização | Bootstrap 5 | Planejado para a interface do Checkpoint 2. |
| Ambiente administrativo | Django Admin e Jazzmin | Planejados para o Checkpoint 1; ainda não configurados. |
| Versionamento | Git e GitHub | Repositório Git inicializado e remoto GitHub configurado. |

Quando implementado, o backend seguirá a arquitetura MVT do Django. A interface Angular está reservada para o Checkpoint 2.

## Instruções para instalação

A configuração inicial do Django ainda não foi realizada. O repositório não possui `manage.py`, arquivo de dependências ou configuração do banco de dados. As instruções de clonagem, criação do ambiente virtual, instalação das dependências e preparação do banco serão disponibilizadas após a configuração inicial do ambiente.

## Instruções para execução

A execução da aplicação está em desenvolvimento. Como os arquivos necessários para iniciar o projeto ainda não existem, não há comandos de execução disponíveis neste momento. Esta seção será atualizada quando a infraestrutura estiver configurada.

## Principais funcionalidades previstas

As funcionalidades abaixo pertencem ao escopo planejado e não estão implementadas no estado atual do repositório:

- Cadastro e autenticação de usuários.
- Gerenciamento de ambientes universitários e equipamentos.
- Solicitação, consulta, aprovação, rejeição e cancelamento de reservas.
- Consulta de disponibilidade e verificação de conflitos entre horários.
- Bloqueio de ambientes indisponíveis e consulta ao histórico de reservas.
- Controle de acesso por grupos e permissões, com os perfis previstos:
  - **Administrador:** gerencia os recursos e usuários da plataforma.
  - **Responsável:** gerencia solicitações dos ambientes pelos quais é responsável.
  - **Solicitante:** consulta ambientes e solicita reservas.
- Ambiente administrativo baseado no Django Admin e personalizado com Jazzmin.

## Estrutura do projeto

### Estrutura existente

Atualmente, a raiz do repositório contém:

```text
.
├── AGENTS.md
└── README.md
```

### Estrutura planejada para o Checkpoint 1

O backend Django será organizado com `config/` para a configuração do projeto e os apps `usuarios/`, `ambientes/` e `reservas/`. A estrutura prevista também inclui documentação em `docs/`:

```text
.
├── config/
├── usuarios/
├── ambientes/
├── reservas/
├── docs/
├── requirements.txt
├── manage.py
├── .gitignore
├── README.md
└── AGENTS.md
```

O diretório `frontend/`, com a aplicação Angular, está reservado para o Checkpoint 2 e não faz parte da estrutura implementada nesta etapa.
