# Roteiro de apresentação — Checkpoint 1

Roteiro para demonstrar a versão do Campus Reservas entregue no Checkpoint 1 (05/11/2026), incluindo as regras de disponibilidade. Reserve cerca de 10 minutos. A demonstração usa o Django Admin com Jazzmin e os registros sintéticos de `popular_demo`.

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

Abra o README e explique em uma frase: o sistema organiza o cadastro de ambientes e equipamentos universitários e modela solicitações de reserva. Destaque o que está implementado no C1 (modelagem, Admin e regras de disponibilidade validadas no backend) e que a área de usuários finais e a API permanecem planejadas.

### 2. Mostrar estrutura e modelo relacional

No terminal, mostre os apps `usuarios`, `ambientes` e `reservas`. Abra [o diagrama ER](diagrama-er.md) e explique:

- usuário responsável ligado a ambientes e solicitante ligado a reservas;
- categoria relacionada a vários ambientes ou equipamentos;
- reservas relacionadas a ambientes;
- relação N:N de reservas e equipamentos representada por `ReservaEquipamento`, que guarda a quantidade;
- `BloqueioAmbiente` como registro de indisponibilidade, que impede aprovar reservas do ambiente no período.

Use [a documentação da modelagem](modelagem.md) para responder sobre chaves, constraints e políticas de exclusão.

### 3. Entrar no Django Admin com Jazzmin

Abra `http://127.0.0.1:8000/admin/` e autentique-se com o superusuário criado na preparação. Mostre a identidade Campus Reservas e a navegação por Usuários, Ambientes e Reservas. Os modelos de autenticação e autorização são os nativos do Django; o tema administrativo é fornecido por Jazzmin.

### 4. Cadastrar e consultar ambientes e equipamentos

Em **Ambientes**, abra a listagem e use **Adicionar ambiente**. Cadastre um registro temporário com código ainda não utilizado, categoria demo existente, um responsável demo, localização e capacidade válida. Salve e mostre código, capacidade, localização e responsável. Se repetir a apresentação, use outro código livre; não edite registros que não sejam da demonstração.

Em **Equipamentos**, use **Adicionar equipamento** para cadastrar um item com código ainda não utilizado, categoria demo existente, quantidade total não negativa e situação ativa. Depois pesquise projetor, notebook e microfone; aplique o filtro de situação para comparar os ativos com `DEMO-EQP-04`, inativo. O estoque é compartilhado entre reservas; o saldo por horário é verificado ao aprovar (passo 6).

Volte à listagem de ambientes e aplique o filtro de categoria para mostrar salas, laboratório e auditório dos dados demo.

### 5. Demonstrar reservas, estados e inline

Abra **Adicionar reserva**. Use o ambiente cadastrado no passo anterior, um solicitante demo e um intervalo futuro com início anterior ao fim. Mantenha o status padrão `PENDENTE`. No inline, associe um equipamento com quantidade positiva; salve e confirme a persistência na listagem. Em seguida, aplique o filtro de status para mostrar que os registros demo têm resultados diferentes entre `PENDENTE`, `APROVADA`, `REJEITADA`, `CANCELADA` e `CONCLUIDA`. Mostre pesquisa por ambiente ou solicitante.

Abra a reserva aprovada de demonstração para comparar ambiente, solicitante, período, avaliação e inline de equipamentos com quantidades. Mostre também a navegação por datas no topo da listagem e o filtro lateral **Início**, ambos pela data de uso da reserva.

### 6. Demonstrar as regras de disponibilidade

Anote o ambiente, o dia e o horário da reserva aprovada de demonstração. Para aprovar no Admin, preencha **Avaliado por** (um usuário diferente do solicitante) e **Avaliado em**; para rejeitar, preencha também **Justificativa**.

1. **Conflito entre aprovadas:** crie uma reserva no mesmo ambiente, com horário que cruze o da aprovada, e status `APROVADA`. O Admin recusa no campo status ("o ambiente já possui reserva aprovada"). Mude o início para o exato fim da outra reserva: horário consecutivo é aceito.
2. **Pendente pode disputar:** com o horário conflitante, salve como `PENDENTE` (sem avaliador): é aceito, porque pendentes não ocupam o ambiente.
3. **Bloqueio:** em **Bloqueios de ambientes**, veja o bloqueio demo e tente aprovar uma reserva nesse ambiente e período: o Admin informa que o ambiente está bloqueado e mostra o motivo.
4. **Alerta ao bloquear:** crie um bloqueio no ambiente e horário da reserva aprovada. O bloqueio é salvo e aparece um alerta amarelo listando a reserva aprovada coincidente; nada é alterado automaticamente.
5. **Estoque:** no inline de uma reserva, peça mais unidades do que o `quantidade_total` do equipamento, ou adicione `DEMO-EQP-04` (inativo): o item é recusado.
6. **Reserva concluída:** abra a reserva `CONCLUIDA` e tente mudar o status: o Admin recusa por ser registro histórico; as observações continuam editáveis.

Explique que as regras ficam no `clean()` dos modelos, valem para qualquer formulário e serão reaproveitadas pela futura área de usuários.

### 7. Mostrar bloqueios e perfis

Abra a listagem de bloqueios e mostre o ambiente, intervalo, motivo e usuário criador. Em **Autenticação e autorização → Grupos**, apresente `Administrador`, `Responsável` e `Solicitante` e explique a matriz de [permissões documentada no README](../README.md#perfis-e-dados-de-demonstração): somente Administrador recebe permissões globais de modelos de domínio; associação a Responsável não limita objetos automaticamente; Solicitante não tem CRUD global. A conta do grupo Administrador também precisa de `is_staff` para entrar no Admin, que o comando de perfis não concede.

### 8. Demonstrar integridade e testes

Se houver tempo, mostre uma validação de formulário sem salvar: tente capacidade `0` em um ambiente ou quantidade `0` em um item de equipamento e observe a mensagem. Uma reserva `CONCLUIDA` é protegida contra exclusão pelo modelo, QuerySet e Admin, e não aparece mais a ação padrão "Remover reservas selecionadas", que gerava erro com reservas concluídas.

Finalize no terminal com:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

A suíte tem 163 testes. Essas verificações demonstram consistência e cobertura automatizada; não significam que fluxos ainda planejados tenham sido implementados.

## Limites a explicitar

- A demonstração cobre o Checkpoint 1: modelos, integridade, regras de disponibilidade validadas no backend, grupos/permissões iniciais, dados sintéticos e administração.
- Aprovação/rejeição/cancelamento por usuários finais, autorização por objeto e controle de concorrência nas aprovações não estão implementados.
- A pasta `frontend/` contém apenas o workspace inicial do Angular; telas, Bootstrap na área do usuário e API permanecem para o Checkpoint 2.
- A nota, aprovação do tema e apresentação acadêmica são decisões do professor; este roteiro apenas prepara a demonstração técnica.
