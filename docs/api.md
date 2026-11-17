# API do Campus Reservas

Contrato entre o backend Django e o frontend Angular. Todas as rotas ficam sob
`/api/` e trocam JSON. As views são do Django (`JsonResponse`), sem DRF.

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
- **Status de reserva:** `status` traz o código (`PENDENTE`, `APROVADA`,
  `REJEITADA`, `CANCELADA`, `CONCLUIDA`) e `statusLabel` traz o texto para
  exibição (`Pendente`, `Aprovada`...).

### Respostas de erro

| Código | Quando | Corpo |
| --- | --- | --- |
| 400 | Dados inválidos ou regra de negócio violada | `{"errors": {"campo": ["mensagem"], "__all__": ["mensagem geral"]}}` |
| 401 | Usuário não autenticado | `{"detail": "Autenticação necessária."}` |
| 403 | Autenticado, mas sem permissão (ou CSRF ausente) | `{"detail": "..."}` |
| 404 | Registro não existe ou não pertence ao usuário | `{"detail": "Não encontrado."}` |
| 405 | Método HTTP não permitido | `{"detail": "..."}` |

As mensagens das regras de negócio (conflito de horário, bloqueio, estoque
etc.) são as mesmas dos `clean()` dos modelos, exibidas também no Admin.

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
  "capacity": 40,
  "responsible": "João Lima"
}
```

`description` só aparece no detalhe.

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
| POST | `/api/auth/login/` | Público | Corpo: `{"username", "password"}`. 200 com o usuário; 400 se as credenciais forem inválidas ou a conta estiver inativa. |
| POST | `/api/auth/logout/` | Autenticado | Encerra a sessão. 204 sem corpo. |
| POST | `/api/auth/cadastro/` | Público | Corpo: `{"username", "email", "firstName", "lastName", "password", "passwordConfirmation"}`. Cria o usuário no grupo `Solicitante`, já autenticado. 201 com o usuário; 400 com os erros por campo (inclui as regras de senha do Django). |
| GET | `/api/auth/me/` | Autenticado | 200 com o usuário logado; 401 se não houver sessão. |

### Ambientes e equipamentos (consulta)

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/ambientes/` | Autenticado | Lista ambientes **ativos**. Filtros opcionais: `?category=`, `?minimumCapacity=`, `?q=` (código, nome ou localização). |
| GET | `/api/ambientes/<code>/` | Autenticado | Detalhe do ambiente. 404 se não existir ou estiver inativo. |
| GET | `/api/ambientes/<code>/disponibilidade/?date=AAAA-MM-DD` | Autenticado | Intervalos ocupados no dia. |
| GET | `/api/categorias/` | Autenticado | `[{"name": "Laboratório"}, ...]` |
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

Só reservas `APROVADA` e bloqueios impedem uma aprovação; `PENDENTE` é
informativo.

### Reservas do usuário logado

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/reservas/` | Autenticado | Reservas do próprio usuário. `?scope=upcoming` (padrão: ainda não terminadas) ou `?scope=history`. |
| POST | `/api/reservas/` | Autenticado | Cria uma reserva `PENDENTE`. 201 com a reserva; 400 com erros. |
| GET | `/api/reservas/<id>/` | Dono da reserva | Detalhe. 404 se for de outro usuário. |
| POST | `/api/reservas/<id>/cancelar/` | Dono da reserva | Cancela. Permitido só para `PENDENTE` ou `APROVADA` que ainda não começou. |

Corpo do `POST /api/reservas/`:

```json
{
  "environmentCode": "PV1-101",
  "date": "2026-11-20",
  "startTime": "14:00",
  "endTime": "16:00",
  "observations": "Aula de revisão.",
  "equipments": [{"code": "PROJ-01", "quantity": 1}]
}
```

O solicitante é sempre o usuário logado e o status inicial é sempre
`PENDENTE`; esses valores nunca são lidos do corpo.

### Gestão (responsável e administrador)

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/gestao/reservas/` | Responsável ou administrador | Reservas dos ambientes sob responsabilidade do usuário (administrador vê todas). Filtros: `?status=PENDENTE`, `?environment=<code>`, `?date=AAAA-MM-DD`. |
| POST | `/api/gestao/reservas/<id>/aprovar/` | Responsável pelo ambiente ou administrador | Aprova. 400 se houver conflito com reserva aprovada ou bloqueio. |
| POST | `/api/gestao/reservas/<id>/rejeitar/` | Responsável pelo ambiente ou administrador | Corpo: `{"justification": "..."}` (obrigatória). |
| GET | `/api/gestao/ocupacao/?start=AAAA-MM-DD&end=AAAA-MM-DD` | Responsável ou administrador | Reservas `PENDENTE`/`APROVADA` e bloqueios do período, para o calendário de ocupação. |

Aprovar e rejeitar preenchem `avaliado_por` (usuário logado) e `avaliado_em`
(momento atual). Ninguém avalia a própria reserva. A aprovação usa
`transaction.atomic()` e `select_for_update()` para que duas aprovações
simultâneas não passem pela validação ao mesmo tempo.

Reservas de ambientes de outro responsável retornam 404.

## Pontos em aberto

Campos que as telas atuais usam e que não existem no banco:

| Campo no frontend | Onde aparece | Proposta |
| --- | --- | --- |
| `purpose`, `participants` | Solicitação e gestão de reservas | Adicionar `finalidade` e `participantes` em `Reserva` (migration), validando `participantes <= capacidade`. |
| `buildingCode`, `buildingName`, `campus` | Mapa, salas, detalhe | Adicionar o prédio ao `Ambiente` ou derivar do início do `codigo`. Definir com o responsável pelo frontend. |
| `features` | Salas e detalhe | Usar os equipamentos ou deixar fora da API. |
| `acceptedRules` | Solicitação | Validação apenas no frontend; não é enviado. |
