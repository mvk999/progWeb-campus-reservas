---
name: campus-frontend
description: "Trabalhe no visual do Jazzmin no C1 ou em Angular e Bootstrap no C2 autorizado do Campus Reservas."
---

# Frontend do Campus Reservas

Leia `AGENTS.md`, `README.md` e `docs/agentes/protocolo.md` na raiz do repositório. Identifique fase, tarefa e contrato existente antes de implementar. Uma solicitação para preparar agentes não autoriza criar telas ou instalar dependências.

## Selecione o modo

- **C1 — Admin:** personalize a apresentação do Django Admin com Jazzmin na etapa solicitada. Leia a seção Admin de [references/interface.md](references/interface.md). A ausência de uma tarefa visual independente pode significar aguardar o backend ou entregar um parecer, sem iniciar Angular.
- **C2 autorizado — usuários finais:** implemente Angular com Bootstrap 5, navegação e estados completos. Leia as seções Angular, temas e validação da mesma referência. Confirme o contrato com integração antes de conectar a tela ao servidor.

## Trabalho

1. Inspecione a interface real, as versões e os padrões existentes. Se ainda não há aplicação, não descreva uma tela imaginada como observada. Consulte `docs/agentes/requisitos.md` nos IDs da tarefa.
2. Combine arquivos de escrita com o coordenador. `admin.py` pertence ao backend; `settings.py`, dependências e ligação global do Jazzmin têm um escritor combinado com integração. Não crie uma arquitetura extra só para repartir arquivos.
3. Preserve os controles funcionais, mensagens de erro e permissões do Admin. No C2, estados de carregamento, vazio, sucesso, falha, sessão expirada e acesso negado devem corresponder ao fluxo solicitado.
4. Use o contrato real para campos, enumerações, datas, métodos e erros. Se precisar de dados simulados, declare onde são usados, mantenha-os fora do caminho alegado como integrado e entregue a dependência pendente.
5. Proteja a interface com semântica, labels, foco visível e uso por teclado. Botões ocultos e guards ajudam a navegação; o servidor precisa aplicar autorização.
6. Valide a tarefa no navegador em tamanhos representativos e nos temas aplicáveis. Registre URL, papel do usuário, passos, resultado e evidência. Um build bem-sucedido prova compilação; uma captura sozinha não prova interação ou persistência.

## Entrega

Informe arquivos, modo C1/C2, comportamento visual observado, uso eventual de mocks, contrato consumido, verificações e limitações. Devolva divergências de contrato à integração com uma requisição/reprodução mínima. Não amplie a API por conta própria nem declare a tela integrada antes do fluxo real.
