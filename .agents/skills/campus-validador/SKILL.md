---
name: campus-validador
description: "Audite uma entrega do Campus Reservas com reprodução independente e evidências por requisito, sem alterar a implementação."
---

# Validação independente do Campus Reservas

Leia `AGENTS.md`, `README.md` e `docs/agentes/protocolo.md`. Selecione em `docs/agentes/requisitos.md` apenas a tarefa e a fase avaliadas; auditar uma etapa não significa cobrar a conclusão das próximas. Use [references/verificacao.md](references/verificacao.md) para preparar as provas pertinentes.

## Independência e versão

- Avalie a versão integrada, incluindo arquivos novos não rastreados e alterações locais relevantes. Registre HEAD, branch e identificação do conteúdo avaliado. Se a entrega mudar durante a avaliação, estabilize ou reavalie os critérios afetados.
- Não altere código, testes versionados, migrations ou configurações para fazer o resultado passar. Probes independentes, dados sintéticos e ajustes de ambiente ficam em diretório/banco descartáveis. O relatório e as evidências vão para a localização combinada.
- Não use o banco de um colega para testar exclusão, cadastro ou migrations. Verifique o caminho efetivo da base antes de rodar comandos que escrevem nela.

## Avaliação

1. Transforme cada alegação relevante em uma observação falsificável: entrada, ator, ação, resultado esperado e como conferir. Inspecione código e testes antes de executar comandos desconhecidos do repositório.
2. Reproduza o caso positivo e os casos negativos da mesma fronteira. Confira a camada alegada: Python, banco, HTTP, interface real ou GitHub. Use os cenários da referência por risco e escopo, sem executar todo o catálogo para cada ajuste.
3. Registre comando exato, diretório, código de saída, quantidade de testes, falhas, skips e avisos relevantes. Zero testes ou todos os testes pertinentes ignorados não validam comportamento. Resultado herdado de outra revisão não substitui reprodução da versão atual.
4. Para Admin/filtros, use registros contrastantes e confira os resultados. Para autorização, inclua acesso direto como usuário sem privilégio, não apenas superusuário. Para alegação visual, inspecione o navegador; se indisponível, deixe esse critério sem verificação.
5. Se houver falha, registre reprodução mínima, resultado real, impacto e papel responsável. Não silencie erro, enfraqueça teste ou aceite nova funcionalidade como justificativa para regressão.

## Veredicto

Use `ATENDE`, `FALHA`, `NÃO VERIFICADO` ou `NÃO SE APLICA` por critério, com motivo e evidência. A tarefa só pode receber `VALIDADO` quando todos os critérios aplicáveis atendem. Diferencie `REPROVADO` (falha observada) de `INCONCLUSIVO` (prova indispensável ausente). Não estime nota do professor nem dê aprovação externa em nome do grupo.

Use o modelo de relatório do protocolo. Após correção, confira a nova versão e rode os casos afetados; não reutilize automaticamente o veredicto anterior. Expresse o limite da conclusão: quais fluxos, perfis, ambiente e fase foram realmente verificados.
