# API do Campus Reservas

Contrato entre o backend Django e o frontend Angular. Todas as rotas ficam sob
`/api/` e trocam JSON. A API usa o Django REST Framework (DRF):
serializers convertem os modelos em JSON e validam os dados recebidos, e as
views herdam de `APIView` ou das views genéricas do DRF.

Com `DEBUG` ligado, abrir uma rota da API no navegador mostra a página
navegável do DRF, útil para testar os endpoints sem o frontend.

## Convenções

- **Nomes de campos:** inglês em camelCase, os mesmos usados nos arquivos
  `*.models.ts` do frontend (`code`, `name`, `startTime`...).
- **Datas e horários:** horário de Brasília (`America/Sao_Paulo`).
  Data `AAAA-MM-DD`, hora `HH:MM`, data e hora completas em ISO 8601
  (`2026-11-20T14:00:00-03:00`).
- **Autenticação:** sessão do Django (cookie `sessionid`). Em
  desenvolvimento, o Angular acessa a API pelo proxy do `ng serve`, então
  front e back ficam na mesma origem e não é preciso CORS.
- **CSRF:** toda requisição `POST` deve enviar o cabeçalho `X-CSRFToken`
  com o valor do cookie `csrftoken`. O cookie é criado por `GET /api/csrf/`.
  Login e cadastro também exigem o token. O Django troca o token a cada
  login, então o frontend deve sempre ler o valor atual do cookie, e não
  guardar uma cópia.
- **Status de reserva:** `status` traz o código (`PENDENTE`, `APROVADA`,
  `REJEITADA`, `CANCELADA`, `CONCLUIDA`) e `statusLabel` traz o texto para
  exibição (`Pendente`, `Aprovada`...).

### Respostas de erro

| Código | Quando | Corpo |
| --- | --- | --- |
| 400 | Dados inválidos ou regra de negócio violada | `{"campo": ["mensagem"], "non_field_errors": ["mensagem geral"]}` |
| 401 | Usuário não autenticado | `{"detail": "As credenciais de autenticação não foram fornecidas."}` |
| 403 | Autenticado, mas sem permissão (ou CSRF ausente) | `{"detail": "..."}` |
| 404 | Registro não existe ou não pertence ao usuário | `{"detail": "..."}` |
| 405 | Método HTTP não permitido | `{"detail": "..."}` |

O formato de erro é o padrão do DRF: cada campo inválido é uma chave com a
lista de mensagens, e erros que não pertencem a um campo ficam em
`non_field_errors`. As mensagens das regras de negócio (conflito de
horário, bloqueio, estoque etc.) são as mesmas dos `clean()` dos modelos,
exibidas também no Admin.

Por padrão, a autenticação por sessão do DRF responde 403 também para quem
não está logado. O projeto usa uma classe própria
(`usuarios.authentication.SessionAuthentication`) para responder **401**
nesse caso, e assim o frontend sabe quando redirecionar para o login.

## Objetos

### Usuário

```json
{
  "id": 7,
  "username": "maria",
  "firstName": "Maria",
  "lastName": "Souza",
  "email": "maria@ufla.br",
  "profile": "solicitante"
}
```

`profile` é calculado no servidor, nesta ordem:

1. `administrador`: superusuário ou membro do grupo `Administrador`;
2. `responsavel`: membro do grupo `Responsável` ou responsável por algum ambiente;
3. `solicitante`: todos os demais.

### Ambiente

```json
{
  "code": "PV1-101",
  "name": "Sala 101",
  "description": "Sala com projetor.",
  "category": "Sala de aula",
  "location": "Pavilhão 1, térreo",
  "buildingCode": "PV1",
  "capacity": 40,
  "responsible": "João Lima",
  "features": []
}
```

- `description` só aparece no detalhe.
- `buildingCode` é o código do prédio (campo `predio` do `Ambiente`), igual
  aos códigos dos dados do mapa no frontend; pode vir vazio (`""`). O nome do
  prédio é obtido pelo frontend a partir desses dados.
- `features` é sempre uma lista vazia: os equipamentos são um estoque
  compartilhado e não pertencem a uma sala.

### Reserva

```json
{
  "id": 12,
  "environmentCode": "PV1-101",
  "environmentName": "Sala 101",
  "date": "2026-11-20",
  "startTime": "14:00",
  "endTime": "16:00",
  "status": "PENDENTE",
  "statusLabel": "Pendente",
  "purpose": "Aula de revisão de Cálculo",
  "participants": 35,
  "observations": "Aula de revisão.",
  "equipments": [{"code": "PROJ-01", "name": "Projetor", "quantity": 1}],
  "requester": {"username": "maria", "name": "Maria Souza"},
  "createdAt": "2026-11-17T19:30:00-03:00",
  "evaluatedBy": null,
  "evaluatedAt": null,
  "justification": "",
  "canCancel": true
}
```

`canCancel` indica se o usuário logado pode cancelar a reserva agora.

## Endpoints

