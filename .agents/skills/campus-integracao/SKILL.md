---
name: campus-integracao
description: "Integre entregas e contratos Django/Admin ou Django/Angular do Campus Reservas, conforme a fase autorizada."
---

# Integração do Campus Reservas

Leia `AGENTS.md`, `README.md`, `docs/agentes/protocolo.md` e os IDs aplicáveis de `docs/agentes/requisitos.md`. Trabalhe na junção necessária para a tarefa, sem absorver o desenvolvimento inteiro nem substituir a revisão independente.

## Trabalho

1. Faça um mapa curto das dependências existentes: entrega de cada papel, arquivos compartilhados, versão avaliada e pendências reais. Aceite handoffs como relatos a conferir, não como prova final.
2. Defina um único escritor por arquivo. Reserve `settings.py`, URLs globais, dependências/lockfiles, configuração global de Jazzmin e README quando a tarefa os envolver. Se você estiver coordenando e implementando, explicite esse acúmulo no pacote de trabalho.
3. No C1, una a configuração Django, apps, migrations, usuário, Admin/Jazzmin e demonstração da etapa. Respeite a configuração de `AUTH_USER_MODEL` antes da primeira aplicação de migrations de autenticação. Não crie API, CORS ou frontend como preparação especulativa.
4. No C2 autorizado, feche primeiro o contrato mínimo descrito em [references/contratos.md](references/contratos.md). Diferencie proposta de comportamento implementado. Backend e frontend precisam trabalhar com os mesmos campos, permissões e erros.
5. Integre entregas em sequência quando compartilham árvore, ambiente ou banco. Não troque branches, aplique migrations compartilhadas ou instale dependências enquanto outro agente usa esses recursos. Worktrees só isolam código quando realmente criadas; não isolam automaticamente banco, portas ou ambiente virtual.
6. Execute o caminho integrado da tarefa com o processo e banco descartáveis combinados. Para falha interna de componente, envie reprodução ao dono; corrija nesta função somente as conexões dentro do seu escopo. Não mascare falha de contrato com fallback silencioso, permissões abertas ou CSRF desativado.
7. Confira setup e execução documentados a partir do estado entregue. Não declare clonagem limpa, GitHub público, branches remotas ou colaboração com base apenas na árvore local.

## Entrega

Forneça ao validador a versão integrada, critérios, ambiente necessário, contas sintéticas por papel, comandos reproduzíveis e lacunas. Revise somente os critérios afetados se houver correções posteriores. Commit, merge, push, publicação e envio acadêmico dependem da autorização aplicável; preparar esta equipe não autoriza essas ações.
