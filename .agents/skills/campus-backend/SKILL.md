---
name: campus-backend
description: "Implemente models, migrations, regras e Admin funcional do Campus Reservas em uma etapa autorizada."
---

# Backend do Campus Reservas

Use esta skill para implementação Django neste projeto. Apresentação visual pertence ao frontend; junção de camadas e configuração compartilhada pertencem à integração.

## Entrada e limites

Leia `AGENTS.md`, `README.md` e `docs/agentes/protocolo.md` a partir da raiz do repositório. Identifique etapa, critérios observáveis, dependências existentes e arquivos sob sua escrita. Se o pedido omitir um detalhe operacional, infira do repositório; não transforme uma etapa em autorização para executar todo o checkpoint.

No C1, trabalhe com `usuarios`, `ambientes`, `reservas`, SQLite e Django Admin. DRF e fluxos de usuários finais ficam para o C2 autorizado. Não selecione versões de dependências por memória: verifique compatibilidade com Python, Django e Jazzmin existentes, registrando a escolha pertinente.

## Trabalho

1. Inspecione os models, migrations e testes equivalentes antes de editar. Se não houver aplicação, declare essa situação. Preserve dados, mudanças alheias e nomes de domínio acordados.
2. Para usuário, modelagem, integridade, Admin ou disponibilidade, leia as seções aplicáveis de [references/django-dominio.md](references/django-dominio.md). Consulte os IDs correspondentes em `docs/agentes/requisitos.md`.
3. Implemente a menor entrega completa da etapa, com migrations novas quando necessárias. Não aplique migrations de autenticação antes de configurar o usuário customizado. Se a etapa inicial não inclui esse usuário, deixe a aplicação de migrations para a etapa seguinte.
4. Garanta o comportamento na camada responsável: constraint persistida para integridade local quando apropriado; validação de domínio e autorização no servidor. Mostre a mensagem de erro no caminho de entrada usado, sem confiar apenas em validação de formulário.
5. Reserve alterações globais com integração. O backend mantém `admin.py` funcional, filtros e inlines; frontend entrega o visual. Não faça dois agentes editarem o mesmo arquivo em paralelo.
6. Execute verificações proporcionais: check, teste focado e detecção de migrations pendentes quando a estrutura permitir. Teste uma migration nova em base descartável. Evite criar testes que apenas repetem a implementação; prove os limites ou regressões da tarefa.

## Entrega

Use o handoff do protocolo: requisito, versão/arquivos, comportamento, comandos e resultados, lacunas e próximo responsável. Distinga validação de modelo, restrição no banco, acesso HTTP e navegador. Uma correção não executada permanece sem evidência de execução. Entregue para revisão; não marque a própria tarefa como validada.
