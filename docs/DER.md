# ContractFlow — DER (Diagrama Entidade-Relacionamento)

> Gerado a partir de `api/database/schema.sql` (MySQL 8+). Todas as FKs usam
> `ON DELETE RESTRICT` (RN11: nada financeiro importante é removido em cascata).
> Isolamento por usuário (RNF04): `clientes.usuario_id` e `contratos.usuario_id`
> (desnormalizado de propósito para filtrar tudo pelo dono sem JOIN extra);
> parcelas, pagamentos e documentos são alcançados pela cadeia
> contrato → cliente → usuário.
>
> O DER canônico do time também está no Miro (ver card de Back-End no Trello);
> este arquivo é o espelho versionado no repositório.

```mermaid
erDiagram
    usuarios ||--o{ clientes : possui
    usuarios ||--o{ contratos : possui
    usuarios ||--o{ documentos : possui
    usuarios ||--o{ extracao_ocr : possui
    usuarios ||--o{ historico_contratos : registra
    usuarios ||--o{ despesas : possui
    clientes ||--o{ contratos : contrata
    contratos ||--o{ parcelas : divide-se-em
    contratos ||--o{ documentos : anexa
    contratos ||--o{ historico_contratos : gera
    parcelas ||--o{ pagamentos : recebe

    usuarios {
        int id PK
        varchar nome
        varchar email UK
        varchar senha_hash
        enum perfil "ADMIN,USUARIO"
        tinyint ativo
    }
    clientes {
        int id PK
        int usuario_id FK
        varchar nome_razao_social
        varchar cpf_cnpj "UK por usuario"
        varchar email
        varchar telefone
        varchar cep
        varchar logradouro
        varchar numero
        varchar complemento
        varchar bairro
        varchar cidade
        varchar estado
        text observacoes
    }
    contratos {
        int id PK
        int usuario_id FK
        int cliente_id FK
        varchar numero "UK por usuario"
        varchar tipo
        text descricao
        decimal valor_total "CHECK >= 0"
        date data_inicio
        date data_fim
        varchar forma_pagamento
        int quantidade_parcelas
        enum status "ATIVO,PENDENTE,ENCERRADO,CANCELADO,EM_RENOVACAO"
        decimal juros_percentual
        decimal multa_percentual
        text observacoes
    }
    parcelas {
        int id PK
        int contrato_id FK
        int numero "UK por contrato"
        decimal valor "CHECK >= 0"
        date data_vencimento "NOT NULL (RN04)"
        enum status "PENDENTE,PAGA,VENCIDA,CANCELADA"
    }
    pagamentos {
        int id PK
        int parcela_id FK
        decimal valor "CHECK >= 0"
        date data_pagamento
        varchar forma_pagamento
        text observacoes
    }
    documentos {
        int id PK
        int contrato_id FK
        int usuario_id FK
        varchar nome_original
        varchar nome_arquivo "UUID (RNF16)"
        varchar caminho
        enum tipo "ORIGINAL,ANEXO (RN10)"
        varchar mime
        bigint tamanho
        varchar hash "SHA-256 (RNF16)"
        varchar descricao
    }
    extracao_ocr {
        int id PK
        int usuario_id FK
        varchar nome_original
        varchar nome_arquivo
        varchar caminho
        varchar tipo_arquivo
        bigint tamanho
        longtext texto_extraido
        json dados_json
        decimal confianca "RNF17"
        enum status "PENDENTE,CONFIRMADA,CANCELADA (RNF18)"
    }
    historico_contratos {
        int id PK
        int contrato_id FK
        int usuario_id FK
        varchar acao
        text descricao
    }
    despesas {
        int id PK
        int usuario_id FK
        varchar descricao
        varchar categoria
        decimal valor "CHECK >= 0"
        date data
        enum status "PENDENTE,PAGA,CANCELADA"
        text observacoes
    }
```

## Cardinalidades (leitura)

| Relacionamento | Cardinalidade | Regra |
|---|---|---|
| usuarios → clientes | 1:N | Um usuário possui N clientes; cliente pertence a 1 usuário (RNF04) |
| usuarios → contratos | 1:N | Desnormalizado para filtro direto por dono (RNF04) |
| clientes → contratos | 1:N | Um cliente tem vários contratos (RN01); contrato exige 1 cliente (RN02) |
| contratos → parcelas | 1:N | Geradas automaticamente na criação (RF14/RF15) |
| parcelas → pagamentos | 1:N | Pagamento pertence a 1 parcela válida (RN06) |
| contratos → documentos | 1:N | ORIGINAL + ANEXOs (RN10, RF09/RF41) |
| contratos → historico_contratos | 1:N | Eventos de criação/alteração/pagamento/status (RF36) |
| usuarios → extracao_ocr | 1:N | Extrações pendentes de confirmação (RN09/RNF18) |
| usuarios → despesas | 1:N | Tabela pronta; controller da Sprint futura (RF25) |

## Índices (desempenho — RNF09)

FKs e campos de filtro possuem índices `idx_*`: `usuario_id` (todas as tabelas),
`cliente_id`, `status`, `data_vencimento`, `data_pagamento`, `contrato_id`,
`parcela_id`, `data`. Unicidades: `usuarios.email`, `(usuario_id, cpf_cnpj)`,
`(usuario_id, numero)` em contratos, `(contrato_id, numero)` em parcelas.
