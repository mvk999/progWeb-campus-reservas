# Decisões de backend e fronteiras de validação

Leia somente as seções ligadas à tarefa. A lista de entidades/campos e as regras acordadas estão no AGENTS raiz. Referências técnicas e data de consulta: `docs/agentes/fontes.md`.

## Usuário e migrations

Antes da primeira aplicação de migrations de autenticação, configure `Usuario(AbstractUser)` e `AUTH_USER_MODEL`. O usuário substituto deve nascer na migration inicial do app `usuarios`. Use `settings.AUTH_USER_MODEL` nas relações e `get_user_model()` onde o modelo concreto precisa ser resolvido em execução.

A etapa C1.02 pode criar a configuração sem aplicar migrations; C1.03 fecha o usuário antes de aplicá-las. Não execute `migrate` por hábito no scaffold inicial se isso cristalizar o usuário padrão. Se já existe banco com migrations aplicadas, diagnostique o histórico e proponha a correção compatível; não apague o banco ou migrations compartilhadas.

Migrations de ambiente/equipamento precedem as que dependem deles. Revise dependências, defaults, reversibilidade pertinente e efeitos em dados existentes. `makemigrations --check --dry-run` verifica divergências de modelo; não prova aplicação da migration nem substitui teste de base limpa.

## Integridade local

Para capacidade, quantidade, intervalo e unicidade, considere a validação legível em Python e a constraint persistida coerente com a versão de Django/banco adotada. Valores inválidos devem ser rejeitados no caminho usado pela aplicação. Não considere apenas `PositiveIntegerField` como prova de que zero está proibido quando a regra é maior ou igual a um.

`save()` não chama `full_clean()` automaticamente. `bulk_create`, `QuerySet.update` e ações em lote também merecem atenção se podem contornar uma regra. Não resolva isso com uma sobrescrita universal de `save()` sem analisar os caminhos e os efeitos; coloque a regra na fronteira apropriada e teste o que ela promete.

Teste separadamente uma validação Python e uma rejeição efetiva do banco quando ambas forem alegadas. Use isolamento transacional apropriado para não deixar a conexão de teste inutilizável após um `IntegrityError`. Verifique que a linha inválida não foi persistida.

Avalie `on_delete` conforme o histórico do domínio; proteja referências de reservas quando necessário. CADASTRO/CRUD não implica apagar em cascata o histórico. Exclusão protegida precisa produzir resultado compreensível, não erro interno. Não mude a política global de exclusão para fazer um teste passar.

## Admin e permissões

Mantenha o registro funcional dos modelos e, quando fizer sentido, `list_display`, `list_filter`, `search_fields`, `ordering` e inlines da intermediária. Use rótulos coerentes com o domínio e dados que permitam demonstrar os filtros. Não crie filtros artificiais somente para aumentar a contagem.

Grupos expressam permissões de modelo; a propriedade do ambiente/reserva exige limitação por objeto nas operações expostas. O `ModelBackend` padrão não implementa automaticamente uma política de acesso por objeto porque existe uma FK `responsavel`. Confira listagem, detalhe, escrita, ações em lote, campos de relacionamento e buscas auxiliares do Admin que forem acessíveis ao papel.

Não exponha campos de privilégio a quem não deve gerenciá-los. `is_staff` permite entrar no Admin quando as demais condições atendem; não é o perfil de solicitante/responsável nem substitui a política de ações. Testar somente como superusuário mascara falta de permissão e vazamento de objetos.

Dados de demonstração devem ser sintéticos e reproduzíveis. Um comando de população, se solicitado, deve informar seu efeito e evitar duplicação involuntária na repetição. Senhas reais não entram no Git; não conceda superusuário a todos para simplificar a apresentação.

## Disponibilidade — respeitar a fase

O C1 exige a modelagem e integridade local, com uma validação simples de conflito somente quando a tarefa a incluir. As decisões seguintes orientam análise/testes do fluxo funcional no C2; não autorizam implementá-lo agora.

- Intervalos são `[inicio, fim)`: existe conflito quando `existente.inicio < novo.fim` e `existente.fim > novo.inicio`. Reservas consecutivas são permitidas. Em atualização, evite autoconflito excluindo o próprio registro.
- APROVADA ocupa; PENDENTE disputa sem consumir definitivamente; REJEITADA/CANCELADA não ocupa. Preserve histórico de CONCLUIDA conforme a política documentada.
- Confira ambiente ativo, bloqueios e estoque no momento da decisão que consome disponibilidade, não apenas quando o formulário abre.
- Para estoque compartilhado, confira demanda simultânea no intervalo, incluindo quantidade nova. Somar indiscriminadamente todas as reservas que intersectam um intervalo amplo pode rejeitar reservas válidas. Discuta/documente a precisão exigida antes de implementar esse algoritmo.
- Mudanças de quantidade/intervalo/ambiente de reserva aprovada, redução de estoque e bloqueio novo sobre reserva existente precisam de política explícita quando entrarem na tarefa. Não invente resolução automática ou cancelamento de histórico.
- Defina transições e atores permitidos conforme o caso solicitado. Proteja metadados de decisão contra falsificação e confirme que uma operação repetida não duplica efeito.
- `transaction.atomic()` não prova sozinho prevenção de dupla aprovação. SQLite não implementa o bloqueio de linha prometido por `select_for_update()`. Escolha mecanismo coerente com o banco e demonstre a garantia alegada; registre limites, sem trocar de banco por iniciativa própria.

## Fronteiras de teste

Uma tarefa de modelagem pede casos válidos e limites relevantes, não toda a aplicação. Uma tarefa de Admin pede acesso, formulário e filtro pertinentes. Uma operação C2 que altera disponibilidade pede prova de autorização, conflito e persistência. Se a implementação depende de decisão ainda ausente, entregue a lacuna concreta ao coordenador em vez de codificar uma política acidental.