### Autenticação

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/csrf/` | Público | Cria o cookie `csrftoken`. Resposta: `{"csrfToken": "..."}` |
| POST | `/api/auth/login/` | Público | Corpo: `{"username", "password"}`. 200 com o usuário; 400 com `{"non_field_errors": ["Usuário ou senha inválidos."]}` para senha errada, usuário inexistente ou conta inativa (a mesma mensagem nos três casos). |
| POST | `/api/auth/logout/` | Autenticado | Encerra a sessão. 204 sem corpo. |
| POST | `/api/auth/cadastro/` | Público | Corpo: `{"username", "email", "firstName", "lastName", "password", "passwordConfirmation"}`. Todos obrigatórios. Cria o usuário no grupo `Solicitante`, já autenticado. 201 com o usuário; 400 com os erros por campo. |
| GET | `/api/auth/me/` | Autenticado | 200 com o usuário logado; 401 se não houver sessão. |

Regras do cadastro:

- `username` e `email` não podem repetir, sem diferenciar maiúsculas de
  minúsculas; `username` aceita letras, números e `@ . + - _`.
- A senha passa pelas regras do Django (`AUTH_PASSWORD_VALIDATORS`): pelo
  menos 8 caracteres, não pode ser só números, comum demais ou parecida com
  o nome ou o e-mail.
- Campos como `is_staff` ou `profile` enviados no corpo são ignorados: todo
  cadastro novo é um solicitante comum.

### Ambientes e equipamentos (consulta)

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/ambientes/` | Autenticado | Lista ambientes **ativos**. Filtros opcionais: `?category=`, `?minimumCapacity=`, `?building=`, `?q=` (código, nome ou localização). |
| GET | `/api/ambientes/<code>/` | Autenticado | Detalhe do ambiente. 404 se não existir ou estiver inativo. |
| GET | `/api/ambientes/<code>/disponibilidade/?date=AAAA-MM-DD` | Autenticado | Intervalos ocupados no dia. |
| GET | `/api/categorias/` | Autenticado | `[{"name": "Laboratório de informática"}, ...]` |
| GET | `/api/equipamentos/` | Autenticado | Equipamentos ativos: `[{"code", "name", "category", "totalQuantity"}]` |

Resposta da disponibilidade:

```json
{
  "environmentCode": "PV1-101",
  "date": "2026-11-20",
  "occupied": [
    {"startTime": "08:00", "endTime": "10:00", "type": "APROVADA"},
    {"startTime": "10:00", "endTime": "12:00", "type": "PENDENTE"},
    {"startTime": "14:00", "endTime": "18:00", "type": "BLOQUEIO", "reason": "Manutenção"}
  ]
}
```

- `type` é `APROVADA`, `PENDENTE` ou `BLOQUEIO`; reservas rejeitadas,
  canceladas e concluídas não aparecem. Só `APROVADA` e `BLOQUEIO` impedem
  uma aprovação; `PENDENTE` é informativo.
- Os intervalos vêm em ordem de início. Um intervalo que começa no dia
  anterior ou termina no seguinte é cortado nos limites do dia: `00:00` e
  `24:00`.
- `date` é obrigatório; ausente ou inválido responde 400 com
  `{"date": ["..."]}`.

Filtros da listagem: `category` e `building` comparam o texto inteiro sem
diferenciar maiúsculas; `q` busca parte do texto; `minimumCapacity` precisa
ser um inteiro maior ou igual a 1 (senão, 400). Categorias e equipamentos vêm
em ordem alfabética de nome e de código, respectivamente.

