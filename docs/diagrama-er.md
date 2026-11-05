# Diagrama entidade-relacionamento

O diagrama representa as oito entidades de domínio implementadas no Checkpoint 1. Grupos/permissões e tabelas internas do Django foram omitidos para manter o foco no domínio. FKs opcionais e obrigatórias seguem os modelos e migrations atuais.

```mermaid
erDiagram
    USUARIO {
        BigInt id PK
        string username UK
        string password
        boolean is_active
        boolean is_staff
        boolean is_superuser
    }

    CATEGORIA_AMBIENTE {
        BigInt id PK
        string nome UK
        text descricao
    }

    AMBIENTE {
        BigInt id PK
        string codigo UK
        string nome
        text descricao
        string localizacao
        int capacidade
        boolean ativo
        BigInt categoria_id FK
        BigInt responsavel_id FK
    }

    CATEGORIA_EQUIPAMENTO {
        BigInt id PK
        string nome UK
        text descricao
    }

    EQUIPAMENTO {
        BigInt id PK
        string codigo UK
        string nome
        text descricao
        int quantidade_total
        boolean ativo
        BigInt categoria_id FK
    }

    RESERVA {
        BigInt id PK
        BigInt solicitante_id FK
        BigInt ambiente_id FK
        datetime inicio
        datetime fim
        string status
        text observacoes
        datetime criado_em
        datetime atualizado_em
        BigInt avaliado_por_id FK "opcional"
        datetime avaliado_em "opcional"
        text justificativa
    }

    RESERVA_EQUIPAMENTO {
        BigInt id PK
        BigInt reserva_id FK
        BigInt equipamento_id FK
        int quantidade
    }

    BLOQUEIO_AMBIENTE {
        BigInt id PK
        BigInt ambiente_id FK
        datetime inicio
        datetime fim
        text motivo
        BigInt criado_por_id FK
    }

    CATEGORIA_AMBIENTE ||--o{ AMBIENTE : classifica
    USUARIO ||--o{ AMBIENTE : responsavel
    CATEGORIA_EQUIPAMENTO ||--o{ EQUIPAMENTO : classifica
    USUARIO ||--o{ RESERVA : solicitante
    USUARIO o|--o{ RESERVA : avaliador_opcional
    AMBIENTE ||--o{ RESERVA : reservado_em
    RESERVA ||--o{ RESERVA_EQUIPAMENTO : possui_itens
    EQUIPAMENTO ||--o{ RESERVA_EQUIPAMENTO : solicitado_com_quantidade
    AMBIENTE ||--o{ BLOQUEIO_AMBIENTE : possui_bloqueios
    USUARIO ||--o{ BLOQUEIO_AMBIENTE : criou
```

`Reserva` e `Equipamento` formam uma relação N:N por `ReservaEquipamento`; cada linha intermediária guarda a quantidade solicitada. A relação com `avaliado_por` é opcional do lado de `Reserva`. As demais FKs exibidas são obrigatórias.

As regras de unicidade e intervalo não são cardinalidades: `ReservaEquipamento` também possui unicidade para `(reserva_id, equipamento_id)` e quantidade mínima 1. Os detalhes de constraints e políticas `on_delete` estão em [modelagem.md](modelagem.md).
