# Roteiro de apresentação — Checkpoint 1

Roteiro para demonstrar a versão do Campus Reservas implementada até C1.12. Reserve cerca de 8 a 10 minutos. A demonstração usa o Django Admin com Jazzmin e os registros sintéticos de `popular_demo`.

## Preparação

Em um clone limpo, execute na raiz do projeto:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py configurar_perfis
python manage.py popular_demo
python manage.py createsuperuser
python manage.py runserver
```

No Windows PowerShell, crie o ambiente com `py -m venv .venv` e ative-o com `.venv\Scripts\Activate.ps1`. As contas `demo.c111.*` são sintéticas, sem senha utilizável e sem `is_staff`; entre no Admin com o superusuário criado manualmente. Não coloque senha no roteiro ou em arquivo versionado.

O comando de demonstração cria categorias e ambientes de sala, laboratório e auditório; equipamentos, incluindo um inativo; cinco reservas, uma por estado; associações de equipamentos; e um bloqueio. Os horários são relativos à execução. O comando não apaga registros e pode ser repetido.

## Sequência sugerida

### 1. Apresentar objetivo e escopo

Abra o README e explique em uma frase: o sistema organiza o cadastro de ambientes e equipamentos universitários e modela solicitações de reserva. Destaque o que está implementado no C1 e que a área de usuários finais, API e fluxos funcionais de disponibilidade permanecem planejados.

### 2. Mostrar estrutura e modelo relacional

No terminal, mostre os apps `usuarios`, `ambientes` e `reservas`. Abra [o diagrama ER](diagrama-er.md) e explique:

- usuário responsável ligado a ambientes e solicitante ligado a reservas;
- categoria relacionada a vários ambientes ou equipamentos;
- reservas relacionadas a ambientes;
- relação N:N de reservas e equipamentos representada por `ReservaEquipamento`, que guarda a quantidade;
- `BloqueioAmbiente` como registro de indisponibilidade, sem verificação automática de conflitos nesta fase.

Use [a documentação da modelagem](modelagem.md) para responder sobre chaves, constraints e políticas de exclusão.

### 3. Entrar no Django Admin com Jazzmin

Abra `http://127.0.0.1:8000/admin/` e autentique-se com o superusuário criado na preparação. Mostre a identidade Campus Reservas e a navegação por Usuários, Ambientes e Reservas. Os modelos de autenticação e autorização são os nativos do Django; o tema administrativo é fornecido por Jazzmin.

### 4. Cadastrar e consultar ambientes e equipamentos

Em **Ambientes**, abra a listagem e use **Adicionar ambiente**. Cadastre um registro temporário com código ainda não utilizado, categoria demo existente, um responsável demo, localização e capacidade válida. Salve e mostre código, capacidade, localização e responsável. Se repetir a apresentação, use outro código livre; não edite registros que não sejam da demonstração.

Em **Equipamentos**, use **Adicionar equipamento** para cadastrar um item com código ainda não utilizado, categoria demo existente, quantidade total não negativa e situação ativa. Depois pesquise projetor, notebook e microfone; aplique o filtro de situação para comparar os ativos com `DEMO-EQP-04`, inativo. O estoque mostrado é compartilhado e não representa disponibilidade temporal calculada.

Volte à listagem de ambientes e aplique o filtro de categoria para mostrar salas, laboratório e auditório dos dados demo.

### 5. Demonstrar reservas, estados e inline

Abra **Adicionar reserva**. Use o ambiente cadastrado no passo anterior, um solicitante demo e um intervalo futuro com início anterior ao fim. Mantenha o status padrão `PENDENTE`. No inline, associe um equipamento com quantidade positiva; salve e confirme a persistência na listagem. Em seguida, aplique o filtro de status para mostrar que os registros demo têm resultados diferentes entre `PENDENTE`, `APROVADA`, `REJEITADA`, `CANCELADA` e `CONCLUIDA`. Mostre pesquisa por ambiente ou solicitante.

Abra a reserva aprovada de demonstração para comparar ambiente, solicitante, período e inline de equipamentos com quantidades. O inline permite consulta e edição administrativa sujeito às permissões e constraints existentes. Os estados dos dados demo não significam que o fluxo de aprovação esteja implementado.

### 6. Mostrar bloqueios e perfis

Abra a listagem de bloqueios e mostre o ambiente, intervalo, motivo e usuário criador. Em **Autenticação e autorização → Grupos**, apresente `Administrador`, `Responsável` e `Solicitante` e explique a matriz de [permissões documentada no README](../README.md#perfis-e-dados-de-demonstração): somente Administrador recebe permissões globais de modelos de domínio; associação a Responsável não limita objetos automaticamente; Solicitante não tem CRUD global. A conta do grupo Administrador também precisa de `is_staff` para entrar no Admin, que o comando de perfis não concede.

### 7. Demonstrar integridade e testes

Se houver tempo, mostre uma validação de formulário sem salvar: tente capacidade `0` em um ambiente ou quantidade `0` em um item de equipamento e observe a mensagem. Uma reserva `CONCLUIDA` é protegida contra exclusão pelo modelo, QuerySet e Admin para preservar seu histórico.

Finalize no terminal com:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

Essas verificações demonstram consistência e cobertura automatizada; não significam que fluxos ainda planejados tenham sido implementados.

## Limites a explicitar

- A demonstração cobre o Checkpoint 1: modelos, integridade local, grupos/permissões iniciais, dados sintéticos e administração.
- Aprovação/rejeição/cancelamento por usuários finais, autorização por objeto, verificação de disponibilidade e cálculo temporal de estoque não estão implementados.
- Angular, Bootstrap na área do usuário e API REST permanecem para o Checkpoint 2.
- A nota, aprovação do tema e apresentação acadêmica são decisões do professor; este roteiro apenas prepara a demonstração técnica.