### Reservas do usuário logado

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/reservas/` | Autenticado | Reservas do próprio usuário. `?scope=upcoming` (padrão: ainda não terminadas, da mais próxima para a mais distante) ou `?scope=history` (já terminadas, da mais recente para a mais antiga). Outro valor responde 400. |
| POST | `/api/reservas/` | Autenticado | Cria uma reserva `PENDENTE`. 201 com a reserva; 400 com erros. |
| GET | `/api/reservas/<id>/` | Dono da reserva | Detalhe. 404 se for de outro usuário. |
| POST | `/api/reservas/<id>/cancelar/` | Dono da reserva | Cancela. Permitido só para `PENDENTE` ou `APROVADA` que ainda não começou; nos outros casos, 400 com `non_field_errors`. 200 com a reserva atualizada; 404 se for de outro usuário. |

Corpo do `POST /api/reservas/`:

```json
{
  "environmentCode": "PV1-101",
  "date": "2026-11-20",
  "startTime": "14:00",
  "endTime": "16:00",
  "purpose": "Aula de revisão de Cálculo",
  "participants": 35,
  "observations": "Aula de revisão.",
  "equipments": [{"code": "PROJ-01", "quantity": 1}]
}
```

Regras da criação (erros com 400, na chave indicada):

| Regra | Chave do erro |
| --- | --- |
| Ambiente existe e está ativo | `environmentCode` |
| `endTime` posterior a `startTime` | `endTime` |
| Só horários futuros | `startTime` |
| Sem reserva `APROVADA` nem bloqueio sobreposto no ambiente (reservas `PENDENTE` de outras pessoas não impedem o pedido; horários consecutivos são permitidos) | `startTime` |
| O próprio solicitante não tem outra reserva `PENDENTE` ou `APROVADA` sobreposta no mesmo ambiente (pedido repetido) | `startTime` |
| `purpose` obrigatório, até 200 caracteres | `purpose` |
| `participants` de 1 até a capacidade do ambiente | `participants` |
| Equipamentos existentes, ativos, sem repetição, com `quantity >= 1` e no máximo o estoque total | `equipments` (mensagem começa com o código do equipamento) |

`observations` e `equipments` são opcionais. Se um equipamento for
recusado, nada é gravado: nem a reserva, nem os outros itens.

O solicitante é sempre o usuário logado e o status inicial é sempre
`PENDENTE`; esses valores nunca são lidos do corpo.

### Gestão (responsável e administrador)

Rotas liberadas para quem tem perfil `responsavel` ou `administrador`
(demais usuários recebem 403). O responsável só enxerga e avalia reservas dos
ambientes pelos quais responde; reservas de outros ambientes retornam 404. O
administrador enxerga e avalia todas.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/gestao/reservas/` | Reservas dos ambientes geridos, em ordem de início. Filtros opcionais: `?status=PENDENTE` (qualquer status), `?environment=<code>`, `?date=AAAA-MM-DD`. Valor inválido responde 400. |
| POST | `/api/gestao/reservas/<id>/aprovar/` | Aprova uma reserva `PENDENTE` que ainda não começou. 200 com a reserva atualizada. |
| POST | `/api/gestao/reservas/<id>/rejeitar/` | Corpo: `{"justification": "..."}` (obrigatória). Rejeita uma reserva `PENDENTE`. 200 com a reserva atualizada. |
| GET | `/api/gestao/ocupacao/?start=AAAA-MM-DD&end=AAAA-MM-DD` | Reservas `PENDENTE`/`APROVADA` e bloqueios dos ambientes geridos no período (até 62 dias), para o calendário de ocupação. |

As reservas da gestão têm o mesmo formato do objeto Reserva, mais o campo
`hasConflict`: `true` quando a reserva está pendente e se sobrepõe a uma
reserva aprovada ou a um bloqueio do ambiente, ou seja, a aprovação vai ser
recusada.

Aprovar e rejeitar preenchem `avaliado_por` (usuário logado) e `avaliado_em`
(momento atual) e passam pelas regras dos `clean()` do modelo. Erros com 400:

| Situação | Chave do erro |
| --- | --- |
| Reserva não está pendente, ou (na aprovação) já começou | `non_field_errors` |
| Conflito com reserva aprovada ou bloqueio | `non_field_errors` |
| O avaliador é o próprio solicitante | `non_field_errors` |
| Estoque insuficiente de algum equipamento no horário | `equipments` (mensagem começa com o código do equipamento) |
| Rejeição sem justificativa | `justification` |

As avaliações rodam em `transaction.atomic()`. Com o SQLite em modo
`IMMEDIATE` (ver `DATABASES` em `config/settings.py`), duas aprovações
simultâneas rodam uma de cada vez, e a segunda já enxerga a primeira ao
validar conflitos e estoque.

Resposta da ocupação:

```json
{
  "start": "2026-11-20",
  "end": "2026-11-21",
  "items": [
    {"id": "reserva-12", "date": "2026-11-20", "startTime": "08:00", "endTime": "10:00",
     "type": "APROVADA", "environmentCode": "PV1-101", "environmentName": "Sala 101",
     "buildingCode": "PV1"},
    {"id": "bloqueio-3", "date": "2026-11-20", "startTime": "20:00", "endTime": "24:00",
     "type": "BLOQUEIO", "reason": "Evento", "environmentCode": "PV1-101",
     "environmentName": "Sala 101", "buildingCode": "PV1"}
  ]
}
```

Itens que atravessam a meia-noite aparecem uma vez em cada dia, cortados em
`00:00` e `24:00`. Os itens vêm ordenados por data, horário de início e
ambiente. `start` e `end` são obrigatórios; `end` não pode ser anterior a
`start`.

## Mudanças no banco previstas

Campos que as telas do frontend usam e que serão criados no backend:

| Campo na API | Campo no modelo | Regra |
| --- | --- | --- |
| `purpose` | `Reserva.finalidade` (texto curto) | Obrigatório na API; opcional no modelo e no Admin. |
| `participants` | `Reserva.participantes` (inteiro positivo) | Obrigatório na API; opcional no modelo. Quando informado: pelo menos 1 e no máximo a capacidade do ambiente. |
| `buildingCode` | `Ambiente.predio` (texto curto, opcional) | Código do prédio usado no mapa (ex.: `PV1`). |

Os dois campos de reserva são opcionais no modelo porque as reservas já
cadastradas não têm esses dados; a API exige ambos nas reservas novas.

Decisões para os demais campos do frontend:

- `buildingName` e `campus`: vêm dos dados do mapa do frontend, a partir de
  `buildingCode`.
- `features`: fora do banco; a API devolve `[]`.
- `acceptedRules`: validado apenas no frontend; não é enviado.
