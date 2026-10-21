# Referências usadas para projetar a equipe

Consultadas em **19/10/2026**. São referências oficiais de formato e comportamento técnico, sem instalação automática de serviços, plugins ou dependências. As decisões de produto e de fase vêm do enunciado e do AGENTS do repositório.

## Agentes e skills

- [Subagents — configuração local e coordenação](https://learn.chatgpt.com/docs/agent-configuration/subagents): fundamenta os quatro TOMLs em `.codex/agents/`, a herança da sessão e a necessidade de coordenar escritores. O formato consultado usa `name`, `description` e `developer_instructions`; não foi criado um manifesto fictício de agentes nem configurado sandbox separado no validador.
- [Build skills — descoberta local](https://learn.chatgpt.com/docs/build-skills): fundamenta `.agents/skills/`, instruções progressivas e descrições curtas para selecionar o fluxo certo.
- [Rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): inspiração para reduzir instruções redundantes e manter a entrada de cada skill focada. Os detalhes do domínio ficam em referências específicas e nas decisões centrais do projeto.
- [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills): inspiração para avaliar pedidos reais, seleção equivocada de papel, limites de fase e aceitação de provas insuficientes. Ver [avaliacao.md](avaliacao.md) para o que realmente foi executado neste pacote.

A skill `skill-creator` local guiou a criação, a geração de metadados de interface e a validação estrutural. As instruções não fixam modelo nem esforço de raciocínio; esses ajustes seguem a preferência da sessão e a disponibilidade do usuário.

## Django e Admin

As páginas Django 5.2 abaixo foram consultadas para princípios concretos, **sem decidir a versão do projeto**, que ainda não tem dependências instaladas. Na implementação, selecionar uma combinação Python/Django/Jazzmin compatível e consultar a documentação correspondente.

- [Customizing authentication](https://docs.djangoproject.com/en/5.2/topics/auth/customizing/): usuário substituto e limites das permissões por objeto fornecidas pelo backend padrão.
- [Model instance reference](https://docs.djangoproject.com/en/5.2/ref/models/instances/): diferença entre `full_clean()`, `clean()` e `save()`.
- [Databases — SQLite](https://docs.djangoproject.com/en/5.2/ref/databases/#sqlite-notes): limitações de bloqueio relevantes para não prometer concorrência apenas por usar `select_for_update()`.
- [The Django admin site](https://docs.djangoproject.com/en/5.2/ref/contrib/admin/): pontos de extensão de Admin, filtros e comportamento a verificar no fluxo real.
- [Testing tools](https://docs.djangoproject.com/en/5.2/topics/testing/tools/): escopo do cliente de teste e a opção de exigir checagens CSRF.
- [Jazzmin — Installation](https://django-jazzmin.readthedocs.io/installation/) e [Configuration](https://django-jazzmin.readthedocs.io/configuration/): precedência de templates e opções de apresentação. A presença da dependência não substitui prova visual.

## Interface e ligação Angular/Django

- [Angular — Security](https://angular.dev/best-practices/security): cooperação do HttpClient com o servidor na proteção XSRF/CSRF e ajuste dos nomes de cookie/header. Não usar o cliente como única defesa de autorização.
- [Angular — Making requests](https://angular.dev/guide/http/making-requests): referência para implementar o consumo de HTTP na versão adotada quando o C2 estiver autorizado.
- [Bootstrap — Color modes](https://getbootstrap.com/docs/5.3/customize/color-modes/): referência condicional ao Bootstrap 5.3 para tema claro/escuro e alternância. Não presume a mesma versão no Admin/Jazzmin.
- [Bootstrap — Accessibility](https://getbootstrap.com/docs/5.3/getting-started/accessibility/): componentes do framework ainda precisam ser usados com semântica, contraste e comportamento acessível no contexto da aplicação.

O protocolo de reserva de arquivos, handoff, rastreabilidade dos requisitos e veredicto é uma adaptação para este repositório, não uma exigência literal dos frameworks ou do professor.
