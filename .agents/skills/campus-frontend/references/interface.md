# Interface por fase

Consulte `docs/agentes/fontes.md` para documentação técnica; confira sempre a versão realmente adotada. Bootstrap 5 é a escolha para a área Angular; não presuma que o Jazzmin usa essa mesma versão internamente.

## Admin/Jazzmin no C1

Trabalhe sobre Admin funcional quando disponível. Use a configuração e os pontos de extensão do Jazzmin compatíveis com as dependências escolhidas; evite copiar o Admin inteiro ou editar arquivos dentro do pacote instalado. A instalação deve respeitar a precedência de templates exigida pelo tema.

Combine com integração a alteração global de dependências, `INSTALLED_APPS`, `JAZZMIN_SETTINGS`, opções de UI e recursos estáticos. O responsável por `admin.py` continua cuidando de registro, filtros, campos e permissões. Se uma tarefa incluir ambos, transfira arquivos de modo explícito e execute sequencialmente.

Na inspeção, confira a tela autenticada, identidade da aplicação, navegação, listagem, formulário, mensagens de erro, inlines e filtro relacionados à tarefa. Verifique os recursos estáticos e a aparência efetiva; ter `jazzmin` instalado não comprova template personalizado em uso. Não acrescente Bootstrap 5 ao Admin indiscriminadamente, pois isso pode conflitar com os recursos do tema.

Tema claro/escuro é obrigatório na versão final. No C1, a exigência específica é Admin personalizado; não use a meta visual final como pretexto para criar Angular. Se a tarefa pedir temas do Admin, use as opções do Jazzmin e verifique o resultado na versão instalada.

## Angular no C2 autorizado

Antes de criar a aplicação, confirme o estágio liberado e a configuração Angular escolhida. Se já existe frontend, siga as convenções efetivas, incluindo componentes, formulários, roteamento e ferramentas de teste; não faça migração de arquitetura ou versão por preferência.

Comece pelo fluxo solicitado, com conteúdo de domínio em português e navegação coerente. Use modelos tipados compatíveis com o contrato do servidor; não misture dados do usuário, payload de escrita e resposta administrativa que exponha campos de privilégio.

Preveja estados que afetam o fluxo: carregamento, lista vazia, erro de campo, erro geral, envio em andamento, sucesso, conflito de horário/estoque, sessão expirada e falta de permissão quando aplicáveis. Impeça envio duplicado no estado de espera sem remover a proteção correspondente no servidor. Exiba o erro real de forma compreensível, sem transformar falhas em dados vazios fictícios.

Guards e visibilidade de menus não asseguram acesso por objeto. O usuário pode chamar a API diretamente; integre testes negativos no backend com o validador. Após logout, limpe os dados visíveis de sessão e confira a navegação protegida, inclusive recarregamento e histórico quando pertinentes.

Datas precisam de conversão explícita entre a entrada local e o valor com fuso do contrato. Não use um `datetime-local` sem decidir o fuso nem elimine o offset da resposta silenciosamente. Mantenha rótulos de horário compreensíveis em `America/Sao_Paulo`.

## Temas, responsividade e acesso

Use componentes e tokens Bootstrap da versão adotada. Se utilizar a abordagem de color modes do Bootstrap 5.3, confirme que essa versão está instalada e conecte o controle de preferência; a mera inclusão do CSS não cria um alternador. Evite cores fixas que apaguem texto/controles no tema escuro.

Defina contraste, foco visível, labels, erros associados aos campos e operação por teclado para os componentes alterados. Não dependa só de cor para transmitir status da reserva. Modais e menus precisam de foco e fechamento previsíveis quando fizerem parte do fluxo.

Inspecione ao menos um tamanho estreito e um amplo relevantes à mudança. Confira tabelas longas, formulários, mensagens, menus e zoom quando houver risco de corte. Não imponha um número de breakpoints ou capturas sem benefício para a tarefa.

## Ligação real e demonstração

Integração define origem, rotas, sessão, CSRF e formato de erros com backend/frontend. O HttpClient Angular oferece a parte cliente do mecanismo XSRF, mas o servidor precisa emitir/verificar o token. Nomes padrão Angular e Django podem divergir; não desative proteção para obter uma resposta 200. Detalhes pertencem ao contrato da tarefa.

Mocks podem destravar um componente delimitado se o contrato proposto estiver claro. Identifique arquivos/mecanismo e o estado ainda não integrado; evite fallback para mock quando a API falha. O caminho final deve consumir o servidor real.

Para validar: registre versão, URL, papel sintético, tema, viewport, passos e resultado observado. Build/teste unitário não substitui interação no navegador, e screenshot não prova que um clique persistiu os dados. Se não há navegador disponível, entregue a parte implementada com o visual não verificado para o validador.
